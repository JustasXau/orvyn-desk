import React from 'react'
import { Brain, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SynthesisAnalysisDisplayProps {
  data: any
  loading?: boolean
}

export function SynthesisAnalysisDisplay({ data, loading }: SynthesisAnalysisDisplayProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4 bg-card rounded-lg border border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 bg-muted rounded animate-pulse w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const recommendation = data.recommendation || 'HOLD'
  const confidence = data.confidence || 50
  const targets = data.targets || {}
  const risks = data.risks || []

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
      {/* Header with recommendation */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">AI Synthesis</h3>
        </div>
        <div className={cn(
          'px-4 py-2 rounded-lg font-bold text-sm',
          recommendation === 'BUY' && 'bg-emerald-500/20 text-emerald-400',
          recommendation === 'SELL' && 'bg-red-500/20 text-red-400',
          recommendation === 'HOLD' && 'bg-amber-500/20 text-amber-400'
        )}>
          {recommendation}
        </div>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-muted-foreground">CONFIDENCE</span>
          <span className="text-sm font-bold text-foreground">{confidence}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Key points */}
      {data.keyPoints && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-xs font-semibold text-foreground uppercase tracking-wider">Key Points</div>
          <ul className="space-y-1">
            {data.keyPoints.map((point: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Targets */}
      {Object.keys(targets).length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(targets).map(([level, value]: [string, any]) => (
            <div key={level} className="p-2 bg-muted/30 rounded text-center">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">{level}</div>
              <div className="text-xs font-bold text-foreground mt-1">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400 uppercase">Risks</span>
          </div>
          <ul className="space-y-1">
            {risks.map((risk: string, i: number) => (
              <li key={i} className="text-[10px] text-red-300/80 flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeframe */}
      {data.timeframe && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border pt-3">
          Timeframe: {data.timeframe}
        </div>
      )}
    </div>
  )
}
