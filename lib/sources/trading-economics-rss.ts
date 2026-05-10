// Calendrier economique via Trading Economics RSS
// Aucune cle API requise

import { TIMEOUTS } from '@/lib/ai/config'
import type { UpcomingEvent } from '@/types/ai-analysis'

export interface EconomicCalendarData {
  events: UpcomingEvent[]
  highImpactCount: number
  nextHighImpact: UpcomingEvent | null
  summary: string
  error?: string
}

const HIGH_IMPACT_KEYWORDS = [
  'nfp', 'non-farm', 'cpi', 'inflation', 'fomc', 'fed rate',
  'interest rate decision', 'gdp', 'unemployment', 'pce',
  'jerome powell', 'ecb rate', 'boj', 'bank of england',
  'retail sales', 'pmi', 'ism manufacturing',
]

const CALENDAR_URLS = [
  'https://tradingeconomics.com/calendar.rss',
  'https://rss.forexlive.com/news/all',
]

function parseEventFromRSS(title: string, description: string, pubDate: string): UpcomingEvent {
  const text = (title + ' ' + description).toLowerCase()

  let impact: UpcomingEvent['impact'] = 'low'
  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (text.includes(kw)) {
      impact = 'high'
      break
    }
  }
  if (!impact && (text.includes('important') || text.includes('key'))) {
    impact = 'medium'
  }

  // Estimer la reaction typique
  let expectedReaction = 'Impact modere attendu'
  if (text.includes('cpi') || text.includes('inflation')) {
    expectedReaction = 'Si > consensus → DXY↑ Gold↓ | Si < consensus → DXY↓ Gold↑'
  } else if (text.includes('nfp') || text.includes('non-farm')) {
    expectedReaction = 'Si > consensus → DXY↑ risk-on | Si < → DXY↓ Gold↑'
  } else if (text.includes('fomc') || text.includes('fed')) {
    expectedReaction = 'Hawkish → DXY↑ Gold↓ | Dovish → DXY↓ Gold↑'
  } else if (text.includes('gdp')) {
    expectedReaction = 'Fort → risk-on | Faible → risk-off, gold soutenu'
  }

  return {
    date: pubDate,
    event: title.slice(0, 100),
    impact,
    expectedReaction,
  }
}

async function fetchRSSCalendar(url: string): Promise<UpcomingEvent[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return []

    const text = await res.text()
    const events: UpcomingEvent[] = []
    const itemMatches = text.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)

    for (const match of itemMatches) {
      const content = match[1]
      const getTag = (tag: string) => {
        const m = content.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
          || content.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))
        return m?.[1]?.trim() ?? ''
      }

      const title = getTag('title')
      if (!title) continue

      events.push(parseEventFromRSS(title, getTag('description'), getTag('pubDate')))
    }

    return events.slice(0, 15)
  } catch {
    return []
  }
}

export async function fetchEconomicCalendar(): Promise<EconomicCalendarData> {
  const results = await Promise.all(CALENDAR_URLS.map(url => fetchRSSCalendar(url)))
  const allEvents = results.flat()

  if (allEvents.length === 0) {
    return {
      events: [],
      highImpactCount: 0,
      nextHighImpact: null,
      summary: 'Calendrier economique non disponible',
      error: 'Aucune source accessible',
    }
  }

  // Deduplique par titre similaire
  const seen = new Set<string>()
  const unique = allEvents.filter(e => {
    const key = e.event.slice(0, 30).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const highImpact = unique.filter(e => e.impact === 'high')
  const nextHighImpact = highImpact[0] || null

  const summary = highImpact.length > 0
    ? `${highImpact.length} evenement(s) high-impact prochainement — prochain: ${nextHighImpact?.event.slice(0, 50)}`
    : 'Pas d\'evenement high-impact imminent'

  return {
    events: unique.slice(0, 12),
    highImpactCount: highImpact.length,
    nextHighImpact,
    summary,
  }
}
