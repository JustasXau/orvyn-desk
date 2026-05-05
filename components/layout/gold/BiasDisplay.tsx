'use client'

import { cn } from '@/lib/utils'

interface BiasSection {
  score: number
  confidence: number
  label: string
}

interface Props {
  bias: BiasSection | null
  type: 'swing' | 'day'
}

export function BiasDisplay({ bias, type }: Props) {
  if (!bias) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-[#334155] rounded w-32" />
        <div className="h-3 bg-[#334155] rounded" />
      </div>
    )
  }

  const score = bias.score ?? 0
  const confidence = bias.confidence ?? 0
  const label = bias.label ?? 'Neutral'

  const isBullish = score > 0.10
  const isBearish = score < -0.10

  const color = isBullish ? 'text-green-400' : isBearish ? 'text-red-400' : 'text-yellow-400'
  const bgColor = isBullish ? 'bg-green-400' : isBearish ? 'bg-red-400' : 'bg-yellow-400'
  const badgeBg = isBullish ? 'bg-green-400/10 border-green-400/30' : 
                  isBearish ? 'bg-red-400/10 border-red-400/30' : 
                  'bg-yellow-400/10 border-yellow-400/30'

  const arrow = isBullish ? '↗' : isBearish ? '↘' : '→'
  const barWidth = Math.min(100, Math.abs(score) * 200)

  return (
    <div className="space-y-4">
      
      {/* Badge direction */}
      <div className="flex items-center justify-between">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold',
          badgeBg, color
        )}>
          <span>{arrow}</span>
          <span>{label}</span>
        </div>
        <span className="text-xs text-[#8a8a8a] font-mono">
          {type === 'swing' ? 'Weekly/Daily/H4' : 'H4/H1/M15'}
        </span>
      </div>

      {/* Barre de confiance */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-[#8a8a8a]">Confiance</span>
          <span className={cn('text-sm font-mono font-bold', color)}>
            {confidence}%
          </span>
        </div>
        <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', bgColor)}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8a8a8a]">Score brut</span>
        <span className={cn('font-mono', color)}>
          {score >= 0 ? '+' : ''}{score.toFixed(3)}
        </span>
      </div>
    </div>
  )
}