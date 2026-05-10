'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Target, BarChart3 } from 'lucide-react'
import { useState } from 'react'

interface CrossAssetSignal {
  pairId: string
  bias: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  impactOnGold: 'bullish' | 'bearish' | 'neutral'
  weight: number
}

interface GoldVerdictData {
  direction: 'Bullish' | 'Bearish' | 'Neutral'
  confidence: number
  crossAssetScore: number
  signals: CrossAssetSignal[]
  agreement: number
  warning?: string
}

const PAIR_LABELS: Record<string, { label: string; icon: string }> = {
  'DXY': { label: 'Dollar Index', icon: '$' },
  'US10Y': { label: 'Treasury 10Y', icon: '10Y' },
  'US02Y': { label: 'Treasury 2Y', icon: '2Y' },
  'VIX': { label: 'Volatility', icon: 'V' },
  'USDJPY': { label: 'Dollar/Yen', icon: '¥' },
  'XAGUSD': { label: 'Silver', icon: 'Ag' },
  'US500': { label: 'S&P 500', icon: 'SPX' },
  'GOLDSILVER': { label: 'Au/Ag Ratio', icon: 'R' },
}

export function GoldVerdict({ verdict }: { verdict: GoldVerdictData }) {
  const [expanded, setExpanded] = useState(false)
  
  if (!verdict) return null
  
  const bullishSignals = verdict.signals.filter(s => s.impactOnGold === 'bullish')
  const bearishSignals = verdict.signals.filter(s => s.impactOnGold === 'bearish')
  const neutralSignals = verdict.signals.filter(s => s.impactOnGold === 'neutral')
  
  const scorePosition = Math.min(100, Math.max(0, (verdict.crossAssetScore + 100) / 2))
  
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
      
      {/* Header */}
      <div className="relative px-5 py-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Cross-Asset Gold Verdict</h3>
              <p className="text-[10px] text-zinc-500">Analyse croisee de {verdict.signals.length} paires</p>
            </div>
          </div>
          
          {/* Main Verdict Badge */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm',
            verdict.direction === 'Bullish' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
            verdict.direction === 'Bearish' && 'bg-red-500/10 border-red-500/30 text-red-400',
            verdict.direction === 'Neutral' && 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
          )}>
            {verdict.direction === 'Bullish' && <TrendingUp className="w-5 h-5" />}
            {verdict.direction === 'Bearish' && <TrendingDown className="w-5 h-5" />}
            {verdict.direction === 'Neutral' && <Minus className="w-5 h-5" />}
            <span className="text-base font-bold">{verdict.direction}</span>
            <span className="text-sm opacity-70">{verdict.confidence}%</span>
          </div>
        </div>
      </div>
      
      {/* Score Gauge */}
      <div className="px-5 py-4 space-y-3">
        {/* Warning */}
        {verdict.warning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] text-amber-300">{verdict.warning}</span>
          </div>
        )}
        
        {/* Score Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-red-400 font-medium">BEARISH</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-zinc-300 font-mono font-bold">
                {verdict.crossAssetScore > 0 ? '+' : ''}{verdict.crossAssetScore}
              </span>
            </div>
            <span className="text-emerald-400 font-medium">BULLISH</span>
          </div>
          
          {/* Gauge Track */}
          <div className="relative h-3 rounded-full bg-zinc-800 overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 via-zinc-700 to-emerald-500/30" />
            
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-500 -translate-x-1/2 z-10" />
            
            {/* Score indicator */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg shadow-amber-500/50 transition-all duration-700 ease-out z-20"
              style={{ left: `calc(${scorePosition}% - 8px)` }}
            />
            
            {/* Fill bar */}
            <div 
              className={cn(
                'absolute top-0 bottom-0 transition-all duration-500',
                verdict.crossAssetScore >= 0 
                  ? 'left-1/2 bg-gradient-to-r from-emerald-500/50 to-emerald-400/80' 
                  : 'right-1/2 bg-gradient-to-l from-red-500/50 to-red-400/80'
              )}
              style={{ 
                width: `${Math.abs(verdict.crossAssetScore) / 2}%`,
              }}
            />
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
            <div className="text-lg font-bold text-emerald-400">{bullishSignals.length}</div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Bullish</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-center">
            <div className={cn(
              'text-lg font-bold',
              verdict.agreement > 70 ? 'text-emerald-400' : verdict.agreement > 50 ? 'text-amber-400' : 'text-red-400'
            )}>
              {verdict.agreement}%
            </div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Accord</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
            <div className="text-lg font-bold text-red-400">{bearishSignals.length}</div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Bearish</div>
          </div>
        </div>
      </div>
      
      {/* Expandable Signals */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-2.5 border-t border-zinc-800/50 flex items-center justify-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 transition-colors"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>{expanded ? 'Masquer' : 'Voir'} les signaux par paire</span>
        <span className={cn('transition-transform', expanded && 'rotate-180')}>▼</span>
      </button>
      
      {expanded && (
        <div className="px-5 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Bullish Signals */}
          {bullishSignals.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Signaux Bullish pour Gold
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {bullishSignals.map(s => (
                  <SignalPill key={s.pairId} signal={s} type="bullish" />
                ))}
              </div>
            </div>
          )}
          
          {/* Bearish Signals */}
          {bearishSignals.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3" />
                Signaux Bearish pour Gold
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {bearishSignals.map(s => (
                  <SignalPill key={s.pairId} signal={s} type="bearish" />
                ))}
              </div>
            </div>
          )}
          
          {/* Neutral Signals */}
          {neutralSignals.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                Signaux Neutres
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {neutralSignals.map(s => (
                  <SignalPill key={s.pairId} signal={s} type="neutral" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SignalPill({ signal, type }: { signal: CrossAssetSignal; type: 'bullish' | 'bearish' | 'neutral' }) {
  const info = PAIR_LABELS[signal.pairId] || { label: signal.pairId, icon: '?' }
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors',
      type === 'bullish' && 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10',
      type === 'bearish' && 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10',
      type === 'neutral' && 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800',
    )}>
      <div className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold',
        type === 'bullish' && 'bg-emerald-500/20 text-emerald-400',
        type === 'bearish' && 'bg-red-500/20 text-red-400',
        type === 'neutral' && 'bg-zinc-700 text-zinc-400',
      )}>
        {info.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-zinc-200 truncate">{info.label}</div>
        <div className={cn(
          'text-[9px]',
          type === 'bullish' && 'text-emerald-400/70',
          type === 'bearish' && 'text-red-400/70',
          type === 'neutral' && 'text-zinc-500',
        )}>
          {signal.bias === 'bullish' ? '↑' : signal.bias === 'bearish' ? '↓' : '–'} {signal.confidence}%
        </div>
      </div>
    </div>
  )
}
