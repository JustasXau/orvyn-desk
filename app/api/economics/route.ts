import { NextResponse } from 'next/server'

// FRED Series IDs - US Economic Indicators (all free)
const FRED_SERIES = {
  growth: {
    gdp: 'A191RL1Q225SBEA', // Real GDP Growth Rate
    industrial_production: 'INDPRO', // Industrial Production Index
    retail_sales: 'RSAFS', // Retail Sales
    durable_goods: 'DGORDER', // Durable Goods Orders
    factory_orders: 'AMTMNO', // Factory Orders
  },
  sentiment: {
    consumer_confidence: 'UMCSENT', // U of Michigan Consumer Sentiment
    consumer_confidence_cb: 'CSCICP03USM665S', // Conference Board Consumer Confidence
  },
  employment: {
    unemployment: 'UNRATE', // Unemployment Rate
    nonfarm_payroll: 'PAYEMS', // Nonfarm Payroll (thousands)
    avg_hourly_earnings: 'CES0500000003', // Average Hourly Earnings
    initial_claims: 'ICSA', // Initial Jobless Claims
    jolts_openings: 'JTSJOL', // Job Openings (JOLTS)
  },
  inflation: {
    cpi: 'CPIAUCSL', // CPI All Urban (index)
    cpi_yoy: 'CPALTT01USM657N', // CPI YoY change
    pce: 'PCEPI', // PCE Price Index
    ppi: 'PPIACO', // Producer Price Index
  },
  rates: {
    fed_funds: 'FEDFUNDS', // Federal Funds Rate
    treasury_10y: 'DGS10', // 10-Year Treasury Yield
  },
  pmi: {
    ism_manufacturing: 'MANEMP', // ISM Manufacturing Employment (proxy)
    ism_services: 'NMFCI', // Chicago Fed National Financial Conditions
  },
}

type SeriesCategory = keyof typeof FRED_SERIES

// Fetch from FRED API
async function getFredData(seriesId: string) {
  try {
    const apiKey = process.env.FRED_API_KEY
    if (!apiKey) {
      console.error(`[v0] FRED_API_KEY is not set`)
      return null
    }
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc`
    const res = await fetch(url, { cache: 'no-store' })
    
    if (!res.ok) {
      const text = await res.text()
      console.error(`[v0] FRED API error for ${seriesId}:`, res.status, text)
      return null
    }

    const data = await res.json()
    const observations = data.observations || []
    
    if (observations.length === 0) {
      console.error(`[v0] No observations for ${seriesId}`)
      return null
    }

    // observations are sorted desc, so [0] is latest, [1] is previous
    const latest = observations[0]
    const previous = observations[1]

    // Handle '.' which means no data
    if (latest.value === '.') {
      console.error(`[v0] No value for ${seriesId}`)
      return null
    }

    const latestValue = parseFloat(latest.value)
    const previousValue = previous && previous.value !== '.' ? parseFloat(previous.value) : latestValue

    return {
      value: latestValue,
      date: latest.date,
      change: latestValue - previousValue,
    }
  } catch (error) {
    console.error(`[v0] Error fetching FRED data for ${seriesId}:`, error)
    return null
  }
}

// Fetch chart data (last 52 observations)
async function getFredChartData(seriesId: string) {
  try {
    const apiKey = process.env.FRED_API_KEY
    if (!apiKey) return []
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=52&sort_order=asc`
    const res = await fetch(url, { cache: 'no-store' })
    
    if (!res.ok) return []

    const data = await res.json()
    const observations = data.observations || []
    
    return observations
      .filter((obs: any) => obs.value !== '.')
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
  try {
    // Check if FRED API key is available
    if (!process.env.FRED_API_KEY) {
      console.error('[v0] FRED_API_KEY is not configured')
      return NextResponse.json({ error: 'FRED API key not configured' }, { status: 500 })
    }
    
    console.log('[v0] Fetching FRED data with API key:', process.env.FRED_API_KEY?.substring(0, 8) + '...')
    
    // Fetch all data in parallel
    const growth = await Promise.all([
      getFredData(FRED_SERIES.growth.gdp),
      getFredData(FRED_SERIES.growth.industrial_production),
      getFredData(FRED_SERIES.growth.retail_sales),
      getFredData(FRED_SERIES.growth.durable_goods),
      getFredData(FRED_SERIES.growth.factory_orders),
    ])

    const sentiment = await Promise.all([
      getFredData(FRED_SERIES.sentiment.consumer_confidence),
      getFredData(FRED_SERIES.sentiment.consumer_confidence_cb),
    ])

    const employment = await Promise.all([
      getFredData(FRED_SERIES.employment.unemployment),
      getFredData(FRED_SERIES.employment.nonfarm_payroll),
      getFredData(FRED_SERIES.employment.avg_hourly_earnings),
      getFredData(FRED_SERIES.employment.initial_claims),
      getFredData(FRED_SERIES.employment.jolts_openings),
    ])

    const inflation = await Promise.all([
      getFredData(FRED_SERIES.inflation.cpi),
      getFredData(FRED_SERIES.inflation.cpi_yoy),
      getFredData(FRED_SERIES.inflation.pce),
      getFredData(FRED_SERIES.inflation.ppi),
    ])

    const rates = await Promise.all([
      getFredData(FRED_SERIES.rates.fed_funds),
      getFredData(FRED_SERIES.rates.treasury_10y),
    ])

    // Fetch chart data for key series
    const chartData = await Promise.all([
      getFredChartData(FRED_SERIES.growth.gdp),
      getFredChartData(FRED_SERIES.growth.industrial_production),
      getFredChartData(FRED_SERIES.growth.retail_sales),
      getFredChartData(FRED_SERIES.growth.durable_goods),
      getFredChartData(FRED_SERIES.growth.factory_orders),
      getFredChartData(FRED_SERIES.sentiment.consumer_confidence),
      getFredChartData(FRED_SERIES.sentiment.consumer_confidence_cb),
      getFredChartData(FRED_SERIES.inflation.cpi_yoy),
      getFredChartData(FRED_SERIES.inflation.pce),
      getFredChartData(FRED_SERIES.inflation.ppi),
      getFredChartData(FRED_SERIES.employment.unemployment),
      getFredChartData(FRED_SERIES.employment.nonfarm_payroll),
      getFredChartData(FRED_SERIES.employment.avg_hourly_earnings),
      getFredChartData(FRED_SERIES.employment.initial_claims),
      getFredChartData(FRED_SERIES.employment.jolts_openings),
      getFredChartData(FRED_SERIES.rates.fed_funds),
      getFredChartData(FRED_SERIES.rates.treasury_10y),
    ])

    return NextResponse.json({
      indicators: {
        growth: {
          gdp: growth[0],
          industrial_production: growth[1],
          retail_sales: growth[2],
          durable_goods: growth[3],
          factory_orders: growth[4],
        },
        sentiment: {
          consumer_confidence: sentiment[0],
          consumer_confidence_cb: sentiment[1],
        },
        employment: {
          unemployment: employment[0],
          nonfarm_payroll: employment[1],
          avg_hourly_earnings: employment[2],
          initial_claims: employment[3],
          jolts_openings: employment[4],
        },
        inflation: {
          cpi: inflation[0],
          cpi_yoy: inflation[1],
          pce: inflation[2],
          ppi: inflation[3],
        },
        rates: {
          fed_funds: rates[0],
          treasury_10y: rates[1],
        },
      },
      charts: {
        gdp: chartData[0],
        industrial_production: chartData[1],
        retail_sales: chartData[2],
        durable_goods: chartData[3],
        factory_orders: chartData[4],
        consumer_confidence: chartData[5],
        consumer_confidence_cb: chartData[6],
        cpi_yoy: chartData[7],
        pce: chartData[8],
        ppi: chartData[9],
        unemployment: chartData[10],
        nonfarm_payroll: chartData[11],
        avg_hourly_earnings: chartData[12],
        initial_claims: chartData[13],
        jolts_openings: chartData[14],
        fed_funds: chartData[15],
        treasury_10y: chartData[16],
      },
    })
  } catch (error) {
    console.error('[v0] Economics API error:', error)
    return NextResponse.json({ error: 'Failed to fetch economics data' }, { status: 500 })
  }
}
