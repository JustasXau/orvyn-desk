'use client'

import { cn } from '@/lib/utils'

interface EdgeFactorGaugeProps {
  value: number // 0-100
  size?: 'sm' | 'md' | 'lg'
}

export function EdgeFactorGauge({ value, size = 'md' }: EdgeFactorGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const color = clamped >= 70 ? 'text-emerald-400' : clamped >= 45 ? 'text-amber-400' : 'text-red-400'
  const bgColor = clamped >= 70 ? 'bg-emerald-400' : clamped >= 45 ? 'bg-amber-400' : 'bg-red-400'
  const label = clamped >= 70 ? 'Fort' : clamped >= 45 ? 'Modéré' : 'Faible'

  const dims = { sm: { r: 18, stroke: 3, size: 44 }, md: { r: 26, stroke: 4, size: 64 }, lg: { r: 40, stroke: 5, size: 96 } }
  const d = dims[size]
  const circumference = 2 * Math.PI * d.r
  const arc = circumference * 0.75 // 270°
  const offset = arc - (arc * clamped) / 100
  const viewSize = d.size + 4

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: d.size, height: d.size }}>
        <svg width={viewSize} height={viewSize} viewBox={`0 0 ${viewSize} ${viewSize}`} className="-rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx={viewSize / 2} cy={viewSize / 2} r={d.r}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={d.stroke}
            strokeDasharray={`${arc} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx={viewSize / 2} cy={viewSize / 2} r={d.r}
            fill="none"
            stroke={clamped >= 70 ? '#34d399' : clamped >= 45 ? '#fbbf24' : '#f87171'}
            strokeWidth={d.stroke}
            strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold font-mono leading-none', color, size === 'lg' ? 'text-xl' : size === 'md' ? 'text-sm' : 'text-xs')}>
            {clamped}
          </span>
        </div>
      </div>
      {size !== 'sm' && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Edge</span>
          <span className={cn('text-[10px] font-medium', color)}>{label}</span>
        </div>
      )}
    </div>
  )
}
