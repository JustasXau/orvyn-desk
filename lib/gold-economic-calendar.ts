/**
 * Filtre calendrier économique optimisé pour le Gold
 * Events qui impactent directement le Gold:
 * USD impact: FOMC, NFP, CPI, PCE, PPI, GDP, Retail Sales, ADP, Jobless Claims, Powell Speech
 * Autres: War/Sanctions, Risk sentiment
 */

export interface GoldImpactEvent {
  country: string
  event: string
  date: string
  time: string
  actual?: string | number
  forecast?: string | number
  previous?: string | number
  impact: 'high' | 'medium' | 'low'
  goldDirection: 'bullish' | 'bearish' | 'neutral'
  explanation: string
}

// Events USD qui impactent le Gold
const USD_IMPACT_EVENTS = [
  'FOMC Meeting',
  'FOMC Minutes',
  'NFP',
  'Non-Farm Payroll',
  'Initial Jobless Claims',
  'Continuing Jobless Claims',
  'CPI',
  'Core CPI',
  'PCE',
  'Core PCE',
  'PPI',
  'Core PPI',
  'GDP',
  'Preliminary GDP',
  'Final GDP',
  'Retail Sales',
  'Core Retail Sales',
  'ADP Employment',
  'ISM Manufacturing',
  'ISM Services',
  'Fed Chair Powell Speech',
  'Powell Testimony',
]

/**
 * Filtre les events du calendrier pour le Gold
 * Affiche seulement USD + High/Medium impact
 */
export function filterGoldEconomicEvents(allEvents: any[]): GoldImpactEvent[] {
  if (!allEvents || allEvents.length === 0) return []

  return allEvents
    .filter((event) => {
      // Filtre par pays (USD uniquement) et impact
      if (event.country !== 'US' && event.country !== 'USA') return false

      const impact = (event.impact || '').toLowerCase()
      if (!['high', 'medium'].includes(impact)) return false

      // Filtre par event
      return USD_IMPACT_EVENTS.some(
        (e) =>
          event.event?.toLowerCase().includes(e.toLowerCase()) ||
          event.title?.toLowerCase().includes(e.toLowerCase())
      )
    })
    .map((event) => {
      const explanation = getGoldImpactExplanation(event.event || event.title || '')
      const goldDirection = getGoldDirection(event.event || event.title || '')

      return {
        country: event.country || 'US',
        event: event.event || event.title || '',
        date: event.date || '',
        time: event.time || '',
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous,
        impact: (event.impact || 'low').toLowerCase() as 'high' | 'medium' | 'low',
        goldDirection,
        explanation,
      }
    })
    .slice(0, 20) // Top 20 events
}

/**
 * Explique l'impact d'un event sur le Gold
 */
function getGoldImpactExplanation(eventName: string): string {
  const event = eventName.toLowerCase()

  // Strong USD events
  if (
    event.includes('fomc') ||
    event.includes('fed') ||
    event.includes('powell') ||
    event.includes('rate')
  ) {
    return 'Si supérieur aux attentes → USD fort → Or baisse\nSi inférieur → Fed plus dovish → Or monte'
  }

  // Employment
  if (event.includes('nfp') || event.includes('payroll') || event.includes('jobless')) {
    return 'Si supérieur → USD fort (taux vont monter) → Or baisse\nSi inférieur → USD faible → Or monte'
  }

  // Inflation
  if (event.includes('cpi') || event.includes('pce') || event.includes('ppi')) {
    return 'Si supérieur → Inflation élevée → Or monte (protection)\nSi inférieur → Baisse inflation → Or baisse'
  }

  // Growth
  if (event.includes('gdp') || event.includes('retail')) {
    return 'Si supérieur → Croissance forte → Risk on → Or baisse\nSi inférieur → Croissance faible → Risk off → Or monte'
  }

  // Manufacturing/Services
  if (event.includes('ism')) {
    return 'Si supérieur → Économie forte → Risk on → Or baisse\nSi inférieur → Faiblesse économique → Risk off → Or monte'
  }

  return 'Impact sur sentiment USD et risque\nAffecte le prix de l\'or indirectement'
}

/**
 * Détermine la direction attendue du Gold
 */
function getGoldDirection(eventName: string): 'bullish' | 'bearish' | 'neutral' {
  const event = eventName.toLowerCase()

  // Events généralement haussiers pour l'or
  if (event.includes('jobless') || event.includes('claims') || event.includes('gdp')) {
    return 'bullish' // Car généralement plus faibles que prévu
  }

  // Events généralement baissiers
  if (event.includes('nfp') || event.includes('fomc') || event.includes('powell')) {
    return 'bearish' // Car généralement supérieurs à la suite d'une Fed hawk
  }

  return 'neutral'
}

/**
 * Crée un résumé d'impact pour l'event
 */
export function getSummaryImpact(event: GoldImpactEvent): string {
  if (!event.actual || !event.forecast) return event.explanation

  const actual = Number(event.actual)
  const forecast = Number(event.forecast)
  const difference = actual - forecast

  if (Math.abs(difference) < 0.1) {
    return `${event.event} came as expected (${event.actual})\n${event.explanation}`
  }

  if (difference > 0) {
    return `${event.event} BEAT expectations (${event.actual} vs ${event.forecast})\n${event.explanation}`
  }

  return `${event.event} MISSED expectations (${event.actual} vs ${event.forecast})\n${event.explanation}`
}
