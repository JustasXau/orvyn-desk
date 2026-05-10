import { NextRequest, NextResponse } from 'next/server'

// Yahoo Finance symbol mapping
function getYahooSymbol(symbol: string): string {
  const map: Record<string, string> = {
    'XAU/USD': 'GC=F',
    'XAG/USD': 'SI=F',
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'JPY=X',
    'USD/CHF': 'CHF=X',
    'AUD/USD': 'AUDUSD=X',
    'USD/CAD': 'CAD=X',
    'NZD/USD': 'NZDUSD=X',
    'EUR/GBP': 'EURGBP=X',
    'EUR/JPY': 'EURJPY=X',
    'GBP/JPY': 'GBPJPY=X',
    'US30': 'YM=F',
    'US100': 'NQ=F',
    'US500': 'ES=F',
    'US2000': 'RTY=F',
    'DXY': 'DX-Y.NYB',
    'VIX': '^VIX',
    'BTC/USD': 'BTC-USD',
    'ETH/USD': 'ETH-USD',
    'USOIL': 'CL=F',
    'UKOIL': 'BZ=F',
    'NATGAS': 'NG=F',
    'COPPER': 'HG=F',
  }
  return map[symbol] || symbol
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || 'GC=F'
  const interval = request.nextUrl.searchParams.get('interval') || '1h'
  const range = request.nextUrl.searchParams.get('range') || '5d'
  
  // Map interval to Yahoo format
  const intervalMap: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '60m', '4h': '60m', '1d': '1d', '1wk': '1wk'
  }
  
  const yahooInterval = intervalMap[interval] || '60m'
  const yahooSymbol = getYahooSymbol(symbol)
  
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yahooInterval}&range=${range}`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 60 } // Cache for 1 minute
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch data', candles: [] }, { status: 500 })
    }
    
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    
    if (!result) {
      return NextResponse.json({ error: 'No data', candles: [] }, { status: 404 })
    }
    
    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}
    
    const candles = timestamps.map((time: number, i: number) => ({
      time: time,
      open: quote.open?.[i] ?? 0,
      high: quote.high?.[i] ?? 0,
      low: quote.low?.[i] ?? 0,
      close: quote.close?.[i] ?? 0,
    })).filter((c: any) => c.open && c.high && c.low && c.close)
    
    return NextResponse.json({
      symbol: yahooSymbol,
      interval: yahooInterval,
      range,
      candles,
      meta: {
        currency: result.meta?.currency,
        exchangeTimezoneName: result.meta?.exchangeTimezoneName,
        regularMarketPrice: result.meta?.regularMarketPrice,
      }
    })
    
  } catch (error) {
    console.error('[v0] Candles fetch error:', error)
    return NextResponse.json({ error: 'Server error', candles: [] }, { status: 500 })
  }
}
