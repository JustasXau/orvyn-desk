import { NextResponse } from 'next/server'

interface EconomicEvent {
  id: string
  date: string
  time: string
  timeUTC: string
  country: string
  currency: string
  event: string
  impact: 'high' | 'medium' | 'low' | 'none'
  actual: string | null
  forecast: string | null
  previous: string | null
  surprise: number | null // % deviation from forecast
  isImminent: boolean // < 30 min away
  isLive: boolean // currently happening
  sources: string[]
}

// Currency mapping
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'US': 'USD', 'USA': 'USD', 'United States': 'USD',
  'EU': 'EUR', 'EMU': 'EUR', 'Eurozone': 'EUR', 'Germany': 'EUR', 'France': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR',
  'UK': 'GBP', 'GB': 'GBP', 'United Kingdom': 'GBP',
  'JP': 'JPY', 'Japan': 'JPY',
  'AU': 'AUD', 'Australia': 'AUD',
  'CA': 'CAD', 'Canada': 'CAD',
  'CH': 'CHF', 'Switzerland': 'CHF',
  'NZ': 'NZD', 'New Zealand': 'NZD',
  'CN': 'CNY', 'China': 'CNY',
  'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR',
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿',
  CNY: '🇨🇳', INR: '🇮🇳', BRL: '🇧🇷', MXN: '🇲🇽',
  ZAR: '🇿🇦', SGD: '🇸🇬', HKD: '🇭🇰', SEK: '🇸🇪',
  NOK: '🇳🇴', DKK: '🇩🇰', PLN: '🇵🇱', RUB: '🇷🇺',
}

// Fetch ForexFactory Calendar (FREE, no API key)
async function fetchForexFactory(): Promise<EconomicEvent[]> {
  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      next: { revalidate: 300 }
    })
    if (!res.ok) return []
    
    const data = await res.json()
    const events: EconomicEvent[] = []
    
    for (const item of data) {
      const eventDate = new Date(item.date)
      const now = new Date()
      const timeDiff = eventDate.getTime() - now.getTime()
      const isImminent = timeDiff > 0 && timeDiff < 30 * 60 * 1000
      const isLive = Math.abs(timeDiff) < 5 * 60 * 1000
      
      // Parse impact
      let impact: EconomicEvent['impact'] = 'none'
      if (item.impact === 'High' || item.impact === 'high' || item.impact === 'Holiday') impact = 'high'
      else if (item.impact === 'Medium' || item.impact === 'medium') impact = 'medium'
      else if (item.impact === 'Low' || item.impact === 'low') impact = 'low'
      
      // Calculate surprise
      let surprise: number | null = null
      if (item.actual && item.forecast) {
        const actual = parseFloat(item.actual.replace(/[^0-9.-]/g, ''))
        const forecast = parseFloat(item.forecast.replace(/[^0-9.-]/g, ''))
        if (!isNaN(actual) && !isNaN(forecast) && forecast !== 0) {
          surprise = ((actual - forecast) / Math.abs(forecast)) * 100
        }
      }
      
      const currency = item.country || 'USD'
      
      events.push({
        id: `ff-${item.country || 'US'}-${item.date}-${item.title}-${Math.random().toString(36).substr(2, 5)}`.replace(/\s/g, '-'),
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        timeUTC: eventDate.toISOString(),
        country: item.country || 'US',
        currency,
        event: item.title || 'Economic Event',
        impact,
        actual: item.actual || null,
        forecast: item.forecast || null,
        previous: item.previous || null,
        surprise,
        isImminent,
        isLive,
        sources: ['ForexFactory']
      })
    }
    
    return events
  } catch (e) {
    console.error('ForexFactory calendar error:', e)
    return []
  }
}

// Fetch Finnhub Calendar
async function fetchFinnhub(): Promise<EconomicEvent[]> {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY
  if (!FINNHUB_KEY) return []
  
  try {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1)
    const endOfRange = new Date(startOfWeek)
    endOfRange.setDate(startOfWeek.getDate() + 13)
    
    const fromDate = startOfWeek.toISOString().split('T')[0]
    const toDate = endOfRange.toISOString().split('T')[0]
    
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    
    const data = await res.json()
    const events: EconomicEvent[] = []
    
    for (const item of data.economicCalendar || []) {
      const eventDate = item.time ? new Date(item.time) : new Date()
      const now = new Date()
      const timeDiff = eventDate.getTime() - now.getTime()
      const isImminent = timeDiff > 0 && timeDiff < 30 * 60 * 1000
      const isLive = Math.abs(timeDiff) < 5 * 60 * 1000
      
      // Parse impact
      let impact: EconomicEvent['impact'] = 'none'
      const impactStr = (item.impact || '').toLowerCase()
      if (impactStr.includes('high') || impactStr === '3') impact = 'high'
      else if (impactStr.includes('medium') || impactStr === '2') impact = 'medium'
      else if (impactStr.includes('low') || impactStr === '1') impact = 'low'
      
      // Calculate surprise
      let surprise: number | null = null
      if (item.actual !== null && item.estimate !== null && item.estimate !== 0) {
        surprise = ((item.actual - item.estimate) / Math.abs(item.estimate)) * 100
      }
      
      // Format values
      const formatVal = (v: number | null, unit: string): string | null => {
        if (v === null || v === undefined) return null
        if (unit === '%') return `${v}%`
        if (unit === 'B') return `${v}B`
        if (unit === 'M') return `${v}M`
        if (unit === 'K') return `${v}K`
        return v.toString()
      }
      
      const currency = COUNTRY_TO_CURRENCY[item.country] || item.country || 'USD'
      
      events.push({
        id: `finn-${item.country || 'US'}-${item.time}-${item.event}-${Math.random().toString(36).substr(2, 5)}`.replace(/\s/g, '-'),
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        timeUTC: eventDate.toISOString(),
        country: item.country || 'US',
        currency,
        event: item.event || 'Economic Event',
        impact,
        actual: formatVal(item.actual, item.unit || ''),
        forecast: formatVal(item.estimate, item.unit || ''),
        previous: formatVal(item.prev, item.unit || ''),
        surprise,
        isImminent,
        isLive,
        sources: ['Finnhub']
      })
    }
    
    return events
  } catch (e) {
    console.error('Finnhub calendar error:', e)
    return []
  }
}

// Merge and deduplicate events
function mergeEvents(ff: EconomicEvent[], finn: EconomicEvent[]): EconomicEvent[] {
  const merged: EconomicEvent[] = []
  const seen = new Map<string, EconomicEvent>()
  
  // Process ForexFactory first (generally more reliable for times)
  for (const event of ff) {
    const key = `${event.date}-${event.event.toLowerCase().substring(0, 30)}-${event.currency}`
    seen.set(key, event)
    merged.push(event)
  }
  
  // Add Finnhub events, merging if duplicate
  for (const event of finn) {
    const key = `${event.date}-${event.event.toLowerCase().substring(0, 30)}-${event.currency}`
    
    if (seen.has(key)) {
      // Merge sources
      const existing = seen.get(key)!
      existing.sources = [...new Set([...existing.sources, ...event.sources])]
      // Use Finnhub actual if ForexFactory doesn't have it
      if (!existing.actual && event.actual) existing.actual = event.actual
      if (!existing.forecast && event.forecast) existing.forecast = event.forecast
    } else {
      merged.push(event)
    }
  }
  
  return merged
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country')
  const impact = searchParams.get('impact')
  const dateFilter = searchParams.get('date') // today, week, nextweek
  
  try {
    // Fetch from both sources in parallel
    const [ffEvents, finnEvents] = await Promise.all([
      fetchForexFactory(),
      fetchFinnhub()
    ])
    
    // Merge and deduplicate
    let events = mergeEvents(ffEvents, finnEvents)
    
    // Apply date filter
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    if (dateFilter === 'today') {
      events = events.filter(e => e.date === today)
    } else if (dateFilter === 'week') {
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + 7)
      events = events.filter(e => e.date >= today && e.date <= weekEnd.toISOString().split('T')[0])
    }
    
    // Apply country filter
    if (country) {
      const currencies = country.split(',').map(c => c.toUpperCase())
      events = events.filter(e => currencies.includes(e.currency))
    }
    
    // Apply impact filter
    if (impact) {
      const impacts = impact.split(',')
      events = events.filter(e => impacts.includes(e.impact))
    }
    
    // Sort by date and time
    events.sort((a, b) => {
      const dateCompare = a.timeUTC.localeCompare(b.timeUTC)
      return dateCompare
    })
    
    // Group by date
    const groupedEvents: Record<string, EconomicEvent[]> = {}
    for (const event of events) {
      if (!groupedEvents[event.date]) {
        groupedEvents[event.date] = []
      }
      groupedEvents[event.date].push(event)
    }
    
    // Get upcoming high-impact events
    const upcomingHighImpact = events
      .filter(e => e.impact === 'high' && new Date(e.timeUTC) > now)
      .slice(0, 3)
      .map(e => ({
        ...e,
        countdown: Math.round((new Date(e.timeUTC).getTime() - now.getTime()) / 60000)
      }))
    
    // Count imminent and live events
    const imminentCount = events.filter(e => e.isImminent).length
    const liveCount = events.filter(e => e.isLive).length
    
    return NextResponse.json({
      events,
      groupedEvents,
      upcomingHighImpact,
      stats: {
        total: events.length,
        highImpact: events.filter(e => e.impact === 'high').length,
        imminentCount,
        liveCount,
        sources: ffEvents.length > 0 && finnEvents.length > 0 ? 2 : 1
      },
      currencyFlags: CURRENCY_FLAGS,
      timestamp: now.toISOString()
    })
    
  } catch (error) {
    console.error('Economic calendar API error:', error)
    
    return NextResponse.json({
      events: [],
      groupedEvents: {},
      upcomingHighImpact: [],
      stats: { total: 0, highImpact: 0, imminentCount: 0, liveCount: 0, sources: 0 },
      currencyFlags: CURRENCY_FLAGS,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la recuperation du calendrier economique"
    }, { status: 500 })
  }
}
