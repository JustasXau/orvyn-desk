import React from 'react'
import { Globe, Zap, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MacroAnalysisDisplayProps {
  data: any
  loading?: boolean
}

export function MacroAnalysisDisplay({ data, loading }: MacroAnalysisDisplayProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
      </div>
    )
  }

  if (!data) return null

  const factors = data.factors || {}
  const sentiment = data.sentiment || 'neutral'
  const impact = data.impact || 'medium'

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Macro Context</h3>
        <div className={cn(
          'px-3 py-1 rounded-full text-[10px] font-bold uppercase',
          sentiment === 'bullish' && 'bg-emerald-500/20 text-emerald-400',
          sentiment === 'bearish' && 'bg-red-500/20 text-red-400',
          sentiment === 'neutral' && 'bg-amber-500/20 text-amber-400'
        )}>
          {sentiment}
        </div>
      </div>

      {/* Factors */}
      <div className="space-y-2">
        {Object.entries(factors).map(([name, value]: [string, any]) => {
          let icon = <Globe className="w-4 h-4" />
          if (name.includes('rate') || name.includes('yield')) icon = <DollarSign className="w-4 h-4" />
          if (name.includes('volatility') || name.includes('vix')) icon = <Zap className="w-4 h-4" />

          return (
            <div key={name} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
              <div className="text-muted-foreground mt-0.5">{icon}</div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-foreground capitalize">{name}</div>
                <div className="text-[10px] text-muted-foreground">{value.current}</div>
              </div>
              <div className={cn(
                'text-xs font-bold',
                value.direction === 'up' && 'text-emerald-400',
                value.direction === 'down' && 'text-red-400',
                value.direction === 'stable' && 'text-amber-400'
              )}>
                {value.change}
              </div>
            </div>
          )
        })}
      </div>

      {/* Impact assessment */}
      <div className="border-t border-border pt-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Impact on {data.symbol}</div>
        <div className={cn(
          'text-xs p-2 rounded',
          impact === 'high' && 'bg-red-500/10 text-red-400',
          impact === 'medium' && 'bg-amber-500/10 text-amber-400',
          impact === 'low' && 'bg-emerald-500/10 text-emerald-400'
        )}>
          {data.impactDescription || `${impact} impact expected from macro drivers`}
        </div>
      </div>
    </div>
  )
}
