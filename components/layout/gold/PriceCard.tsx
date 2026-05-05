'use client'

import { PriceData } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  priceData: PriceData | null
}

export function PriceCard({ priceData }: Props) {
  if (!priceData) {
    return (
      <div className="bg-[#1e293b] rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-[#334155] rounded w-32 mb-4" />
        <div className="h-14 bg-[#334155] rounded w-64 mb-2" />
        <div className="h-6 bg-[#334155] rounded w-48" />
      </div>
    )
  }

  const isPositive = priceData.change >= 0

  return (
    <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] rounded-xl p-6 border border-[#1f2937] shadow-lg">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <span className="text-yellow-400 text-lg">🥇</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">XAU/USD</h1>
            <p className="text-xs text-[#8a8a8a]">Or / Dollar Américain</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#8a8a8a]">
            {new Date(priceData.timestamp * 1000).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Live</span>
          </div>
        </div>
      </div>

      {/* Prix principal */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-5xl font-mono font-bold text-white">
          {priceData.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className={cn(
          'flex items-center gap-1 text-lg font-mono font-semibold',
          isPositive ? 'text-green-400' : 'text-red-400'
        )}>
          <span>{isPositive ? '▲' : '▼'}</span>
          <span>{isPositive ? '+' : ''}{priceData.change.toFixed(2)}</span>
          <span className="text-base">
            ({isPositive ? '+' : ''}{priceData.changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* OHLC */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open',   value: priceData.open },
          { label: 'High',   value: priceData.high },
          { label: 'Low',    value: priceData.low },
          { label: 'Volume', value: null, raw: priceData.volume.toLocaleString('fr-FR') },
        ].map((item) => (
          <div key={item.label} className="bg-[#0f172a] rounded-lg p-3">
            <p className="text-xs text-[#8a8a8a] mb-1">{item.label}</p>
            <p className={cn(
              'text-sm font-mono font-semibold',
              item.label === 'High' ? 'text-green-400' :
              item.label === 'Low'  ? 'text-red-400'   : 'text-white'
            )}>
              {item.raw ?? item.value?.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}