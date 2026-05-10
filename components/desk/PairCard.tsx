'use client'

import { cn } from '@/lib/utils'
import { EdgeFactorGauge } from './EdgeFactorGauge'
import { Newspaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BiasLevel, PairPrice } from '@/lib/pairs/types'

interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  datetime: number
  url: string
  category: 'breaking' | 'high-impact' | 'economic' | 'geopolitical' | 'general'
  relatedAssets: { symbol: string; impact: 'up' | 'down' | 'neutral' }[]
  isBreaking: boolean
  importance: number
}

interface PairCardProps {
  id: string
  displayName: string
  fullName: string
  category: string
  precision: number
  price: PairPrice
  swingBias: { level: BiasLevel; confidence: number }
  dayBias: { level: BiasLevel; confidence: number }
  edgeFactor: number
  onClick: () => void
  isActive?: boolean
}

const BIAS_DOT_COLOR: Record<string, string> = {
  'Strongly Bullish': 'bg-emerald-400',
  'Bullish':          'bg-emerald-400',
  'Neutral':          'bg-amber-400',
  'Bearish':          'bg-red-500',
  'Strongly Bearish': 'bg-red-500',
}

const BIAS_LABEL_COLOR: Record<string, string> = {
  'Strongly Bullish': 'text-emerald-400',
  'Bullish':          'text-emerald-400',
  'Neutral':          'text-amber-400',
  'Bearish':          'text-red-400',
  'Strongly Bearish': 'text-red-400',
}

const BIAS_BADGE_BG: Record<string, string> = {
  'Strongly Bullish': 'border-emerald-500/30 bg-emerald-500/10',
  'Bullish':          'border-emerald-500/30 bg-emerald-500/10',
  'Neutral':          'border-zinc-600/60 bg-zinc-800/60',
  'Bearish':          'border-red-500/40 bg-red-500/10',
  'Strongly Bearish': 'border-red-500/40 bg-red-500/10',
}

const BIAS_ARROW: Record<string, string> = {
  'Strongly Bullish': ' ↗',
  'Bullish':          ' ↑',
  'Neutral':          '',
  'Bearish':          ' ↘',
  'Strongly Bearish': ' ↓↓',
}

const BIAS_CONFIDENCE_COLOR: Record<string, string> = {
  'Strongly Bullish': 'bg-emerald-400',
  'Bullish':          'bg-emerald-400',
  'Neutral':          'bg-amber-400',
  'Bearish':          'bg-red-500',
  'Strongly Bearish': 'bg-red-500',
}

const CATEGORY_COLORS: Record<string, string> = {
  metal: 'text-amber-400',
  forex: 'text-sky-400',
  commodity: 'text-orange-400',
  index: 'text-violet-400',
  rate: 'text-teal-400',
  volatility: 'text-red-400',
}

export function PairCard({ id, displayName, fullName, category, precision, price, swingBias, dayBias, edgeFactor, onClick, isActive }: PairCardProps) {
  const isUp = price.changePercent >= 0
  const catColor = CATEGORY_COLORS[category] || 'text-zinc-400'
  
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)

  // Fetch related news when card is active
  useEffect(() => {
    if (!isActive || newsLoading) return
    
    setNewsLoading(true)
    fetch(`/api/desk/pair-news?pair=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.news && Array.isArray(data.news)) {
          setNews(data.news)
        }
      })
      .catch(err => console.error('[PairCard] News fetch error:', err))
      .finally(() => setNewsLoading(false))
  }, [id, isActive])

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all duration-200',
        'hover:border-zinc-600 hover:bg-zinc-800/60',
        isActive
          ? 'border-violet-500/50 bg-zinc-800/80 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
          : 'border-zinc-800 bg-zinc-900/60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white">{displayName}</span>
            <span className={cn('text-[9px] uppercase tracking-widest font-medium', catColor)}>{category}</span>
          </div>
          <p className="text-[10px] text-zinc-500 truncate">{fullName}</p>
        </div>
        <EdgeFactorGauge value={edgeFactor} size="sm" />
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-mono font-bold text-white">
          {price.price > 0 ? price.price.toFixed(precision) : '—'}
        </span>
        {price.price > 0 && (
          <span className={cn('text-xs font-mono font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
            {isUp ? '+' : ''}{price.changePercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Bias badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        {/* Swing badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium',
          BIAS_BADGE_BG[swingBias.level] || 'border-zinc-600/60 bg-zinc-800/60'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', BIAS_DOT_COLOR[swingBias.level] || 'bg-zinc-400')} />
          <span className="text-zinc-400 uppercase tracking-wider text-[9px]">Swing Trading</span>
          <span className={cn('font-semibold', BIAS_LABEL_COLOR[swingBias.level] || 'text-zinc-300')}>
            {swingBias.level}{BIAS_ARROW[swingBias.level]}
          </span>
          <span className="text-zinc-500">({swingBias.confidence}%)</span>
        </div>

        {/* Day badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium',
          BIAS_BADGE_BG[dayBias.level] || 'border-zinc-600/60 bg-zinc-800/60'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', BIAS_DOT_COLOR[dayBias.level] || 'bg-zinc-400')} />
          <span className="text-zinc-400 uppercase tracking-wider text-[9px]">Day Trading</span>
          <span className={cn('font-semibold', BIAS_LABEL_COLOR[dayBias.level] || 'text-zinc-300')}>
            {dayBias.level}{BIAS_ARROW[dayBias.level]}
          </span>
          <span className="text-zinc-500">({dayBias.confidence}%)</span>
        </div>
      </div>

      {/* Confidence bar (Swing) */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-zinc-500">Confiance (Swing)</span>
          <span className="text-[9px] text-zinc-400 font-mono">{swingBias.confidence}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', BIAS_CONFIDENCE_COLOR[swingBias.level] || 'bg-zinc-500')}
            style={{ width: `${swingBias.confidence}%` }}
          />
        </div>
      </div>

      {/* News Section - Only show if active */}
      {isActive && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[9px] font-semibold text-zinc-300 uppercase">News Impact</span>
            {news.length > 0 && <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">{news.length}</span>}
          </div>
          {news.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {news.slice(0, 3).map(item => (
                <div key={item.id} className="p-2 rounded border border-zinc-700/50 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors cursor-pointer" onClick={() => item.url && window.open(item.url, '_blank', 'noopener,noreferrer')}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[8px] font-medium text-white leading-tight flex-1">{item.headline}</p>
                    <div className="flex gap-1 shrink-0">
                      {item.isBreaking && <span className="text-[7px] bg-red-500/30 text-red-300 px-1 py-0.5 rounded uppercase font-bold">BREAK</span>}
                      <span className={cn('text-[7px] px-1 py-0.5 rounded uppercase font-bold', {
                        'bg-emerald-500/20 text-emerald-300': item.category === 'geopolitical',
                        'bg-orange-500/20 text-orange-300': item.category === 'economic',
                        'bg-violet-500/20 text-violet-300': item.category === 'high-impact',
                      })}>{item.category}</span>
                    </div>
                  </div>
                  <p className="text-[7px] text-zinc-400 leading-tight truncate">{item.source} • {new Date(item.datetime).toLocaleString('fr-FR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[8px] text-zinc-600 italic">Pas de news directement liées</p>
          )}
        </div>
      )}

      {/* Source */}
      <div className="mt-2 text-[9px] text-zinc-700 font-mono">{price.source}</div>
    </button>
  )
}

// Skeleton
export function PairCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded bg-zinc-800" />
          <div className="h-3 w-36 rounded bg-zinc-800" />
        </div>
        <div className="w-11 h-11 rounded-full bg-zinc-800" />
      </div>
      <div className="h-7 w-32 rounded bg-zinc-800 mb-3" />
      <div className="flex gap-2">
        <div className="h-5 w-24 rounded-full bg-zinc-800" />
        <div className="h-5 w-24 rounded-full bg-zinc-800" />
      </div>
    </div>
  )
}
