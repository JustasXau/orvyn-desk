import { NextResponse } from 'next/server'

// FRED Series IDs for central bank interest rates (simplified - only FRED available series)
const CENTRAL_BANK_RATES: Record<string, { seriesId: string; name: string; country: string; flag: string; currency: string }> = {
  US: { seriesId: 'FEDFUNDS', name: 'Taux des fonds federaux', country: 'États-Unis', flag: '🇺🇸', currency: 'USD' },
  USTNX: { seriesId: 'TNX', name: 'Rendement 10Y', country: 'États-Unis', flag: '🇺🇸', currency: 'USD' },
  USTX5Y: { seriesId: 'T5YIFR', name: 'Inflation expectee 5Y', country: 'États-Unis', flag: '🇺🇸', currency: 'USD' },
  EU10Y: { seriesId: 'MMNRNBEU', name: 'Taux BCE (overnight)', country: 'Zone Euro', flag: '🇪🇺', currency: 'EUR' },
  UK10Y: { seriesId: 'MMNRNBGB', name: 'Taux BoE (overnight)', country: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP' },
  JP10Y: { seriesId: 'IRLTLT01JPM156N', name: 'Rendement 10Y Japon', country: 'Japon', flag: '🇯🇵', currency: 'JPY' },
  CA10Y: { seriesId: 'IRLTLT01CAM156N', name: 'Rendement 10Y Canada', country: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  AU10Y: { seriesId: 'IRLTLT01AUM156N', name: 'Rendement 10Y Australie', country: 'Australie', flag: '🇦🇺', currency: 'AUD' },
}

async function getFredRateData(seriesId: string) {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&limit=2&sort_order=desc&file_type=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) {
      console.error(`[v0] FRED API error for ${seriesId}:`, res.status)
      return null
    }

    const data = await res.json()
    const observations = data.observations || []
    
    if (observations.length === 0) return null

    const latest = observations[0]
    const previous = observations[1]
    
    const latestValue = parseFloat(latest.value)
    const previousValue = previous ? parseFloat(previous.value) : latestValue

    if (isNaN(latestValue)) return null

    return {
      value: latestValue,
      date: latest.date,
      change: latestValue - previousValue,
      previousValue,
    }
  } catch (error) {
    console.error(`[v0] Error fetching FRED rate for ${seriesId}:`, error)
    return null
  }
}

async function getFredChartData(seriesId: string) {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&limit=60&sort_order=asc&file_type=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) return []

    const data = await res.json()
    const observations = data.observations || []
    
    return observations
      .filter((obs: any) => obs.value !== '.' && !isNaN(parseFloat(obs.value)))
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }))
  } catch (error) {
    console.error(`[v0] Error fetching chart data for ${seriesId}:`, error)
    return []
  }
}

export async function GET() {
  if (!process.env.FRED_API_KEY) {
    // Return placeholder data when FRED_API_KEY not configured
    return NextResponse.json({ 
      rates: [],
      message: 'FRED_API_KEY non configure - donnees non disponibles',
      timestamp: new Date().toISOString()
    })
  }

  try {
    const entries = Object.entries(CENTRAL_BANK_RATES)
    
    // Fetch all rates and charts in parallel
    const results = await Promise.all(
      entries.map(async ([code, info]) => {
        const [rateData, chartData] = await Promise.all([
          getFredRateData(info.seriesId),
          getFredChartData(info.seriesId),
        ])
        
        return {
          code,
          ...info,
          rate: rateData,
          chart: chartData,
        }
      })
    )

    // Filter out failed requests and sort by rate value
    const rates = results
      .filter(r => r.rate !== null)
      .sort((a, b) => (b.rate?.value || 0) - (a.rate?.value || 0))

    return NextResponse.json({
      rates,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Error in interest-rates API:', error)
    return NextResponse.json({ error: 'Failed to fetch interest rates' }, { status: 500 })
  }
}
