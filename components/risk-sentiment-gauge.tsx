'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface RiskSentimentGaugeProps {
  us30Change?: number
  us100Change?: number
  dxyChange?: number
  goldChange?: number
}

export function RiskSentimentGauge({
  us30Change = 0,
  us100Change = 0,
  dxyChange = 0,
  goldChange = 0,
}: RiskSentimentGaugeProps) {
  const { score, label, contributors } = useMemo(() => {
    let s = 50
    const items: Array<{ name: string; value: number }> = []

    // US100 (Nasdaq) - Risk indicator: up = risk on, down = risk off
    if (us100Change !== 0) {
      const impact = Math.max(-15, Math.min(15, us100Change * 5))
      s += impact
      items.push({ name: `Nasdaq ${us100Change > 0 ? '+' : ''}${us100Change.toFixed(2)}%`, value: impact })
    }

    // US30 (Dow Jones) - Risk indicator
    if (us30Change !== 0) {
      const impact = Math.max(-12, Math.min(12, us30Change * 4))
      s += impact
      items.push({ name: `Dow ${us30Change > 0 ? '+' : ''}${us30Change.toFixed(2)}%`, value: impact })
    }

    // DXY inversed - Dollar up = risk off (bad for gold)
    if (dxyChange !== 0) {
      const impact = Math.max(-15, Math.min(15, -dxyChange * 5))
      s += impact
      items.push({ name: `DXY ${dxyChange > 0 ? '+' : ''}${dxyChange.toFixed(2)}%`, value: impact })
    }

    // Gold - Up = flight to safety
    if (goldChange !== 0) {
      const impact = Math.max(-10, Math.min(10, goldChange * 3))
      s += impact
      items.push({ name: `Or ${goldChange > 0 ? '+' : ''}${goldChange.toFixed(2)}%`, value: impact })
    }

    const finalScore = Math.round(Math.max(0, Math.min(100, s)))

    let lbl: string
    if (finalScore <= 25) lbl = 'Risk Off'
    else if (finalScore <= 45) lbl = 'Prudent'
    else if (finalScore <= 55) lbl = 'Neutre'
    else if (finalScore <= 75) lbl = 'Optimiste'
    else lbl = 'Risk On'

    const top3 = items.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3)

    return { score: finalScore, label: lbl, contributors: top3 }
  }, [us30Change, us100Change, dxyChange, goldChange])

  // Needle angle: score 0 = -90deg (left), score 100 = +90deg (right)
  const needleAngle = (score / 100) * 180 - 90

  // Label color
  const labelColor =
    score <= 20 ? '#ef4444'
    : score <= 40 ? '#f97316'
    : score <= 60 ? '#eab308'
    : score <= 80 ? '#84cc16'
    : '#22c55e'

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center h-full">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sentiment de Marche</h3>

      {/* Speedometer SVG — semi-circular, CNN Fear & Greed style */}
      <div className="relative w-full max-w-[200px]">
        <svg viewBox="0 0 200 115" className="w-full overflow-visible">
          <defs>
            {/* Gradient arc segments */}
            {/* We draw 5 colored arc segments from left to right */}
          </defs>

          {/* Arc segments — each ~36deg of 180deg total */}
          {/* Segment 1: Extreme Fear — red (0-20%) */}
          <path
            d="M 25 100 A 75 75 0 0 1 47.5 43.4"
            fill="none" stroke="#991b1b" strokeWidth="14" strokeLinecap="butt"
          />
          {/* Segment 2: Fear — orange (20-40%) */}
          <path
            d="M 47.5 43.4 A 75 75 0 0 1 100 25"
            fill="none" stroke="#c2410c" strokeWidth="14" strokeLinecap="butt"
          />
          {/* Segment 3: Neutral — yellow (40-60%) */}
          <path
            d="M 100 25 A 75 75 0 0 1 152.5 43.4"
            fill="none" stroke="#854d0e" strokeWidth="14" strokeLinecap="butt"
          />
          {/* Segment 4: Greed — light green (60-80%) */}
          <path
            d="M 152.5 43.4 A 75 75 0 0 1 175 100"
            fill="none" stroke="#3f6212" strokeWidth="14" strokeLinecap="butt"
          />
          {/* Thin tick marks on arc */}
          {[0, 20, 40, 60, 80, 100].map((pct) => {
            const angleDeg = (pct / 100) * 180 - 90
            const rad = (angleDeg * Math.PI) / 180
            const r1 = 68, r2 = 82
            const x1 = 100 + r1 * Math.cos(rad)
            const y1 = 100 + r1 * Math.sin(rad)
            const x2 = 100 + r2 * Math.cos(rad)
            const y2 = 100 + r2 * Math.sin(rad)
            return (
              <line
                key={pct}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#1a1a2e" strokeWidth="2"
              />
            )
          })}

          {/* Active score dot on arc */}
          {(() => {
            const angleDeg = (score / 100) * 180 - 90
            const rad = (angleDeg * Math.PI) / 180
            const r = 75
            const cx = 100 + r * Math.cos(rad)
            const cy = 100 + r * Math.sin(rad)
            return (
              <circle
                cx={cx} cy={cy} r="6"
                fill={labelColor}
                stroke="#0a0a0f" strokeWidth="2"
              />
            )
          })()}

          {/* Needle */}
          <g transform={`rotate(${needleAngle}, 100, 100)`}>
            <line
              x1="100" y1="100"
              x2="100" y2="32"
              stroke={labelColor} strokeWidth="2.5" strokeLinecap="round"
            />
          </g>

          {/* Center pivot circle */}
          <circle cx="100" cy="100" r="5" fill={labelColor} />

          {/* Score text */}
          <text
            x="100" y="90"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill={labelColor}
          >
            {score}
          </text>
        </svg>

        {/* Label under arc */}
        <div
          className="mt-1 text-center text-sm font-semibold px-4 py-1.5 rounded-full mx-auto w-fit"
          style={{ color: labelColor, background: `${labelColor}20`, border: `1px solid ${labelColor}40` }}
        >
          {label}
        </div>
      </div>

      {/* Contributors */}
      {contributors.length > 0 && (
        <div className="w-full mt-3 space-y-1">
          {contributors.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-2 py-1 rounded bg-muted/30 text-xs"
            >
              <span className="text-muted-foreground truncate">{c.name}</span>
              <span className={cn('font-medium ml-2 tabular-nums', c.value > 0 ? 'text-emerald-400' : 'text-red-400')}>
                {c.value > 0 ? '+' : ''}{c.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
