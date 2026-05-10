// Endpoint principal: GET /api/desk/[pair]/analysis
// Lance le chain-of-thought complet et retourne le rapport JSON

import { NextRequest, NextResponse } from 'next/server'
import { runChainOfThought } from '@/lib/ai/chain-orchestrator'

// Cache en memoire simple (5 min)
const cache = new Map<string, { report: unknown; expiresAt: number }>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  const symbol = decodeURIComponent(pair)

  if (!symbol) {
    return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY non configuree' }, { status: 500 })
  }

  // Verifier le cache
  const cached = cache.get(symbol)
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({
      ...cached.report,
      _cached: true,
      _cacheAge: Math.round((Date.now() - (cached.expiresAt - 300_000)) / 1000),
    })
  }

  try {
    console.log(`[Analysis API] Starting chain-of-thought for ${symbol}`)
    const start = Date.now()

    const result = await runChainOfThought(symbol)

    console.log(`[Analysis API] Completed in ${Date.now() - start}ms for ${symbol}`)

    // Mettre en cache 5 min
    cache.set(symbol, {
      report: result.report,
      expiresAt: Date.now() + 300_000,
    })

    return NextResponse.json(result.report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error(`[Analysis API] Error for ${symbol}:`, message)

    if (message.includes('RATE_LIMIT')) {
      return NextResponse.json(
        { error: 'Quota Groq atteint. Reessayez dans 1 minute.', retryAfter: 60 },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: `Analyse echouee: ${message}` },
      { status: 500 }
    )
  }
}

// Invalider le cache manuellement via POST
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  const symbol = decodeURIComponent(pair)
  cache.delete(symbol)
  return NextResponse.json({ message: `Cache invalide pour ${symbol}` })
}
