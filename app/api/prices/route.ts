import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { fetchYahooPrices } from '@/lib/api/yahoo'
import { CACHE_TTL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cacheKey = 'gold_prices'
    const cached = await redis.get(cacheKey)

    if (cached) {
      return NextResponse.json(cached)
    }

    const prices = await fetchYahooPrices()
    console.log('[PRICES] XAU/USD:', prices.XAUUSD?.price, '✅')

    await redis.set(cacheKey, prices, { ex: CACHE_TTL.PRICES })

    return NextResponse.json(prices)
  } catch (error) {
    console.error('[PRICES] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}