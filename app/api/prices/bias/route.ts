import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { calculateBias, getBiasLabel, getBiasConfidence } from '@/lib/engines/biasEngine'
import { CACHE_TTL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cacheKey = 'gold_bias'
    const cached = await redis.get(cacheKey)

    if (cached) {
      return NextResponse.json(cached)
    }

    const bias = await calculateBias()

    const result = {
      ...bias,
      swing: {
        ...bias.swing,
        label:      getBiasLabel(bias.swing.score),
        confidence: getBiasConfidence(bias.swing.score),
      },
      day: {
        ...bias.day,
        label:      getBiasLabel(bias.day.score),
        confidence: getBiasConfidence(bias.day.score),
      },
    }

    console.log('[BIAS] Swing:', result.swing.label, '| Day:', result.day.label, '✅')

    await redis.set(cacheKey, result, { ex: CACHE_TTL.BIAS })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[BIAS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate bias' },
      { status: 500 }
    )
  }
}