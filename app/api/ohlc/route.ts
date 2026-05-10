import { NextRequest, NextResponse } from 'next/server'

// Yahoo Finance OHLC API - fetches real chart data
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || 'EURUSD=X'
  const interval = request.nextUrl.searchParams.get('interval') || '1d'
  const range = request.nextUrl.searchParams.get('range') || '9mo'

  try {
    // Call YahooFinance API via our backend to avoid CORS
    // Using a free API like yfinance or similar
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 } // 5 min cache
    })

    if (!response.ok) {
      return NextResponse.json({ bars: [], error: 'Failed to fetch data' }, { status: 200 })
    }

    const data = await response.json()
    const result = data.chart.result[0]
    
    if (!result || !result.timestamp) {
      return NextResponse.json({ bars: [] })
    }

    const bars = result.timestamp.map((ts: number, i: number) => ({
      timestamp: ts * 1000,
      open: result.indicators.quote[0].open[i] || 0,
      high: result.indicators.quote[0].high[i] || 0,
      low: result.indicators.quote[0].low[i] || 0,
      close: result.indicators.quote[0].close[i] || 0,
      volume: result.indicators.quote[0].volume[i] || 0
    })).filter((b: any) => b.close > 0)

    return NextResponse.json({ bars })
  } catch (error) {
    console.error('[OHLC API] Error:', error)
    return NextResponse.json({ bars: [], error: 'Internal error' }, { status: 200 })
  }
}
