/**
 * QuickAnalysisDisplay - Shows 2-sentence AI analysis from /api/quick-analysis
 * Displays on market cards with news awareness
 */

import { useState, useEffect } from 'react'
import { Sparkles, AlertCircle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickAnalysisWithInterval } from '@/hooks/use-quick-analysis'

interface QuickAnalysisDisplayProps {
  symbol: string
  price: number
  priceChange: number
  swingBias: { direction: string; confidence: number; score: number }
  dayBias: { direction: string; confidence: number; score: number }
  compact?: boolean
  showDebug?: boolean
}

export function QuickAnalysisDisplay({
  symbol,
  price,
  priceChange,
  swingBias,
  dayBias,
  compact = false,
  showDebug = false,
}: QuickAnalysisDisplayProps) {
  // TEMPORARILY DISABLED: useQuickAnalysisWithInterval causes 429 errors
  // Using simple fallback instead
  const analysis = `${symbol} - Analyse en attente...`
  const newsCount = 0
  const hasDivergence = false
  const isLoading = false
  const error = null

  /* DISABLED - CAUSING 429 ERRORS
  const { analysis, newsCount, hasDivergence, isLoading, error } = useQuickAnalysisWithInterval(
    symbol,
    price,
    priceChange,
    swingBias,
    dayBias
  )
  */

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50',
        compact ? 'text-xs' : 'text-sm'
      )}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Analyse en cours...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20',
        compact ? 'text-xs' : 'text-sm'
      )}>
        <AlertCircle className="w-4 h-4 text-destructive/60 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-destructive/70 font-medium">Erreur analyse</span>
          <span className="text-destructive/50 text-xs">{error}</span>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50',
        compact ? 'text-xs' : 'text-sm'
      )}>
        <span className="text-muted-foreground">Analyse indisponible</span>
      </div>
    )
  }

  return (
    <div className={cn(
      'space-y-2'
    )}>
      {/* Quick Analysis Text */}
      <div className={cn(
        'p-3 rounded-lg border bg-card/50 border-border/50',
        hasDivergence && 'bg-warning/5 border-warning/20',
        compact ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'
      )}>
        <div className="flex items-start gap-2">
          <Sparkles className={cn(
            'mt-0.5 shrink-0',
            hasDivergence ? 'text-warning' : 'text-primary',
            compact ? 'w-3 h-3' : 'w-4 h-4'
          )} />
          <p className="text-foreground/90">
            {analysis}
          </p>
        </div>
      </div>

      {/* News Alert */}
      {newsCount > 0 && (
        <div className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md bg-info/5 border border-info/20',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          <div className="w-1.5 h-1.5 rounded-full bg-info" />
          <span className="text-info/80">
            {newsCount} {newsCount === 1 ? 'article' : 'articles'} pertinent{newsCount > 1 ? 's' : ''} intégré{newsCount > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Divergence Warning */}
      {hasDivergence && (
        <div className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md bg-warning/5 border border-warning/20',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          <AlertCircle className="w-3 h-3 text-warning shrink-0" />
          <span className="text-warning/80">
            Divergence détectée: prix et bias ne sont pas alignés
          </span>
        </div>
      )}

      {/* Debug Info (optional) */}
      {showDebug && (
        <div className="text-[10px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/30 space-y-1 font-mono">
          <div>Bias Swing: {swingBias.direction} ({swingBias.confidence}%)</div>
          <div>Bias Day: {dayBias.direction} ({dayBias.confidence}%)</div>
          <div>News sources: {newsCount > 0 ? `${newsCount} articles` : 'aucun article pertinent'}</div>
        </div>
      )}
    </div>
  )
}
