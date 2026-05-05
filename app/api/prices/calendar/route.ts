import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { fetchCalendarData } from '@/lib/api/calendar'
import { CACHE_TTL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

function getGoldImpact(eventTitle: string) {
  const title = eventTitle.toLowerCase()

  if (title.includes('fomc') || title.includes('fed') || title.includes('powell')) {
    return {
      ifBetter: 'Décision hawkish → USD fort → Gold sous pression baissière',
      ifWorse:  'Décision dovish → USD faible → Gold haussier',
      magnitude: 'high' as const,
    }
  }
  if (title.includes('nfp') || title.includes('payroll') || title.includes('adp')) {
    return {
      ifBetter: 'Chiffre > attentes → USD fort → Gold baissier',
      ifWorse:  'Chiffre < attentes → USD faible → Gold haussier',
      magnitude: 'high' as const,
    }
  }
  if (title.includes('cpi') || title.includes('pce') || title.includes('ppi')) {
    return {
      ifBetter: 'Inflation > attentes → Fed hawkish → Gold sous pression',
      ifWorse:  'Inflation < attentes → Fed dovish → Gold haussier',
      magnitude: 'high' as const,
    }
  }
  if (title.includes('gdp') || title.includes('growth')) {
    return {
      ifBetter: 'Croissance forte → USD fort → Gold sous pression',
      ifWorse:  'Croissance faible → USD faible → Gold haussier',
      magnitude: 'medium' as const,
    }
  }
  return {
    ifBetter: 'Données > attentes → USD fort → Gold sous pression',
    ifWorse:  'Données < attentes → USD faible → Gold haussier',
    magnitude: 'medium' as const,
  }
}

const RELEVANT_EVENTS = [
  'FOMC', 'Federal Funds Rate', 'NFP', 'Non-Farm Payrolls',
  'CPI', 'PCE', 'PPI', 'GDP', 'Retail Sales', 'ADP',
  'Jobless Claims', 'ISM', 'Consumer Confidence',
  'Powell', 'Fed Chair', 'Inflation',
]

export async function GET() {
  try {
    const cacheKey = 'gold_calendar'
    const cached = await redis.get(cacheKey)

    if (cached) {
      return NextResponse.json(cached)
    }

    const data = await fetchCalendarData()
    const events = Array.isArray(data) ? data : data.events ?? []

    const goldEvents = events
      .filter((event: any) => {
        const currency = event.currency ?? event.currencies ?? ''
        const hasUSD = currency.includes('USD')
        const highImpact = event.impact === 'High' || event.impact === 'Medium'
        const isRelevant = RELEVANT_EVENTS.some(r =>
          (event.title ?? event.event ?? '').includes(r)
        )
        return hasUSD && highImpact && isRelevant
      })
      .map((event: any) => ({
        id: event.id ?? Math.random().toString(),
        title: event.title ?? event.event ?? '',
        time: event.date ?? event.time ?? '',
        impact: event.impact,
        previous: event.previous ?? '-',
        forecast: event.forecast ?? '-',
        actual: event.actual ?? null,
        goldImpact: getGoldImpact(event.title ?? event.event ?? ''),
      }))

    console.log(`[CALENDAR] ${goldEvents.length} événements gold ✅`)

    await redis.set(cacheKey, goldEvents, { ex: CACHE_TTL.CALENDAR })

    return NextResponse.json(goldEvents)
  } catch (error) {
    console.error('[CALENDAR] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}