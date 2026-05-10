// app/api/desk/overview/route.ts
// Toutes les paires en un seul appel — utilisé par le Macro Desk grid
// OPTIMIZED: Upstash Redis cache + timeout protection

import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { getAllPairs } from '@/lib/pairs/config'
import { fetchPairPrice, fetchMacroContext, buildBiasFromEngine, buildAnalysis, calculateGoldVerdict } from '@/lib/pairs/orchestrator'
import { calculateBias } from '@/lib/bias-engine-universal'

// Upstash Redis - persistent across cold starts
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const CACHE_KEY = 'desk_overview_v2'
const CACHE_TTL = 180 // 3 minutes

// Timeout wrapper - prevents one slow pair from blocking everything
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
  ])
}

export async function GET() {
  try {
    // 1. Check Upstash cache first (persists across cold starts)
    const cached = await redis.get<any>(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached)
    }
  } catch (cacheError) {
    console.error('[DeskOverview] Redis cache read error:', cacheError)
    // Continue without cache
  }

  const pairs = getAllPairs()

  // 2. Fetch all prices + macro context in parallel with timeouts
  const [pricesMap, macroCtx] = await Promise.all([
    Promise.all(
      pairs.map(p => 
        withTimeout(
          fetchPairPrice(p.id).then(price => ({ id: p.id, price })),
          5000, // 5s timeout per price
          { id: p.id, price: null }
        )
      )
    ),
    withTimeout(
      fetchMacroContext(),
      8000, // 8s timeout for macro
      { fedFundsRate: null, cpi: null, us10y: null, vix: null, dxyPrice: null }
    ),
  ])

  const priceById: Record<string, any> = {}
  for (const { id, price } of pricesMap) priceById[id] = price

  // 3. Build overview for each pair with timeout protection
  const pairsData = await Promise.all(
    pairs.map(async (p) => {
      const price = priceById[p.id]
      let swingBias = { level: 'Neutral' as any, confidence: 50 }
      let dayBias = { level: 'Neutral' as any, confidence: 50 }
      let edgeFactor = 50

      try {
        const engineResult = await withTimeout(
          calculateBias(p.symbol),
          10000, // 10s timeout for bias calculation
          null
        )
        
        if (engineResult) {
          const bias = buildBiasFromEngine(engineResult)
          swingBias = { level: bias.swing.level, confidence: bias.swing.confidence }
          dayBias = { level: bias.day.level, confidence: bias.day.confidence }
          const analysis = buildAnalysis(p.id, bias, macroCtx)
          edgeFactor = analysis.edgeFactor
        }
      } catch {
        // Fallback neutral - already set
      }

      return {
        id: p.id,
        symbol: p.symbol,
        displayName: p.displayName,
        fullName: p.fullName,
        category: p.category,
        precision: p.precision,
        correlatedPairs: p.correlatedPairs || [],
        price: price || { symbol: p.symbol, price: 0, change: 0, changePercent: 0, timestamp: Date.now(), source: 'unavailable' },
        swingBias,
        dayBias,
        edgeFactor,
      }
    })
  )

  // 5. Calculate cross-asset Gold Verdict
  const allBiases: Record<string, any> = {}
  for (const p of pairsData) {
    allBiases[p.id] = {
      swing: { direction: p.swingBias.level, confidence: p.swingBias.confidence },
      day: { direction: p.dayBias.level, confidence: p.dayBias.confidence },
    }
  }
  const goldVerdict = calculateGoldVerdict(allBiases)

  const result = {
    pairs: pairsData,
    macro: macroCtx,
    goldVerdict, // Cross-asset analysis for XAU/USD
    updatedAt: Date.now(),
  }

  // 4. Store in Upstash cache (async, don't await)
  try {
    redis.set(CACHE_KEY, result, { ex: CACHE_TTL }).catch(err => 
      console.error('[DeskOverview] Redis cache write error:', err)
    )
  } catch {
    // Ignore cache write errors
  }

  return NextResponse.json(result)
}
