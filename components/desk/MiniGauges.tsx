'use client'

import { cn } from '@/lib/utils'
import type { PairAnalysis } from '@/lib/pairs/types'

// ── Mood ────────────────────────────────────────────────────────────────────
export function MoodGauge({ mood }: { mood: PairAnalysis['mood'] }) {
  const color = mood.score > 55 ? 'text-emerald-400' : mood.score > 45 ? 'text-zinc-400' : 'text-red-400'
  const bar = mood.score
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Humeur</span>
        <span className={cn('text-[10px] font-medium', color)}>{mood.label}</span>
      </div>
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', mood.score > 55 ? 'bg-emerald-400' : mood.score > 45 ? 'bg-zinc-400' : 'bg-red-400')}
          style={{ width: `${bar}%` }}
        />
      </div>
    </div>
  )
}

// ── Pulse ────────────────────────────────────────────────────────────────────
export function PulseGauge({ pulse }: { pulse: PairAnalysis['pulse'] }) {
  const color = pulse.level === 'Sauvage' ? 'text-red-400' : pulse.level === 'Tradable' ? 'text-amber-400' : 'text-sky-400'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Pouls</span>
        <span className={cn('text-[10px] font-medium', color)}>{pulse.level}</span>
      </div>
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', pulse.level === 'Sauvage' ? 'bg-red-400' : pulse.level === 'Tradable' ? 'bg-amber-400' : 'bg-sky-400')}
          style={{ width: `${Math.min(100, pulse.score)}%` }}
        />
      </div>
    </div>
  )
}

// ── Flow ─────────────────────────────────────────────────────────────────────
export function FlowGauge({ flow }: { flow: PairAnalysis['flow'] }) {
  const color = flow.level === 'Chargé' ? 'text-violet-400' : flow.level === 'Sain' ? 'text-emerald-400' : 'text-zinc-500'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Flux</span>
        <span className={cn('text-[10px] font-medium', color)}>{flow.level}</span>
      </div>
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', flow.level === 'Chargé' ? 'bg-violet-400' : flow.level === 'Sain' ? 'bg-emerald-400' : 'bg-zinc-500')}
          style={{ width: `${Math.min(100, flow.score)}%` }}
        />
      </div>
    </div>
  )
}

// ── Trend ─────────────────────────────────────────────────────────────────────
export function TrendGauge({ trend }: { trend: PairAnalysis['trend'] }) {
  const icons: Record<string, string> = { up: '↑', down: '↓', sideways: '→', neutral: '○' }
  const levelColors: Record<string, string> = {
    'Variation': 'text-amber-400',
    'Emergence': 'text-sky-400',
    'Continuation': 'text-emerald-400',
    'Cassure': 'text-violet-400',
  }
  const dirColor = trend.direction === 'up' ? 'text-emerald-400' : trend.direction === 'down' ? 'text-red-400' : 'text-zinc-400'
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tendance</span>
      <span className={cn('text-[10px] font-medium flex items-center gap-1.5')}>
        <span className={dirColor}>{icons[trend.direction] || '○'}</span>
        <span className={levelColors[trend.level] || 'text-zinc-400'}>{trend.level}</span>
      </span>
    </div>
  )
}
