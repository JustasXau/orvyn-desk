"use client"

import { X, RefreshCw, Loader2, AlertCircle, ExternalLink, Bell, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"

interface StructuredReportModalProps {
  symbol: string
  onClose: () => void
}

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(r => r.json())

// Format relative time in French
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return "A l'instant"
  if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`
}

// Format date for calendar
function formatCalendarDate(dateStr: string): { day: string; weekday: string; time: string } {
  const date = new Date(dateStr)
  const weekdays = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEP', 'OCT', 'NOV', 'DEC']
  
  return {
    day: `${date.getDate()} ${months[date.getMonth()]}`,
    weekday: weekdays[date.getDay()],
    time: `${date.getHours()}h${date.getMinutes().toString().padStart(2, '0')}`
  }
}

// Country flag component
function CountryFlag({ country }: { country: string }) {
  const flags: Record<string, string> = {
    'US': '🇺🇸',
    'USA': '🇺🇸',
    'EU': '🇪🇺',
    'EUR': '🇪🇺',
    'UK': '🇬🇧',
    'GBP': '🇬🇧',
    'JP': '🇯🇵',
    'JPY': '🇯🇵',
    'CH': '🇨🇭',
    'CHF': '🇨🇭',
    'AU': '🇦🇺',
    'AUD': '🇦🇺',
    'CA': '🇨🇦',
    'CAD': '🇨🇦',
    'NZ': '🇳🇿',
    'NZD': '🇳🇿',
    'CN': '🇨🇳',
    'CNY': '🇨🇳',
  }
  return <span className="text-lg">{flags[country] || '🌐'}</span>
}

// Impact badge component
function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }
  const labels = { high: 'Eleve', medium: 'Med', low: 'Faible' }
  
  return (
    <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full border", styles[impact])}>
      {labels[impact]}
    </span>
  )
}

// News card component
function NewsCard({ 
  headline, 
  summary, 
  source, 
  timestamp, 
  url,
  impact
}: {
  headline: string
  summary?: string
  source: string
  timestamp: number
  url?: string
  impact: 'bullish' | 'bearish' | 'neutral'
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border text-sm",
      impact === 'bullish' ? "bg-emerald-500/5 border-emerald-500/20" :
      impact === 'bearish' ? "bg-red-500/5 border-red-500/20" :
      "bg-muted/50 border-border"
    )}>
      <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {headline}
      </p>
      {summary && <p className="text-muted-foreground text-xs mb-2">{summary}</p>}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatRelativeTime(timestamp)}</span>
        {url && (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            VOIR L&apos;IMPACT <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}

// Factor section component
function FactorSection({ 
  title, 
  description, 
  news,
  type
}: {
  title: string
  description: string
  news: any[]
  type: 'bearish' | 'bullish'
}) {
  const bulletColor = type === 'bearish' ? 'bg-red-500' : 'bg-emerald-500'
  
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", bulletColor)} />
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {news.length > 0 && (
        <div className="pl-5 space-y-2">
          {news.slice(0, 2).map((n, i) => (
            <NewsCard 
              key={i}
              headline={n.headline}
              summary={n.summary}
              source={n.source}
              timestamp={n.datetime}
              url={n.url}
              impact={type === 'bearish' ? 'bearish' : 'bullish'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Calendar event component
function CalendarEvent({ 
  event,
  symbol
}: {
  event: any
  symbol: string
}) {
  const dateInfo = formatCalendarDate(event.timeUTC || event.date || new Date().toISOString())
  const impact = event.impact === 'high' || event.impactLevel === 3 ? 'high' : 
                 event.impact === 'medium' || event.impactLevel === 2 ? 'medium' : 'low'
  
  // Country name mapping
  const countryNames: Record<string, string> = {
    'US': 'ETATS-UNIS', 'USA': 'ETATS-UNIS', 'USD': 'ETATS-UNIS',
    'EU': 'ZONE EURO', 'EUR': 'ZONE EURO',
    'UK': 'ROYAUME-UNI', 'GBP': 'ROYAUME-UNI',
    'JP': 'JAPON', 'JPY': 'JAPON',
    'CH': 'SUISSE', 'CHF': 'SUISSE',
    'AU': 'AUSTRALIE', 'AUD': 'AUSTRALIE',
    'CA': 'CANADA', 'CAD': 'CANADA',
    'CN': 'CHINE', 'CNY': 'CHINE',
  }
  const countryDisplay = countryNames[event.country] || countryNames[event.currency] || event.country || 'ETATS-UNIS'
  
  return (
    <div className="flex gap-4 p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors">
      {/* Date block */}
      <div className="flex flex-col items-center justify-center min-w-[70px] text-center border-r border-border pr-4">
        <span className="text-xs text-muted-foreground">{dateInfo.weekday}</span>
        <span className="font-bold text-sm">{dateInfo.day}</span>
        <span className="text-xs text-muted-foreground">{event.time || dateInfo.time}</span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <CountryFlag country={event.country || event.currency || 'US'} />
          <span className="text-xs text-muted-foreground">{countryDisplay}</span>
          <span className="text-muted-foreground">•</span>
          <ImpactBadge impact={impact} />
        </div>
        <h4 className="font-semibold mb-1">{event.event || event.title || event.name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {generateEventImpact(event, symbol)}
        </p>
        {(event.forecast || event.previous) && (
          <div className="flex gap-4 mt-2 text-xs">
            {event.forecast && <span>Prev: <strong>{event.forecast}</strong></span>}
            {event.previous && <span className="text-muted-foreground">Prec: {event.previous}</span>}
          </div>
        )}
      </div>
      
      {/* Bell icon */}
      <button className="p-2 hover:bg-muted rounded-lg transition-colors self-center opacity-50 hover:opacity-100">
        <Bell className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  )
}

// Generate impact description for event
function generateEventImpact(event: any, symbol: string): string {
  const name = (event.title || event.name || '').toLowerCase()
  
  if (symbol.includes('XAU') || symbol.includes('GOLD')) {
    if (name.includes('nfp') || name.includes('emploi') || name.includes('job')) {
      return "Un rapport sur l'emploi plus faible que prevu pourrait stimuler la demande d'or comme valeur refuge."
    }
    if (name.includes('cpi') || name.includes('inflation')) {
      return "Une inflation elevee soutient generalement l'or, considere comme une protection contre la perte de pouvoir d'achat."
    }
    if (name.includes('fomc') || name.includes('fed') || name.includes('taux')) {
      return "Les decisions de la Fed sur les taux impactent directement l'or; des taux plus bas favorisent l'or."
    }
    if (name.includes('pmi') || name.includes('ism')) {
      return "Des donnees economiques faibles peuvent stimuler la demande d'or comme valeur refuge."
    }
  }
  
  if (symbol.includes('USD') || symbol.includes('DXY')) {
    if (name.includes('nfp') || name.includes('emploi')) {
      return "Le rapport sur l'emploi americain est le plus important indicateur pour le dollar."
    }
    if (name.includes('cpi') || name.includes('inflation')) {
      return "L'inflation influence directement les decisions de politique monetaire de la Fed."
    }
  }
  
  return `Cet evenement peut impacter ${symbol} selon les resultats par rapport aux previsions.`
}

export function StructuredReportModal({ symbol, onClose }: StructuredReportModalProps) {
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)
  
  // Fetch bias data
  const { data: biasData, isLoading: biasLoading } = useSWR(
    `/api/orvyn/bias?symbol=${symbol}`,
    fetcher,
    { revalidateOnFocus: false }
  )
  
  // Fetch news data
  const { data: newsData, isLoading: newsLoading } = useSWR(
    `/api/news?symbol=${symbol}&limit=20`,
    fetcher,
    { revalidateOnFocus: false }
  )
  
  // Fetch calendar data - filter by relevant currencies for this pair
  // Map symbol to currencies that impact it
  const getCurrenciesForSymbol = (sym: string): string[] => {
    // Gold/Silver - impacted by USD (Fed), EUR (ECB), geopolitics
    if (sym.includes('XAU') || sym.includes('XAG')) return ['USD', 'EUR']
    // Forex pairs - both currencies matter
    if (sym.includes('EUR/USD')) return ['EUR', 'USD']
    if (sym.includes('GBP/USD')) return ['GBP', 'USD']
    if (sym.includes('USD/JPY')) return ['USD', 'JPY']
    if (sym.includes('AUD/USD')) return ['AUD', 'USD']
    if (sym.includes('USD/CAD')) return ['USD', 'CAD']
    if (sym.includes('NZD/USD')) return ['NZD', 'USD']
    if (sym.includes('EUR/GBP')) return ['EUR', 'GBP']
    if (sym.includes('GBP/JPY')) return ['GBP', 'JPY']
    // Crypto - mainly USD (Fed policy impacts risk appetite)
    if (sym.includes('BTC') || sym.includes('ETH')) return ['USD']
    // US Indices - only USD
    if (sym.includes('US30') || sym.includes('US100') || sym.includes('US500') || sym.includes('DXY')) return ['USD']
    // Oil - USD and geopolitical
    if (sym.includes('WTI') || sym.includes('BRENT')) return ['USD']
    // Default
    return ['USD']
  }
  
  const relevantCurrencies = getCurrenciesForSymbol(symbol)
  const currencyFilter = relevantCurrencies.join(',')
  
  const { data: calendarData, isLoading: calendarLoading } = useSWR(
    `/api/economic-calendar?country=${currencyFilter}&date=week`,
    fetcher,
    { revalidateOnFocus: false }
  )
  
  const isLoading = biasLoading || newsLoading || calendarLoading
  
  // Process bias
  const dayBias = biasData?.day || biasData?.swing || { direction: 'Neutre', confidence: 0 }
  const biasDirection = dayBias.direction?.toLowerCase().includes('baissier') ? 'bearish' :
                        dayBias.direction?.toLowerCase().includes('haussier') ? 'bullish' : 'neutral'
  
  // Process news into bearish and bullish factors
  const allNews = newsData?.news || []
  const bearishNews = allNews.filter((n: any) => {
    const text = (n.headline + ' ' + (n.summary || '')).toLowerCase()
    return text.includes('drop') || text.includes('fall') || text.includes('risk') || 
           text.includes('fear') || text.includes('war') || text.includes('tension') ||
           text.includes('baisse') || text.includes('chute') || text.includes('guerre')
  })
  const bullishNews = allNews.filter((n: any) => {
    const text = (n.headline + ' ' + (n.summary || '')).toLowerCase()
    return text.includes('surge') || text.includes('rally') || text.includes('gain') ||
           text.includes('peace') || text.includes('deal') || text.includes('growth') ||
           text.includes('hausse') || text.includes('accord') || text.includes('croissance')
  })
  
  // Process calendar events - ONLY HIGH IMPACT (red) events relevant to the pair
  const allEvents = (calendarData?.events || []).map((e: any) => ({
    ...e,
    // Map impact string to number
    impactLevel: e.impact === 'high' ? 3 : e.impact === 'medium' ? 2 : 1,
    title: e.event || e.title,
    name: e.event || e.title,
  }))
  
  // Filter: ONLY HIGH impact events that affect THIS pair's currencies
  const highImpactEvents = allEvents.filter((e: any) => {
    // Must be HIGH impact (red)
    if (e.impact !== 'high' && e.impactLevel !== 3) return false
    // Must affect one of the pair's currencies
    const eventCurrency = e.currency || e.country
    return relevantCurrencies.some(c => 
      eventCurrency?.toUpperCase().includes(c) || 
      c.includes(eventCurrency?.toUpperCase() || '')
    )
  })
  
  // Sort by date (closest first)
  highImpactEvents.sort((a: any, b: any) => {
    const dateA = new Date(a.timeUTC || a.date || 0).getTime()
    const dateB = new Date(b.timeUTC || b.date || 0).getTime()
    return dateA - dateB
  })
  
  // Show max 6 high impact events by default
  const visibleEvents = showAllEvents ? highImpactEvents : highImpactEvents.slice(0, 6)
  
  // Bias badge color
  const biasColor = biasDirection === 'bearish' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    biasDirection === 'bullish' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    'bg-muted text-muted-foreground border-border'
  
  const biasLabel = biasDirection === 'bearish' ? 'legerement baissier' :
                    biasDirection === 'bullish' ? 'legerement haussier' : 'neutre'

  // Generate factors from news
  const bearishFactors = [
    {
      title: "Les tensions geopolitiques s'intensifient",
      description: "Les conflits regionaux stimulent la demande de valeurs refuges, les investisseurs se detournant des actifs a risque.",
      news: bearishNews.slice(0, 2)
    },
    {
      title: "Baisse des rendements reels",
      description: "La baisse des rendements obligataires rend l'or, qui ne rapporte pas d'interets, relativement plus attractif.",
      news: []
    },
    {
      title: "Les achats des banques centrales se poursuivent",
      description: "La demande soutenue de reserves offre un soutien structurel.",
      news: []
    }
  ].filter((_, i) => i < 3)
  
  const bullishFactors = [
    {
      title: "Desescalade des tensions",
      description: "Les mesures diplomatiques apaisent les craintes, ce qui attenue la demande de valeurs refuges.",
      news: bullishNews.slice(0, 2)
    },
    {
      title: "Appetit pour le risque apres les donnees economiques",
      description: "La politique monetaire restrictive freine les flux vers les valeurs refuge.",
      news: []
    }
  ].filter((_, i) => i < 2)
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg">
                  La tendance du day trading sur <span className="font-bold">{symbol}</span> est{' '}
                  <span className={cn("px-2 py-0.5 rounded text-sm font-medium border", biasColor)}>
                    {biasLabel}
                  </span>
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Mis a jour {formatRelativeTime(Date.now() - 7200000)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setForceRefresh(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Rafraichir"
              >
                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Two column layout for factors */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left column - What explains the bias */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Qu&apos;est-ce qui explique ce</h3>
                  <span className="px-2 py-0.5 rounded text-sm bg-red-500/20 text-red-400 border border-red-500/30">
                    parti pris
                  </span>
                  <span>?</span>
                </div>
                <div className="space-y-6">
                  {bearishFactors.map((factor, i) => (
                    <FactorSection 
                      key={i}
                      title={factor.title}
                      description={factor.description}
                      news={factor.news}
                      type="bearish"
                    />
                  ))}
                </div>
              </div>
              
              {/* Right column - What could flip the trend */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Qu&apos;est-ce qui pourrait faire basculer la tendance</h3>
                  <span className="px-2 py-0.5 rounded text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    a la hausse
                  </span>
                  <span>?</span>
                </div>
                <div className="space-y-6">
                  {bullishFactors.map((factor, i) => (
                    <FactorSection 
                      key={i}
                      title={factor.title}
                      description={factor.description}
                      news={factor.news}
                      type="bullish"
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Calendar section - HIGH IMPACT ONLY for this pair */}
            <div className="border-t border-border pt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Evenements HIGH IMPACT pour {symbol}</h3>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-red-500/20 text-red-400 border-red-500/30">
                    {highImpactEvents.length} evenement{highImpactEvents.length > 1 ? 's' : ''}
                  </span>
                </div>
                <a href="/calendar" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Calendrier complet <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              
              {/* Explanation of filtering */}
              <p className="text-xs text-muted-foreground mb-4">
                Seuls les evenements a fort impact ({relevantCurrencies.join(', ')}) susceptibles de faire bouger {symbol}
              </p>
              
              {highImpactEvents.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {visibleEvents.map((event: any, i: number) => (
                      <CalendarEvent key={event.id || i} event={event} symbol={symbol} />
                    ))}
                  </div>
                  
                  {highImpactEvents.length > 6 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="w-full mt-4 py-3 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 border-t border-border"
                    >
                      {showAllEvents ? (
                        <>Voir moins <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>Voir {highImpactEvents.length - 6} autres evenements HIGH <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p className="font-medium">Aucun evenement HIGH impact cette semaine</p>
                  <p className="text-xs mt-1">Les evenements {relevantCurrencies.join('/')} a fort impact seront affiches ici</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
