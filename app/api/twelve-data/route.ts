import { NextResponse } from 'next/server'

const API_KEY = process.env.TWELVE_DATA_API_KEY

async function getTwelveDataPrice(symbol: string) {
  try {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEY}`,
      { next: { revalidate: 60 } }
    )
    const data = await res.json()
    
    if (data.status === 'ok') {
      return {
        symbol: data.symbol,
        price: parseFloat(data.close),
        change: parseFloat(data.change),
        changePercent: parseFloat(data.percent_change),
        date: new Date().toISOString(),
      }
    }
    return null
  } catch (error) {
    console.error(`[v0] Error fetching ${symbol}:`, error)
    return null
  }
}

async function getTwelveDataHistory(symbol: string, days: number = 30) {
  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${days}&apikey=${API_KEY}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    
    if (data.status === 'ok') {
      return data.values.reverse().map((v: any) => ({
        date: v.datetime,
        value: parseFloat(v.close),
      }))
    }
    return []
  } catch (error) {
    console.error(`[v0] Error fetching history for ${symbol}:`, error)
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols')?.split(',') || [
    'AAPL',
    'MSFT',
    'GOOGL',
    'TSLA',
    'AMZN',
    'EURUSD',
    'GBPUSD',
    'AUDUSD',
  ]

  try {
    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        const price = await getTwelveDataPrice(symbol)
        const history = await getTwelveDataHistory(symbol)
        return {
          ...price,
          chart: history,
        }
      })
    )

    return NextResponse.json({
      data: prices.filter(Boolean),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Twelve Data API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
