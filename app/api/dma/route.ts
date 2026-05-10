import { NextRequest, NextResponse } from 'next/server'

// Yahoo Finance symbol map
const YAHOO_SYMBOLS: Record<string, string> = {
  'XAU/USD': 'GC=F',
  'XAUUSD': 'GC=F',
  'XAG/USD': 'SI=F',
  'XAGUSD': 'SI=F',
  'DXY': 'DX-Y.NYB',
  'VIX': '^VIX',
  'US10Y': '^TNX',
  'US02Y': '^IRX',
  'US500': 'ES=F',
  'US100': 'NQ=F',
  'US30': 'YM=F',
  'WTI': 'CL=F',
  'USDJPY': 'USDJPY=X',
}

export interface DMAResult {
  symbol: string
  currentPrice: number
  dma10: number
  distancePoints: number   // prix - dma10 (negatif si en dessous)
  distancePercent: number  // % de distance
  position: 'above' | 'below'
  dmaLabel: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'XAU/USD'
  const period = parseInt(searchParams.get('period') || '10')

  const yahooSymbol = YAHOO_SYMBOLS[symbol] || YAHOO_SYMBOLS[symbol.toUpperCase()] || 'GC=F'

  try {
    // Fetch ~30 daily candles to have enough for DMA10
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=30d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }, // cache 1 min
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Yahoo Finance unavailable' }, { status: 502 })
    }

    const json = await res.json()
    const result = json?.chart?.result?.[0]

    if (!result) {
      return NextResponse.json({ error: 'No data returned' }, { status: 404 })
    }

    const closes: number[] = result.indicators?.quote?.[0]?.close || []
    const meta = result.meta || {}
    const currentPrice: number = meta.regularMarketPrice || closes[closes.length - 1] || 0

    // Filter out null/undefined closes
    const validCloses = closes.filter((c: number) => c != null && !isNaN(c))

    if (validCloses.length < period) {
      return NextResponse.json({ error: `Not enough data (need ${period}, got ${validCloses.length})` }, { status: 422 })
    }

    // Calculate DMA10: average of the last `period` closes
    const lastN = validCloses.slice(-period)
    const dma10 = lastN.reduce((sum: number, v: number) => sum + v, 0) / lastN.length

    const distancePoints = currentPrice - dma10
    const distancePercent = dma10 !== 0 ? (distancePoints / dma10) * 100 : 0

    const data: DMAResult = {
      symbol,
      currentPrice,
      dma10: Math.round(dma10 * 100) / 100,
      distancePoints: Math.round(distancePoints * 100) / 100,
      distancePercent: Math.round(distancePercent * 100) / 100,
      position: distancePoints >= 0 ? 'above' : 'below',
      dmaLabel: `DMA${period}`,
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('[DMA API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
