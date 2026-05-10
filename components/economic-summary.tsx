"use client"

import useSWR from "swr"
import { Landmark, TrendingUp, TrendingDown, Minus, RefreshCw, Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface EconomicEvent {
  id: string
  title: string
  country: string
  date: string
  time: string
  impact: "high" | "medium" | "low"
  forecast?: string
  previous?: string
  actual?: string
  currency: string
}

interface CalendarResponse {
  events: EconomicEvent[]
  timestamp: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Get country flag emoji
function getFlag(country: string): string {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸',
    'EU': '🇪🇺', 'EUR': '🇪🇺', 'Eurozone': '🇪🇺',
    'UK': '🇬🇧', 'GBP': '🇬🇧', 'United Kingdom': '🇬🇧',
    'JP': '🇯🇵', 'JPY': '🇯🇵', 'Japan': '🇯🇵',
    'CN': '🇨🇳', 'CNY': '🇨🇳', 'China': '🇨🇳',
    'AU': '🇦🇺', 'AUD': '🇦🇺', 'Australia': '🇦🇺',
    'CA': '🇨🇦', 'CAD': '🇨🇦', 'Canada': '🇨🇦',
    'CH': '🇨🇭', 'CHF': '🇨🇭', 'Switzerland': '🇨🇭',
    'NZ': '🇳🇿', 'NZD': '🇳🇿', 'New Zealand': '🇳🇿',
    'DE': '🇩🇪', 'Germany': '🇩🇪',
    'FR': '🇫🇷', 'France': '🇫🇷',
  }
  return flags[country] || '🌐'
}

// Determine if result is positive, negative or neutral for currency
function getResultImpact(event: EconomicEvent): 'positive' | 'negative' | 'neutral' {
  if (!event.actual || !event.forecast) return 'neutral'
  
  const actual = parseFloat(event.actual.replace(/[^0-9.-]/g, ''))
  const forecast = parseFloat(event.forecast.replace(/[^0-9.-]/g, ''))
  
  if (isNaN(actual) || isNaN(forecast)) return 'neutral'
  
  // For most indicators, higher than forecast is positive
  // Exceptions: unemployment, inflation (context dependent)
  const negativeIndicators = ['unemployment', 'jobless', 'inflation', 'cpi']
  const isNegativeIndicator = negativeIndicators.some(ind => 
    (event.title || '').toLowerCase().includes(ind)
  )
  
  if (actual > forecast) {
    return isNegativeIndicator ? 'negative' : 'positive'
  } else if (actual < forecast) {
    return isNegativeIndicator ? 'positive' : 'negative'
  }
  return 'neutral'
}

// Generate AI summary for events
function generateSummary(events: EconomicEvent[]): string {
  const released = events.filter(e => e.actual)
  const upcoming = events.filter(e => !e.actual && e.impact === 'high')
  
  if (released.length === 0 && upcoming.length === 0) {
    return "Journee calme sur le calendrier economique. Aucun evenement majeur prevu."
  }
  
  const summaryParts: string[] = []
  
  // Summarize released events
  if (released.length > 0) {
    const positive = released.filter(e => getResultImpact(e) === 'positive')
    const negative = released.filter(e => getResultImpact(e) === 'negative')
    
    if (positive.length > negative.length) {
      summaryParts.push(`Les donnees economiques publiees sont globalement positives (${positive.length}/${released.length}).`)
    } else if (negative.length > positive.length) {
      summaryParts.push(`Les donnees economiques publiees sont globalement negatives (${negative.length}/${released.length}).`)
    } else {
      summaryParts.push(`Les donnees economiques publiees sont mitigees.`)
    }
  }
  
  // Highlight upcoming high-impact events
  if (upcoming.length > 0) {
    const countries = [...new Set(upcoming.map(e => e.country))]
    summaryParts.push(`${upcoming.length} evenement(s) a fort impact a venir: ${countries.join(', ')}.`)
  }
  
  return summaryParts.join(' ')
}

interface EconomicSummaryProps {
  compact?: boolean
}

export function EconomicSummary({ compact = false }: EconomicSummaryProps) {
  const { data, error, isLoading, mutate } = useSWR<CalendarResponse>(
    "/api/economic-calendar",
    fetcher,
    { refreshInterval: 300000 } // 5 minutes
  )

  const events = data?.events || []
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.date)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  })
  
  const highImpactEvents = todayEvents.filter(e => e.impact === 'high')
  const releasedEvents = todayEvents.filter(e => e.actual)
  const upcomingEvents = todayEvents.filter(e => !e.actual)
  
  const summary = generateSummary(todayEvents)

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive text-sm">
        Erreur de chargement du calendrier
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", compact ? "p-3" : "p-4")}>
      {/* Summary Card */}
      <div className="bg-card/50 border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Resume du jour</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-foreground">{todayEvents.length}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-destructive">{highImpactEvents.length}</div>
            <div className="text-[10px] text-destructive">Impact eleve</div>
          </div>
          <div className="bg-success/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-success">{releasedEvents.length}</div>
            <div className="text-[10px] text-success">Publies</div>
          </div>
        </div>
      </div>

      {/* Released Events */}
      {releasedEvents.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Resultats publies
          </h4>
          <div className="space-y-2">
            {releasedEvents.slice(0, compact ? 3 : 5).map(event => {
              const impact = getResultImpact(event)
              return (
                <div 
                  key={event.id} 
                  className="bg-card/30 border border-border/50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFlag(event.country)}</span>
                    <div>
                      <div className="text-xs font-medium text-foreground">{event.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Prevu: {event.forecast || 'N/A'} | Precedent: {event.previous || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-bold",
                    impact === 'positive' ? "bg-success/20 text-success" :
                    impact === 'negative' ? "bg-destructive/20 text-destructive" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {impact === 'positive' ? <TrendingUp className="w-3 h-3" /> :
                     impact === 'negative' ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {event.actual}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming High Impact */}
      {upcomingEvents.filter(e => e.impact === 'high').length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            A venir (impact eleve)
          </h4>
          <div className="space-y-2">
            {upcomingEvents.filter(e => e.impact === 'high').slice(0, compact ? 3 : 5).map(event => (
              <div 
                key={event.id} 
                className="bg-warning/5 border border-warning/20 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFlag(event.country)}</span>
                  <div>
                    <div className="text-xs font-medium text-foreground">{event.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Prevu: {event.forecast || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-warning/20 text-warning text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  {event.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={() => mutate()}
        className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Actualiser
      </button>
    </div>
  )
}
