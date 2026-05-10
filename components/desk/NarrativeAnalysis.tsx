'use client'

import { useState } from 'react'
import { Brain, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

interface TimeframeAnalysis {
  bias: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  text: string // API returns 'text' not 'narrative'
}

interface NarrativeData {
  symbol: string
  weekly: TimeframeAnalysis
  daily: TimeframeAnalysis
  h4: TimeframeAnalysis
  bullishDrivers: string[] // API returns flat arrays
  bearishDrivers: string[]
  keyEvents: string[]
  invalidation: string
  generatedAt: string
  cached?: boolean
  fallback?: boolean
  error?: string
}

interface NarrativeAnalysisProps {
  pair: string
  pairName?: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function BiasIcon({ bias, size = 'md' }: { bias: string, size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  if (bias === 'bullish') return <TrendingUp className={cn(sizeClass, 'text-emerald-400')} />
  if (bias === 'bearish') return <TrendingDown className={cn(sizeClass, 'text-red-400')} />
  return <Minus className={cn(sizeClass, 'text-amber-400')} />
}

function TimeframeCard({ 
  label, 
  analysis,
  isExpanded,
  onToggle
}: { 
  label: string
  analysis: TimeframeAnalysis
  isExpanded: boolean
  onToggle: () => void
}) {
  const bgColors = {
    bullish: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent',
    bearish: 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent',
    neutral: 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent'
  }
  
  const labelColors = {
    bullish: 'text-emerald-400',
    bearish: 'text-red-400',
    neutral: 'text-amber-400'
  }

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-all',
      bgColors[analysis.bias]
    )}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            analysis.bias === 'bullish' ? 'bg-emerald-500/20' :
            analysis.bias === 'bearish' ? 'bg-red-500/20' : 'bg-amber-500/20'
          )}>
            <BiasIcon bias={analysis.bias} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground">{label}</div>
            <div className={cn('text-sm font-medium capitalize', labelColors[analysis.bias])}>
              {analysis.bias} — {analysis.confidence}%
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10">
          <p className="text-sm text-foreground/90 leading-relaxed mt-3">
            {analysis.text}
          </p>
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false 
}: { 
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

export function NarrativeAnalysis({ pair, pairName }: NarrativeAnalysisProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    weekly: true,
    daily: true,
    h4: true
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(0)

  // Format pair for API call
  const pairFormatted = pair.replace('/', '').replace('-', '').toUpperCase()

  const { data, error, isLoading, mutate } = useSWR<NarrativeData>(
    `/api/desk/${pairFormatted}/narrative`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      refreshInterval: 0
    }
  )

  const handleRefresh = async () => {
    const now = Date.now()
    if (now - lastRefresh < 60000) {
      return // 60s cooldown
    }
    setLastRefresh(now)
    setIsRefreshing(true)
    await mutate()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Determine global bias from timeframes
  const getGlobalBias = () => {
    if (!data) return { bias: 'neutral', confidence: 50 }
    
    const biases = [data.weekly, data.daily, data.h4]
    const bullishCount = biases.filter(b => b?.bias === 'bullish').length
    const bearishCount = biases.filter(b => b?.bias === 'bearish').length
    const avgConfidence = Math.round(biases.reduce((sum, b) => sum + (b?.confidence || 50), 0) / 3)
    
    if (bullishCount > bearishCount) return { bias: 'bullish', confidence: avgConfidence }
    if (bearishCount > bullishCount) return { bias: 'bearish', confidence: avgConfidence }
    return { bias: 'neutral', confidence: avgConfidence }
  }

  const globalBias = getGlobalBias()

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Analyse Narrative IA</h3>
            <p className="text-xs text-muted-foreground">Generation en cours...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data || data.fallback) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Analyse Narrative IA</h3>
              <p className="text-xs text-red-400">
                {data?.error || 'Erreur de chargement'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Verifiez que la cle API Groq est configuree. Cliquez pour reessayer.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Analyse Narrative IA</h3>
            <p className="text-xs text-muted-foreground">
              {pairName || pair} — {data.timestamp ? new Date(data.timestamp).toLocaleTimeString('fr-FR') : ''}
              {data.cached && <span className="ml-1 text-zinc-500">(cache)</span>}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          title="Rafraichir (60s cooldown)"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Global Bias Summary */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BiasIcon bias={globalBias.bias} size="sm" />
          <span className="text-sm text-foreground">
            Biais global: <span className={cn(
              'font-semibold capitalize',
              globalBias.bias === 'bullish' ? 'text-emerald-400' :
              globalBias.bias === 'bearish' ? 'text-red-400' : 'text-amber-400'
            )}>{globalBias.bias}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confiance:</span>
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                globalBias.confidence >= 70 ? 'bg-emerald-500' :
                globalBias.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${globalBias.confidence}%` }}
            />
          </div>
          <span className="text-xs font-medium text-foreground">{globalBias.confidence}%</span>
        </div>
      </div>

      {/* Timeframe Analysis Cards */}
      <div className="p-4 space-y-3">
        {data.weekly && (
          <TimeframeCard 
            label="Vision Weekly" 
            analysis={data.weekly}
            isExpanded={expandedSections.weekly}
            onToggle={() => toggleSection('weekly')}
          />
        )}
        {data.daily && (
          <TimeframeCard 
            label="Vision Daily" 
            analysis={data.daily}
            isExpanded={expandedSections.daily}
            onToggle={() => toggleSection('daily')}
          />
        )}
        {data.h4 && (
          <TimeframeCard 
            label="Vision H4" 
            analysis={data.h4}
            isExpanded={expandedSections.h4}
            onToggle={() => toggleSection('h4')}
          />
        )}
      </div>

      {/* Collapsible Sections */}
      <div className="border-t border-zinc-800">
        {/* Bullish Drivers */}
        {data.bullishDrivers?.length > 0 && (
          <CollapsibleSection
            title="Drivers Haussiers"
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            defaultOpen={false}
          >
            <ul className="space-y-2">
              {data.bullishDrivers.map((driver, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-emerald-400 mt-0.5 font-bold">+</span>
                  {driver}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Bearish Drivers */}
        {data.bearishDrivers?.length > 0 && (
          <CollapsibleSection
            title="Drivers Baissiers"
            icon={<TrendingDown className="w-4 h-4 text-red-400" />}
            defaultOpen={false}
          >
            <ul className="space-y-2">
              {data.bearishDrivers.map((driver, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-red-400 mt-0.5 font-bold">-</span>
                  {driver}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Key Events */}
        {data.keyEvents?.length > 0 && (
          <CollapsibleSection
            title="Evenements a Surveiller"
            icon={<Calendar className="w-4 h-4 text-amber-400" />}
            defaultOpen={false}
          >
            <ul className="space-y-2">
              {data.keyEvents.map((event, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {event}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Invalidation */}
        {data.invalidation && data.invalidation !== 'N/A' && (
          <CollapsibleSection
            title="Niveau d'Invalidation"
            icon={<Shield className="w-4 h-4 text-orange-400" />}
            defaultOpen={false}
          >
            <p className="text-sm text-foreground/80">{data.invalidation}</p>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}
