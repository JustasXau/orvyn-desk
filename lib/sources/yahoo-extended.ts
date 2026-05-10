// Yahoo Finance enrichi — historique long + intraday
// Aucune cle API requise

import { TIMEOUTS } from '@/lib/ai/config'

export interface OHLCBar {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface YahooHistoricalData {
  symbol: string
  bars: OHLCBar[]
  error?: string
}

// Map intervalle → range optimal
const INTERVAL_RANGE: Record<string, string> = {
  '1wk': '2y',    // 2 ans de weekly pour EMA200
  '1d': '1y',     // 1 an de daily
  '4h': '60d',    // 60 jours de 4h (Yahoo n'a pas 4h, on utilise 1h et on regroupe)
  '1h': '30d',    // 30 jours de 1h
  '15m': '5d',    // 5 jours de 15min
}

async function fetchWithTimeout(url: string, ms = TIMEOUTS.EXTERNAL_SOURCE): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrvynDesk/1.0)' },
    })
    return res
  } finally {
    clearTimeout(id)
  }
}

// Fetch OHLC depuis Yahoo Finance chart API
export async function fetchYahooOHLC(
  yahooSymbol: string,
  interval: '1wk' | '1d' | '1h' | '15m',
  range?: string
): Promise<YahooHistoricalData> {
  const actualRange = range || INTERVAL_RANGE[interval] || '1y'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${actualRange}&includePrePost=false`

  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) {
      return { symbol: yahooSymbol, bars: [], error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    const result = data?.chart?.result?.[0]

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return { symbol: yahooSymbol, bars: [], error: 'Format inattendu' }
    }

    const q = result.indicators.quote[0]
    const bars: OHLCBar[] = []

    for (let i = 0; i < result.timestamp.length; i++) {
      if (q.close[i] != null && q.close[i] > 0) {
        bars.push({
          timestamp: result.timestamp[i],
          open: q.open[i] ?? q.close[i],
          high: q.high[i] ?? q.close[i],
          low: q.low[i] ?? q.close[i],
          close: q.close[i],
          volume: q.volume?.[i] ?? 0,
        })
      }
    }

    return { symbol: yahooSymbol, bars }
  } catch (err) {
    return { symbol: yahooSymbol, bars: [], error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

// Regroupe les barres 1h en 4h
export function resampleTo4H(hourlyBars: OHLCBar[]): OHLCBar[] {
  const groups: Record<number, OHLCBar[]> = {}

  for (const bar of hourlyBars) {
    const d = new Date(bar.timestamp * 1000)
    const h = d.getUTCHours()
    const groupHour = Math.floor(h / 4) * 4
    d.setUTCHours(groupHour, 0, 0, 0)
    const key = Math.floor(d.getTime() / 1000)
    if (!groups[key]) groups[key] = []
    groups[key].push(bar)
  }

  return Object.entries(groups)
    .map(([ts, bars]) => ({
      timestamp: Number(ts),
      open: bars[0].open,
      high: Math.max(...bars.map(b => b.high)),
      low: Math.min(...bars.map(b => b.low)),
      close: bars[bars.length - 1].close,
      volume: bars.reduce((sum, b) => sum + b.volume, 0),
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

// Fetch prix spot actuel
export async function fetchYahooSpotPrice(yahooSymbol: string): Promise<{
  price: number
  change: number
  changePct: number
  high24h: number
  low24h: number
  volume: number
  error?: string
} | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`

  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return null

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta

    if (!meta?.regularMarketPrice) return null

    return {
      price: meta.regularMarketPrice,
      change: meta.regularMarketChange ?? 0,
      changePct: meta.regularMarketChangePercent ?? 0,
      high24h: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
      low24h: meta.regularMarketDayLow ?? meta.regularMarketPrice,
      volume: meta.regularMarketVolume ?? 0,
    }
  } catch {
    return null
  }
}
