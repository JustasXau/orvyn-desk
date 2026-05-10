import { NextResponse } from 'next/server'

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

interface EconomicEvent {
  id: string
  date: string
  time: string
  country: string
  currency: string
  event: string
  impact: 'high' | 'medium' | 'low' | 'none'
  actual: string | null
  forecast: string | null
  previous: string | null
}

// Cache for calendar data
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const cacheKey = 'economic_calendar'
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json(hit.data)
  }

  try {
    // Get dates for this week
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const from = startOfWeek.toISOString().split('T')[0]
    const to = endOfWeek.toISOString().split('T')[0]

    const events: EconomicEvent[] = []

    // Fetch from Finnhub Economic Calendar
    if (FINNHUB_API_KEY) {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
          { next: { revalidate: 300 } }
        )
        
        if (res.ok) {
          const data = await res.json()
          if (data.economicCalendar) {
            for (const item of data.economicCalendar) {
              const eventDate = new Date(item.time || item.date)
              events.push({
                id: `finnhub-${item.id || Date.now()}-${Math.random()}`,
                date: eventDate.toISOString().split('T')[0],
                time: eventDate.toTimeString().slice(0, 5),
                country: item.country || 'US',
                currency: mapCountryToCurrency(item.country || 'US'),
                event: item.event || 'Economic Event',
                impact: mapImpact(item.impact),
                actual: item.actual?.toString() || null,
                forecast: item.estimate?.toString() || null,
                previous: item.prev?.toString() || null,
              })
            }
          }
        }
      } catch (e) {
        console.error('[Calendar] Finnhub error:', e)
      }
    }

    // No fallback events - return empty array if no real data

    // Sort by date and time
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

    // Group by date
    const groupedEvents: Record<string, EconomicEvent[]> = {}
    for (const event of events) {
      if (!groupedEvents[event.date]) {
        groupedEvents[event.date] = []
      }
      groupedEvents[event.date].push(event)
    }

    const result = {
      events,
      groupedEvents,
      timestamp: new Date().toISOString(),
    }

    cache.set(cacheKey, { data: result, ts: Date.now() })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Calendar] Error:', error)
    return NextResponse.json({ events: [], groupedEvents: {}, timestamp: new Date().toISOString() })
  }
}

function mapCountryToCurrency(country: string): string {
  const map: Record<string, string> = {
    'US': 'USD',
    'United States': 'USD',
    'EU': 'EUR',
    'Eurozone': 'EUR',
    'UK': 'GBP',
    'United Kingdom': 'GBP',
    'JP': 'JPY',
    'Japan': 'JPY',
    'AU': 'AUD',
    'Australia': 'AUD',
    'CA': 'CAD',
    'Canada': 'CAD',
    'CH': 'CHF',
    'Switzerland': 'CHF',
    'NZ': 'NZD',
    'New Zealand': 'NZD',
    'CN': 'CNY',
    'China': 'CNY',
    'DE': 'EUR',
    'Germany': 'EUR',
    'FR': 'EUR',
    'France': 'EUR',
  }
  return map[country] || 'USD'
}

function mapImpact(impact: number | string | undefined): 'high' | 'medium' | 'low' | 'none' {
  if (typeof impact === 'number') {
    if (impact >= 3) return 'high'
    if (impact >= 2) return 'medium'
    if (impact >= 1) return 'low'
    return 'none'
  }
  if (typeof impact === 'string') {
    const lower = impact.toLowerCase()
    if (lower.includes('high')) return 'high'
    if (lower.includes('medium') || lower.includes('mid')) return 'medium'
    if (lower.includes('low')) return 'low'
  }
  return 'medium'
}

function generateFallbackEvents(): EconomicEvent[] {
  const today = new Date()
  const events: EconomicEvent[] = []
  
  const templates = [
    { event: 'Fed Interest Rate Decision', country: 'US', impact: 'high' as const },
    { event: 'Non-Farm Payrolls', country: 'US', impact: 'high' as const },
    { event: 'CPI m/m', country: 'US', impact: 'high' as const },
    { event: 'ECB Press Conference', country: 'EU', impact: 'high' as const },
    { event: 'GDP q/q', country: 'UK', impact: 'medium' as const },
    { event: 'Unemployment Rate', country: 'US', impact: 'medium' as const },
    { event: 'Retail Sales m/m', country: 'US', impact: 'medium' as const },
    { event: 'PMI Manufacturing', country: 'US', impact: 'medium' as const },
    { event: 'BOJ Policy Rate', country: 'JP', impact: 'high' as const },
    { event: 'RBA Rate Statement', country: 'AU', impact: 'high' as const },
  ]

  for (let i = 0; i < 5; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const template = templates[i % templates.length]
    
    events.push({
      id: `fallback-${i}`,
      date: date.toISOString().split('T')[0],
      time: `${8 + (i * 2)}:30`,
      country: template.country,
      currency: mapCountryToCurrency(template.country),
      event: template.event,
      impact: template.impact,
      actual: null,
      forecast: null,
      previous: null,
    })
  }

  return events
}
