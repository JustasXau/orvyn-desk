import React from 'react'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TechnicalAnalysisDisplayProps {
  data: any
  loading?: boolean
}

export function TechnicalAnalysisDisplay({ data, loading }: TechnicalAnalysisDisplayProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
      </div>
    )
  }

  if (!data) return null

  const indicators = data.indicators || {}
  const trend = data.trend || 'neutral'
  const strength = data.strength || 50

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      {/* Header with trend */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Technical Analysis</h3>
        <div className={cn(
          'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold',
          trend === 'bullish' && 'bg-emerald-500/20 text-emerald-400',
          trend === 'bearish' && 'bg-red-500/20 text-red-400',
          trend === 'neutral' && 'bg-amber-500/20 text-amber-400'
        )}>
          {trend === 'bullish' && <TrendingUp className="w-3 h-3" />}
          {trend === 'bearish' && <TrendingDown className="w-3 h-3" />}
          {trend === 'neutral' && <AlertCircle className="w-3 h-3" />}
          <span>{trend.toUpperCase()}</span>
        </div>
      </div>

      {/* Strength gauge */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-muted-foreground font-semibold">STRENGTH</span>
          <span className="text-xs font-bold text-foreground">{strength}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              strength > 60 && 'bg-emerald-500',
              strength > 30 && strength <= 60 && 'bg-amber-500',
              strength <= 30 && 'bg-red-500'
            )}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(indicators).map(([name, value]: [string, any]) => (
          <div key={name} className="bg-muted/30 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{name}</div>
            <div className="text-xs font-bold text-foreground mt-1">{value.value}</div>
            <div className="text-[10px] text-muted-foreground">{value.signal}</div>
          </div>
        ))}
      </div>

      {/* Key levels */}
      {data.levels && (
        <div className="border-t border-border pt-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Key Levels</div>
          <div className="space-y-1 text-xs">
            {data.levels.resistance && (
              <div className="flex justify-between">
                <span>Resistance</span>
                <span className="text-red-400">{data.levels.resistance}</span>
              </div>
            )}
            {data.levels.support && (
              <div className="flex justify-between">
                <span>Support</span>
                <span className="text-emerald-400">{data.levels.support}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
