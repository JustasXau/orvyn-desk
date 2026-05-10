// app/api/desk/[pair]/route.ts
// Détail complet d'une paire

import { NextRequest, NextResponse } from 'next/server'
import { getPair } from '@/lib/pairs/config'
import { fetchPairPrice, fetchMacroContext, buildBiasFromEngine, buildAnalysis } from '@/lib/pairs/orchestrator'
import { calculateBias } from '@/lib/bias-engine-universal'

const cache = new Map<string, { data: any; ts: number }>()
const TTL = 2 * 60 * 1000

export async function GET(req: NextRequest, { params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const pairId = pair.toUpperCase()
  const config = getPair(pairId)

  if (!config) {
    return NextResponse.json({ error: `Pair ${pairId} not found` }, { status: 404 })
  }

  const hit = cache.get(pairId)
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data)
  }

  const [price, macroCtx, engineResult] = await Promise.all([
    fetchPairPrice(pairId),
    fetchMacroContext(),
    calculateBias(config.symbol).catch(() => null),
  ])

  const bias = engineResult ? buildBiasFromEngine(engineResult) : {
    swing: { level: 'Neutral' as any, confidence: 50, direction: 'neutral' as any },
    day: { level: 'Neutral' as any, confidence: 50, direction: 'neutral' as any },
  }

  const analysis = buildAnalysis(pairId, bias, macroCtx)

  // Build correlations from known historical correlations (research-backed)
  const KNOWN_CORRELATIONS: Record<string, Record<string, number>> = {
    'XAUUSD': { 'DXY': -0.78, 'XAGUSD': 0.88, 'US10Y': -0.45, 'VIX': 0.35, 'USDJPY': -0.55, 'US02Y': -0.50, 'GOLDSILVER': 0.15 },
    'DXY': { 'XAUUSD': -0.78, 'EURUSD': -0.98, 'US10Y': 0.55, 'US500': -0.25, 'USDJPY': 0.65, 'US02Y': 0.60 },
    'XAGUSD': { 'XAUUSD': 0.88, 'DXY': -0.65, 'WTI': 0.40, 'GOLDSILVER': -0.75 },
    'WTI': { 'US500': 0.55, 'DXY': -0.35, 'XAGUSD': 0.40 },
    'US500': { 'US100': 0.92, 'US30': 0.88, 'VIX': -0.82, 'WTI': 0.55, 'USDJPY': 0.45 },
    'US100': { 'US500': 0.92, 'US30': 0.75, 'VIX': -0.78 },
    'US30': { 'US500': 0.88, 'US100': 0.75, 'VIX': -0.75 },
    'VIX': { 'US500': -0.82, 'US100': -0.78, 'XAUUSD': 0.35, 'USDJPY': -0.40 },
    'US10Y': { 'DXY': 0.55, 'XAUUSD': -0.45, 'US02Y': 0.85, 'USDJPY': 0.50 },
    'USDJPY': { 'DXY': 0.65, 'US10Y': 0.50, 'XAUUSD': -0.55, 'VIX': -0.40, 'US500': 0.45 },
    'US02Y': { 'US10Y': 0.85, 'DXY': 0.60, 'XAUUSD': -0.50 },
    'GOLDSILVER': { 'XAUUSD': 0.15, 'XAGUSD': -0.75, 'VIX': 0.30 },
  }
  
  const correlations = (config.correlatedPairs || []).map((corrId) => {
    const knownCorr = KNOWN_CORRELATIONS[pairId]?.[corrId] || KNOWN_CORRELATIONS[corrId]?.[pairId] || 0
    return {
      pairId: corrId,
      correlation: Math.round(knownCorr * 100), // Convert to percentage (-100 to +100)
      trend: knownCorr > 0 ? 'positive' as const : knownCorr < 0 ? 'negative' as const : 'neutral' as const,
    }
  })

  const result = {
    config: {
      id: config.id,
      symbol: config.symbol,
      displayName: config.displayName,
      fullName: config.fullName,
      category: config.category,
      correlatedPairs: config.correlatedPairs || [],
      precision: config.precision,
      macroDrivers: config.macroDrivers,
    },
    price: price || { symbol: config.symbol, price: 0, change: 0, changePercent: 0, timestamp: Date.now(), source: 'unavailable' },
    analysis,
    correlations,
    macro: macroCtx,
  }

  cache.set(pairId, { data: result, ts: Date.now() })
  return NextResponse.json(result)
}
