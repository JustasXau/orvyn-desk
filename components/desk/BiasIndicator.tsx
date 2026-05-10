'use client'

import { cn } from '@/lib/utils'
import type { BiasLevel } from '@/lib/pairs/types'

interface BiasIndicatorProps {
  level: BiasLevel
  confidence: number
  label?: string
  size?: 'sm' | 'md'
}

const BIAS_CONFIG: Record<BiasLevel, { color: string; bg: string; dot: string; short: string }> = {
  'Strongly Bullish': { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', dot: 'bg-emerald-400', short: 'S.Bull' },
  'Bullish':          { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', short: 'Bull' },
  'Slightly Bullish': { color: 'text-emerald-300', bg: 'bg-emerald-500/8 border-emerald-500/15',  dot: 'bg-emerald-300', short: 'Sl.Bull' },
  'Neutral':          { color: 'text-zinc-400',    bg: 'bg-zinc-500/10 border-zinc-500/20',        dot: 'bg-zinc-400',    short: 'Neutral' },
  'Slightly Bearish': { color: 'text-red-300',     bg: 'bg-red-500/8 border-red-500/15',           dot: 'bg-red-300',     short: 'Sl.Bear' },
  'Bearish':          { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',          dot: 'bg-red-400',     short: 'Bear' },
  'Strongly Bearish': { color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30',          dot: 'bg-red-400',     short: 'S.Bear' },
}

export function BiasIndicator({ level, confidence, label, size = 'md' }: BiasIndicatorProps) {
  const cfg = BIAS_CONFIG[level] || BIAS_CONFIG['Neutral']
  const isSmall = size === 'sm'

  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-2 py-0.5', cfg.bg, isSmall ? 'text-[10px]' : 'text-xs')}>
      <span className={cn('rounded-full shrink-0', cfg.dot, isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      <span className={cn('font-medium', cfg.color)}>
        {isSmall ? cfg.short : level}
      </span>
      <span className="text-zinc-500 font-mono">({confidence}%)</span>
    </div>
  )
}
