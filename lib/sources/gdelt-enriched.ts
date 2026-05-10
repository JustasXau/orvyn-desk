// GDELT Project — geopolitique et tensions mondiales en temps reel
// API publique gratuite sans cle

import { TIMEOUTS } from '@/lib/ai/config'

export interface GDELTEvent {
  title: string
  url: string
  date: string
  tone: number          // Negatif = tensions, Positif = apaisement
  source: string
}

export interface GeopoliticalData {
  events: GDELTEvent[]
  averageTone: number | null    // Moyenne du ton (negatif = risque geo eleve)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  error?: string
}

const GEOPOLITICAL_QUERIES: Record<string, string[]> = {
  'XAU/USD': ['gold safe haven war', 'geopolitical risk gold', 'fed gold inflation'],
  'XAUUSD':  ['gold safe haven war', 'geopolitical risk gold', 'fed gold inflation'],
  'WTI':     ['oil supply OPEC', 'middle east oil', 'crude oil geopolitical'],
  'DXY':     ['dollar reserve currency', 'USD sanctions', 'de-dollarization'],
  'default': ['trade war tariff', 'geopolitical tensions', 'global recession risk'],
}

export async function fetchGeopoliticalData(symbol: string): Promise<GeopoliticalData> {
  const queries = GEOPOLITICAL_QUERIES[symbol] || GEOPOLITICAL_QUERIES.default
  const query = encodeURIComponent(queries[0])

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=10&format=json&timespan=24H&sort=toneasc`

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return { events: [], averageTone: null, riskLevel: 'low', summary: 'GDELT non disponible', error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    const articles = data?.articles || []

    const events: GDELTEvent[] = articles.slice(0, 8).map((a: {
      title?: string
      url?: string
      seendate?: string
      tone?: number
      domain?: string
    }) => ({
      title: a.title || 'Sans titre',
      url: a.url || '',
      date: a.seendate || '',
      tone: a.tone ?? 0,
      source: a.domain || 'Unknown',
    }))

    const tones = events.map(e => e.tone).filter(t => t !== 0)
    const averageTone = tones.length > 0
      ? Math.round((tones.reduce((a, b) => a + b, 0) / tones.length) * 100) / 100
      : null

    let riskLevel: GeopoliticalData['riskLevel'] = 'low'
    if (averageTone != null) {
      if (averageTone < -5) riskLevel = 'critical'
      else if (averageTone < -3) riskLevel = 'high'
      else if (averageTone < -1) riskLevel = 'medium'
    }

    const riskLabels = { low: 'faible', medium: 'modere', high: 'eleve', critical: 'critique' }
    const summary = averageTone != null
      ? `Ton geopolitique ${averageTone.toFixed(1)} — risque ${riskLabels[riskLevel]} sur les dernieres 24h`
      : `Donnees geopolitiques indisponibles`

    return { events, averageTone, riskLevel, summary }
  } catch {
    return { events: [], averageTone: null, riskLevel: 'low', summary: 'GDELT timeout', error: 'Timeout' }
  }
}
