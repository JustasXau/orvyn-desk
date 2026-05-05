'use client'

import { PriceData } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  prices: Record<string, PriceData> | null
}

const CORRELATIONS = [
  { key: 'DXY',    name: 'Dollar Index', type: 'inverse', icon: '💵' },
  { key: 'US10Y',  name: 'Taux 10 ans',  type: 'inverse', icon: '📈' },
  { key: 'XAGUSD', name: 'Argent',        type: 'direct',  icon: '🥈' },
  { key: 'VIX',    name: 'Volatilité',    type: 'direct',  icon: '⚡' },
  { key: 'SP500',  name: 'S&P 500',       type: 'inverse', icon: '📊' },
  { key: 'US100',  name: 'Nasdaq',        type: 'inverse', icon: '💻' },
]

export function CorrelationsGrid({ prices }: Props) {
  if (!prices) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CORRELATIONS.map((c) => (
          <div key={c.key} className="bg-[#1e293b] rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-[#334155] rounded w-16 mb-2" />
            <div className="h-6 bg-[#334155] rounded w-20 mb-1" />
            <div className="h-3 bg-[#334155] rounded w-12" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {CORRELATIONS.map((corr) => {
        const data = prices[corr.key]
        if (!data) return null

        const change = data.changePct ?? 0
        const isUp = change >= 0

        // Impact sur le gold
        const goldImpact = corr.type === 'inverse'
          ? (isUp ? 'bearish' : 'bullish')
          : (isUp ? 'bullish' : 'bearish')

        const impactColor = goldImpact === 'bullish' ? 'text-green-400' : 'text-red-400'
        const impactArrow = goldImpact === 'bullish' ? '↑ Gold' : '↓ Gold'
        const impactBg    = goldImpact === 'bullish' ? 'bg-green-400/10' : 'bg-red-400/10'

        return (
          <div
            key={corr.key}
            className={cn(
              'rounded-lg p-3 border border-[#1f2937] transition-all',
              impactBg
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8a8a8a]">{corr.icon}</span>
              <span className={cn('text-xs font-bold', impactColor)}>
                {impactArrow}
              </span>
            </div>
            <div className="font-bold text-sm text-white">{corr.key}</div