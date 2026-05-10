'use client'

import useSWR from 'swr'
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BiasIndicator } from './BiasIndicator'
import { EdgeFactorGauge } from './EdgeFactorGauge'
import { MoodGauge, PulseGauge, FlowGauge, TrendGauge } from './MiniGauges'
import { AIInsight } from './AIInsight'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface PairDetailViewProps {
  pairId: string
  onBack: () => void
}

export function PairDetailView({ pairId, onBack }: PairDetailViewProps) {
  const { data, isLoading, mutate } = useSWR(`/api/desk/${pairId}`, fetcher, { revalidateOnFocus: false, refreshInterval: 120000 })
  const { data: newsData, isLoading: newsLoading } = useSWR(`/api/desk/${pairId}/news`, fetcher, { revalidateOnFocus: false })

  if (isLoading) return <PairDetailSkeleton onBack={onBack} />
  if (!data || data.error) return (
    <div className="p-6 flex items-center gap-3">
      <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
      <span className="text-red-400 text-sm">Paire introuvable: {pairId}</span>
    </div>
  )

  const { config, price, analysis, correlations, macro } = data
  const isUp = price.changePercent >= 0

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white">{config.displayName}</h1>
              <span className="text-xs text-zinc-500">{config.fullName}</span>
            </div>
          </div>
          <button onClick={() => mutate()} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Price + Edge + Bias */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-4xl font-mono font-bold text-white">
                {price.price > 0 ? price.price.toFixed(config.precision) : '—'}
              </span>
              <div className="flex flex-col">
                <span className={cn('text-lg font-mono font-bold', isUp ? 'text-emerald-400' : 'text-red-400')}>
                  {isUp ? '+' : ''}{price.changePercent.toFixed(2)}%
                </span>
                <span className={cn('text-sm font-mono', isUp ? 'text-emerald-400/70' : 'text-red-400/70')}>
                  {isUp ? '+' : ''}{price.change.toFixed(config.precision)}
                </span>
              </div>
            </div>
            {/* High / Low */}
            {(price.high24h || price.low24h) && (
              <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                {price.high24h && <span>H: <span className="text-zinc-300">{price.high24h.toFixed(config.precision)}</span></span>}
                {price.low24h && <span>L: <span className="text-zinc-300">{price.low24h.toFixed(config.precision)}</span></span>}
                {price.open && <span>O: <span className="text-zinc-300">{price.open.toFixed(config.precision)}</span></span>}
              </div>
            )}
            <div className="text-[10px] text-zinc-700 font-mono mt-1">{price.source}</div>
          </div>
          <EdgeFactorGauge value={analysis.edgeFactor} size="lg" />
        </div>

        {/* Bias Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Swing Trading</div>
            <BiasIndicator level={analysis.bias.swing.level} confidence={analysis.bias.swing.confidence} />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Day Trading</div>
            <BiasIndicator level={analysis.bias.day.level} confidence={analysis.bias.day.confidence} />
          </div>
        </div>

        {/* Gauges: Mood, Pulse, Flow, Trend */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Métriques de marché</div>
          <MoodGauge mood={analysis.mood} />
          <PulseGauge pulse={analysis.pulse} />
          <FlowGauge flow={analysis.flow} />
          <TrendGauge trend={analysis.trend} />
        </div>

        {/* Macro Context */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Contexte Macro</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Fed Funds', value: macro.fedFundsRate, suffix: '%' },
              { label: 'US 10Y', value: macro.us10y, suffix: '%' },
              { label: 'Real Rate', value: macro.realRate10y, suffix: '%' },
              { label: 'CPI', value: macro.cpi, suffix: '' },
              { label: 'DXY', value: macro.dxy, suffix: '' },
              { label: 'VIX', value: macro.vix, suffix: '' },
              { label: '2Y-10Y', value: macro.yieldCurve2y10y, suffix: '%' },
            ].map(({ label, value, suffix }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">{label}</span>
                <span className="text-xs font-mono text-zinc-200">
                  {value != null ? `${value.toFixed(2)}${suffix}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Correlated Pairs */}
        {correlations?.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Corrélations</div>
            <div className="flex flex-wrap gap-2">
              {correlations.map((c: any) => (
                <div key={c.pairId} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5">
                  <span className="text-xs font-medium text-zinc-300">{c.pairId}</span>
                  <span className={cn('text-[10px] font-mono font-bold', c.correlation > 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {c.correlation > 0 ? '+' : ''}{c.correlation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight */}
        <AIInsight pairId={pairId} />

        {/* News */}
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">News récentes</div>
          {newsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900 animate-pulse" />)}
            </div>
          ) : newsData?.news?.length > 0 ? (
            <div className="space-y-2">
              {newsData.news.map((n: any) => (
                <a
                  key={n.uuid}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-zinc-200 leading-relaxed group-hover:text-white transition-colors line-clamp-2">{n.title}</p>
                    <ExternalLink className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-zinc-500">{n.source}</span>
                    <span className="text-[9px] text-zinc-600">{n.publishedAgo}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 italic">Aucune news disponible</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PairDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
        <div className="h-5 w-32 rounded bg-zinc-800 animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-900 animate-pulse" />)}
      </div>
    </div>
  )
}
