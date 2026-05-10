import { NextResponse } from 'next/server'

// World Bank Indicator IDs
const WORLD_BANK_INDICATORS = {
  gdp: 'NY.GDP.MKTP.CD', // GDP (current US$)
  gdp_per_capita: 'NY.GDP.PCAP.CD', // GDP per capita
  inflation: 'FP.CPI.TOTL.ZG', // Inflation (annual %)
  unemployment: 'SL.UEM.TOTL.ZS', // Unemployment (% of labor force)
  trade_balance: 'NE.RSB.GNFS.CD', // Trade balance
  fdi: 'BX.KLT.DINV.CD.WD', // Foreign Direct Investment
}

// Fetch World Bank data for a country
async function getWorldBankData(countryCode: string, indicatorId: string) {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorId}?format=json&date=2020:2025`
    const res = await fetch(url)
    
    if (!res.ok) return null

    const data = await res.json()
    const records = data[1] || []
    
    // Find the latest non-null value
    const latestRecord = records.find((record: any) => record.value !== null)
    
    if (!latestRecord) return null

    // Get previous value for comparison
    const previousRecord = records.find((record: any, index: number) => 
      index > 0 && record.value !== null
    )

    return {
      value: parseFloat(latestRecord.value),
      date: latestRecord.date,
      previousValue: previousRecord ? parseFloat(previousRecord.value) : null,
      change: previousRecord ? parseFloat(latestRecord.value) - parseFloat(previousRecord.value) : 0,
    }
  } catch (error) {
    console.error(`[v0] Error fetching World Bank data for ${countryCode}:`, error)
    return null
  }
}

// Fetch chart data (all years available)
async function getWorldBankChartData(countryCode: string, indicatorId: string) {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorId}?format=json&per_page=100&date=1960:2025`
    const res = await fetch(url)
    
    if (!res.ok) return []

    const data = await res.json()
    const records = data[1] || []
    
    return records
      .filter((record: any) => record.value !== null)
      .map((record: any) => ({
        date: record.date,
        value: parseFloat(record.value),
      }))
      .sort((a: any, b: any) => parseInt(a.date) - parseInt(b.date))
  } catch (error) {
    console.error(`[v0] Error fetching World Bank chart data:`, error)
    return []
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || 'US'

    // Map country name to World Bank code
    const countryMap: Record<string, string> = {
      'US': 'USA',
      'EU': 'EUU',
      'UK': 'GBR',
      'Japan': 'JPN',
      'Canada': 'CAN',
      'Australia': 'AUS',
      'France': 'FRA',
      'Germany': 'DEU',
      'China': 'CHN',
      'India': 'IND',
      'Brazil': 'BRA',
      'Mexico': 'MEX',
    }

    const countryCode = countryMap[country] || 'USA'

    // Fetch indicators in parallel
    const indicators = await Promise.all([
      getWorldBankData(countryCode, WORLD_BANK_INDICATORS.gdp),
      getWorldBankData(countryCode, WORLD_BANK_INDICATORS.gdp_per_capita),
      getWorldBankData(countryCode, WORLD_BANK_INDICATORS.inflation),
      getWorldBankData(countryCode, WORLD_BANK_INDICATORS.unemployment),
      getWorldBankData(countryCode, WORLD_BANK_INDICATORS.trade_balance),
      getWorldBankData(countryCode, WORLD_BANK_INDICATORS.fdi),
    ])

    // Fetch chart data
    const chartData = await Promise.all([
      getWorldBankChartData(countryCode, WORLD_BANK_INDICATORS.gdp),
      getWorldBankChartData(countryCode, WORLD_BANK_INDICATORS.inflation),
      getWorldBankChartData(countryCode, WORLD_BANK_INDICATORS.unemployment),
    ])

    return NextResponse.json({
      country: country,
      countryCode: countryCode,
      indicators: {
        gdp: indicators[0],
        gdp_per_capita: indicators[1],
        inflation: indicators[2],
        unemployment: indicators[3],
        trade_balance: indicators[4],
        fdi: indicators[5],
      },
      charts: {
        gdp: chartData[0],
        inflation: chartData[1],
        unemployment: chartData[2],
      },
    })
  } catch (error) {
    console.error('[v0] Error in World Bank API route:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
