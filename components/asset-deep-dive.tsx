'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Zap, BarChart3, Clock, ExternalLink, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { GoldBarIcon } from './gold-bar-icon'
import { useI18n } from '@/lib/i18n'

interface AssetDeepDiveProps {
  symbol: string
  onBack: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL LOGO — TradingView-style circular icon per pair
// ═══════════════════════════════════════════════════════════════════════════════
function SymbolLogo({ symbol }: { symbol: string }) {
  const configs: Record<string, { bg: string; fg: string; content: React.ReactNode }> = {
    'XAU/USD': {
      bg: '#C9910A',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <rect x="3" y="9" width="18" height="9" rx="2" fill="#fff" opacity="0.9"/>
          <rect x="6" y="6" width="12" height="4" rx="1.5" fill="#fff" opacity="0.7"/>
          <line x1="7" y1="11" x2="17" y2="11" stroke="#C9910A" strokeWidth="1"/>
          <line x1="7" y1="14" x2="17" y2="14" stroke="#C9910A" strokeWidth="1"/>
        </svg>
      ),
    },
    'XAG/USD': {
      bg: '#9CA3AF',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <circle cx="12" cy="12" r="6" fill="#fff" opacity="0.9"/>
          <circle cx="12" cy="12" r="3" fill="#9CA3AF"/>
        </svg>
      ),
    },
    'WTI': {
      bg: '#1a1a2e',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M12 3 C12 3 7 8 7 13 a5 5 0 0 0 10 0 C17 8 12 3 12 3z" fill="#fff" opacity="0.9"/>
        </svg>
      ),
    },
    'DXY': {
      bg: '#1d4ed8',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff" fontFamily="Arial">$</text>
        </svg>
      ),
    },
    'US30': {
      bg: '#0f172a',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <polyline points="3,17 8,10 13,14 21,6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    'US100': {
      bg: '#6d28d9',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="Arial">NDX</text>
        </svg>
      ),
    },
    'US500': {
      bg: '#0369a1',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="Arial">SPX</text>
        </svg>
      ),
    },
    'VIX': {
      bg: '#dc2626',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <polyline points="3,18 7,8 10,14 14,6 17,12 21,5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    'US10Y': {
      bg: '#064e3b',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff" fontFamily="Arial">10Y</text>
        </svg>
      ),
    },
    'EUR/USD': {
      bg: '#1e40af',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff" fontFamily="Arial">€</text>
        </svg>
      ),
    },
    'GBP/USD': {
      bg: '#be123c',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff" fontFamily="Arial">£</text>
        </svg>
      ),
    },
    'BTC/USD': {
      bg: '#f97316',
      fg: '#fff',
      content: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff" fontFamily="Arial">₿</text>
        </svg>
      ),
    },
  }

  const cfg = configs[symbol] ?? {
    bg: '#374151',
    fg: '#fff',
    content: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <polyline points="3,17 8,10 13,14 21,6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }

  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
      style={{ backgroundColor: cfg.bg }}
    >
      {cfg.content}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADINGVIEW CHART COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function TradingViewChart({ symbol, timeframe }: { symbol: string; timeframe: '1D' | '5D' | '1M' }) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Map symbol to TradingView symbol - using verified working tickers
  const tvSymbolMap: Record<string, string> = {
    'XAU/USD': 'TVC:GOLD',
    'XAG/USD': 'TVC:SILVER',
    'DXY': 'DXY',
    'US30': 'DJI',
    'US100': 'NDX',
    'US500': 'SPX',
    'WTI': 'CL1!',
    'VIX': 'VIX',
    'US10Y': 'US10Y',
    'EUR/USD': 'EURUSD',
    'GBP/USD': 'GBPUSD',
    'BTC/USD': 'BTCUSD',
  }
  
  const tvSymbol = tvSymbolMap[symbol] || symbol.replace('/', '')
  
  // Symbols that only support daily/weekly/monthly (no intraday)
  const dailyOnlySymbols = ['DXY', 'US100', 'US30', 'US500', 'WTI', 'VIX', 'US10Y', 'NDX', 'DJI', 'SPX', 'CL1!']
  const isDailyOnly = dailyOnlySymbols.includes(symbol) || dailyOnlySymbols.includes(tvSymbol)
  
  // Map timeframe to TradingView interval (use D for daily-only symbols)
  const getInterval = () => {
    if (isDailyOnly) {
      // For daily-only symbols, always use D, W, or M
      return timeframe === '1M' ? 'M' : timeframe === '5D' ? 'W' : 'D'
    }
    // For other symbols, use intraday intervals
    return timeframe === '1M' ? 'D' : timeframe === '5D' ? '60' : '15'
  }
  
  const interval = getInterval()
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Clear previous widget
    containerRef.current.innerHTML = ''
    
    // Create TradingView widget
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && containerRef.current) {
        new (window as any).TradingView.widget({
          width: '100%',
          height: 300,
          symbol: tvSymbol,
          interval: interval,
          timezone: 'Europe/Paris',
          theme: 'dark',
          style: '3', // Area chart
          locale: 'fr',
          toolbar_bg: '#0a0a0a',
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_legend: true,
          save_image: false,
          container_id: containerRef.current.id,
          backgroundColor: 'rgba(10, 10, 10, 1)',
          gridColor: 'rgba(42, 46, 57, 0.3)',
        })
      }
    }
    document.head.appendChild(script)
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [tvSymbol, timeframe])
  
  const containerId = `tv-chart-${symbol.replace('/', '-')}-${timeframe}`
  
  return (
    <div 
      ref={containerRef} 
      id={containerId}
      className="w-full h-[300px] rounded-lg overflow-hidden bg-card"
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS STORIES COMPONENT  
// ═══════════════════════════════════════════════════════════════════════════════
interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  datetime: number
  url: string
  category?: 'breaking' | 'high-impact' | 'economic' | 'geopolitical' | 'general'
  isBreaking?: boolean
  importance?: number
  relatedAssets?: { symbol: string; impact: 'up' | 'down' | 'neutral' }[]
}

const CATEGORY_CONFIG = {
  breaking:     { label: 'BREAKING',    color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'high-impact':{ label: 'HIGH IMPACT', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  geopolitical: { label: 'GEO',         color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  economic:     { label: 'MACRO',       color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  general:      { label: 'NEWS',        color: 'bg-muted text-muted-foreground border-border' },
}

function NewsStories({ symbol }: { symbol: string }) {
  const { t } = useI18n()
  const { data: newsData, isLoading } = useSWR(
    `/api/news?symbol=${encodeURIComponent(symbol)}&limit=10`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) return { items: [] }
      return res.json()
    },
    { refreshInterval: 60000, revalidateOnFocus: false }
  )
  
  const news: NewsItem[] = newsData?.items || []
  
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - (timestamp > 1e12 ? timestamp : timestamp * 1000)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getImpact = (item: NewsItem) => {
    return item.relatedAssets?.find(a => a.symbol === symbol)?.impact || 'neutral'
  }
  
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('newsStories')}</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="flex gap-2">
                <div className="h-4 w-16 bg-muted rounded-full" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
              <div className="h-3.5 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (news.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t('newsStories')}</h3>
          <span className="text-[10px] text-muted-foreground">{symbol}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('noRecentNews')} {symbol}</p>
      </div>
    )
  }
  
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t('newsStories')}</h3>
        <span className="text-[10px] text-muted-foreground">{news.length} articles</span>
      </div>
      <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1 -mr-1">
        {news.map((item, idx) => {
          const cat = CATEGORY_CONFIG[item.category || 'general']
          const impact = getImpact(item)
          const impactColor = impact === 'up' ? 'text-emerald-400' : impact === 'down' ? 'text-red-400' : 'text-muted-foreground'
          const impactArrow = impact === 'up' ? '▲' : impact === 'down' ? '▼' : '–'

          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block group py-3 transition-colors hover:bg-muted/30 -mx-1 px-1 rounded-lg",
                idx !== 0 && "border-t border-border/50"
              )}
            >
              {/* Top row: category badge + impact + time */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {item.isBreaking && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                    ● BREAKING
                  </span>
                )}
                <span className={cn(
                  "inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase",
                  cat.color
                )}>
                  {cat.label}
                </span>
                <span className={cn("text-[10px] font-bold ml-auto", impactColor)}>
                  {impactArrow}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatTimeAgo(item.datetime)}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Headline */}
              <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                {item.headline}
              </p>

              {/* Source */}
              <p className="text-[10px] text-muted-foreground mt-1">{item.source}</p>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// Edge Factor Gauge - circular score 0-100
function EdgeFactorGauge({ score, bias, description }: { score: number; bias: string; description?: string }) {
  const { t } = useI18n()
  const circumference = 2 * Math.PI * 40
  const progress = (score / 100) * circumference
  
  const getColor = () => {
    if (score >= 60) return '#10b981' // green - bullish edge
    if (score >= 40) return '#eab308' // yellow - neutral
    return '#ef4444' // red - bearish edge
  }
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg width="96" height="96" className="transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke={getColor()}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: getColor() }}>{score}</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t('edgeFactor')}</h3>
          <p className="text-xs text-primary font-medium mb-2">{bias}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description || t('technicalsMacroAligned')}
          </p>
        </div>
      </div>
    </div>
  )
}

// Market Mood Gauge - semicircle Risk-On / Risk-Off
function MarketMoodGauge({ mood, vix }: { mood: 'risk-on' | 'risk-off' | 'neutral'; vix: number }) {
  const { t } = useI18n()
  const getMoodConfig = () => {
    switch (mood) {
      case 'risk-on':
        return { label: t('riskOnSentiment'), color: '#10b981', angle: 135, descKey: 'moodRiskOnDesc' as const }
      case 'risk-off':
        return { label: t('riskOff'), color: '#ef4444', angle: 45, descKey: 'moodRiskOffDesc' as const }
      default:
        return { label: t('neutral'), color: '#eab308', angle: 90, descKey: 'moodNeutralDesc' as const }
    }
  }
  
  const config = getMoodConfig()
  // Replace {vix} placeholder in translation with actual value
  const description = (t(config.descKey) || '').replace('{vix}', vix?.toFixed(1) || '--')
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t('marketMood')}</h3>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t('live')}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Semicircle gauge */}
        <div className="relative w-20 h-12">
          <svg width="80" height="48" viewBox="0 0 80 48">
            {/* Background arc */}
            <path
              d="M 8 44 A 32 32 0 0 1 72 44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-border"
            />
            {/* Colored segments */}
            <path d="M 8 44 A 32 32 0 0 1 24 16" fill="none" stroke="#ef4444" strokeWidth="6" />
            <path d="M 24 16 A 32 32 0 0 1 56 16" fill="none" stroke="#eab308" strokeWidth="6" />
            <path d="M 56 16 A 32 32 0 0 1 72 44" fill="none" stroke="#10b981" strokeWidth="6" />
            {/* Needle */}
            <line
              x1="40" y1="44"
              x2={40 + 24 * Math.cos((config.angle * Math.PI) / 180)}
              y2={44 - 24 * Math.sin((config.angle * Math.PI) / 180)}
              stroke={config.color}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="40" cy="44" r="4" fill={config.color} />
          </svg>
        </div>
        
        <div className="flex-1">
          <p className="text-lg font-bold" style={{ color: config.color }}>{config.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{t('investorPositioning')}</p>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{description}</p>
    </div>
  )
}

// Market Policy Gauge - text based HAWKISH/DOVISH/NEUTRAL
function MarketPolicyGauge({ policy, yields }: { policy: 'hawkish' | 'dovish' | 'neutral'; yields: number }) {
  const { t } = useI18n()
  const getConfig = () => {
    switch (policy) {
      case 'hawkish':
        return { label: t('hawkish'), color: '#ef4444', descKey: 'policyHawkishDesc' as const }
      case 'dovish':
        return { label: t('dovish'), color: '#10b981', descKey: 'policyDovishDesc' as const }
      default:
        return { label: t('neutral'), color: '#eab308', descKey: 'policyNeutralDesc' as const }
    }
  }
  
  const config = getConfig()
  const description = (t(config.descKey) || '').replace('{yields}', yields?.toFixed(2) || '--')
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t('marketPolicy')}</h3>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t('live')}
        </span>
      </div>
      
      <div className="flex items-center gap-4 mb-3">
        <span className="text-2xl font-bold tracking-widest" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
      
      <h4 className="text-xs font-medium text-foreground mb-1">{t('globalEconomicOutlook')}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

// Flow Gauge - bar indicator Thin/Healthy/Crowded
function FlowGauge({ flow, bullets }: { flow: 'thin' | 'healthy' | 'crowded'; bullets?: string[] }) {
  const { t } = useI18n()
  const getPosition = () => {
    switch (flow) {
      case 'thin': return 15
      case 'healthy': return 50
      case 'crowded': return 85
    }
  }
  
  const getColor = () => {
    switch (flow) {
      case 'thin': return '#ef4444'
      case 'healthy': return '#10b981'
      case 'crowded': return '#f97316'
    }
  }
  
  const getFlowLabel = () => {
    switch (flow) {
      case 'thin': return t('thin')
      case 'healthy': return t('healthy')
      case 'crowded': return t('crowded')
    }
  }
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">{t('flow')}</h3>
      
      {/* Visual indicator */}
      <div className="flex justify-center mb-2">
        <Activity className="w-8 h-8" style={{ color: getColor() }} />
      </div>
      
      <p className="text-center text-sm font-bold mb-3" style={{ color: getColor() }}>
        {getFlowLabel()}
      </p>
      
      {/* Bar gauge */}
      <div className="relative h-2 bg-gradient-to-r from-red-500 via-green-500 to-orange-500 rounded-full mb-2">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 rounded-full transition-all"
          style={{ left: `${getPosition()}%`, borderColor: getColor() }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{t('thin')}</span>
        <span>{t('healthy')}</span>
        <span>{t('crowded')}</span>
      </div>
      
      <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground">
        {flow === 'healthy' ? (
          <><li>• {t('flowHealthy1')}</li><li>• {t('flowHealthy2')}</li><li>• {t('flowHealthy3')}</li><li>• {t('flowHealthy4')}</li></>
        ) : flow === 'thin' ? (
          <><li>• {t('flowThin1')}</li><li>• {t('flowThin2')}</li><li>• {t('flowThin3')}</li><li>• {t('flowThin4')}</li></>
        ) : (
          <><li>• {t('flowCrowded1')}</li><li>• {t('flowCrowded2')}</li><li>• {t('flowCrowded3')}</li><li>• {t('flowCrowded4')}</li></>
        )}
      </ul>
    </div>
  )
}

// Bearing Gauge - zigzag visual for trend direction
function BearingGauge({ bearing, bullets }: { bearing: 'trending-up' | 'trending-down' | 'choppy-up' | 'choppy-down' | 'ranging'; bullets?: string[] }) {
  const { t } = useI18n()
  const getConfig = () => {
    switch (bearing) {
      case 'trending-up':
        return { label: t('trendingUp'), color: '#10b981', icon: TrendingUp }
      case 'trending-down':
        return { label: t('trendingDown'), color: '#ef4444', icon: TrendingDown }
      case 'choppy-up':
        return { label: t('choppyUp'), color: '#22c55e', icon: Activity }
      case 'choppy-down':
        return { label: t('choppyDown'), color: '#f97316', icon: Activity }
      default:
        return { label: t('ranging'), color: '#eab308', icon: BarChart3 }
    }
  }
  
  const config = getConfig()
  const Icon = config.icon
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">{t('bearing')}</h3>
      
      {/* Zigzag visual */}
      <div className="flex justify-center mb-2">
        <svg width="60" height="32" viewBox="0 0 60 32">
          <polyline
            points="0,24 10,8 20,20 30,4 40,16 50,8 60,12"
            fill="none"
            stroke={config.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <p className="text-center text-sm font-bold mb-3" style={{ color: config.color }}>
        {config.label}
      </p>
      
      <ul className="space-y-1 text-[10px] text-muted-foreground">
        {bearing === 'trending-up' ? (
          <><li>• {t('bearingTrendUp1')}</li><li>• {t('bearingTrendUp2')}</li><li>• {t('bearingTrendUp3')}</li><li>• {t('bearingTrendUp4')}</li></>
        ) : bearing === 'trending-down' ? (
          <><li>• {t('bearingTrendDown1')}</li><li>• {t('bearingTrendDown2')}</li><li>• {t('bearingTrendDown3')}</li><li>• {t('bearingTrendDown4')}</li></>
        ) : bearing === 'choppy-up' || bearing === 'choppy-down' ? (
          <><li>• {t('bearingChoppy1')}</li><li>• {t('bearingChoppy2')}</li><li>• {t('bearingChoppy3')}</li><li>• {t('bearingChoppy4')}</li></>
        ) : (
          <><li>• {t('bearingRanging1')}</li><li>• {t('bearingRanging2')}</li><li>• {t('bearingRanging3')}</li><li>• {t('bearingRanging4')}</li></>
        )}
      </ul>
    </div>
  )
}

// Pulse Gauge - volatility indicator Quiet/Tradeable/Wild
function PulseGauge({ pulse, bullets }: { pulse: 'quiet' | 'tradeable' | 'wild'; bullets?: string[] }) {
  const { t } = useI18n()
  const getConfig = () => {
    switch (pulse) {
      case 'quiet':
        return { label: t('quiet'), color: '#3b82f6', position: 15 }
      case 'tradeable':
        return { label: t('tradeable'), color: '#10b981', position: 50 }
      case 'wild':
        return { label: t('wild'), color: '#ef4444', position: 85 }
    }
  }
  
  const config = getConfig()
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">{t('pulse')}</h3>
      
      {/* Heartbeat visual */}
      <div className="flex justify-center mb-2">
        <svg width="60" height="24" viewBox="0 0 60 24">
          <polyline
            points="0,12 15,12 20,4 25,20 30,12 45,12 50,8 55,16 60,12"
            fill="none"
            stroke={config.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <p className="text-center text-sm font-bold mb-3" style={{ color: config.color }}>
        {config.label}
      </p>
      
      {/* Bar gauge */}
      <div className="relative h-2 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-full mb-2">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 rounded-full transition-all"
          style={{ left: `${config.position}%`, borderColor: config.color }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{t('quiet')}</span>
        <span>{t('tradeable')}</span>
        <span>{t('wild')}</span>
      </div>
      
      <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground">
        {pulse === 'quiet' ? (
          <><li>• {t('pulseQuiet1')}</li><li>• {t('pulseQuiet2')}</li><li>• {t('pulseQuiet3')}</li><li>• {t('pulseQuiet4')}</li></>
        ) : pulse === 'tradeable' ? (
          <><li>• {t('pulseTradeable1')}</li><li>• {t('pulseTradeable2')}</li><li>• {t('pulseTradeable3')}</li><li>• {t('pulseTradeable4')}</li></>
        ) : (
          <><li>• {t('pulseWild1')}</li><li>• {t('pulseWild2')}</li><li>• {t('pulseWild3')}</li><li>• {t('pulseWild4')}</li></>
        )}
      </ul>
    </div>
  )
}

// AI Overview component with refresh button - auto-loads on mount
function AIOverview({ symbol, defaultSummary }: { symbol: string; defaultSummary: string }) {
  const { t, language } = useI18n()
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [hasLoadedAI, setHasLoadedAI] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const refreshAnalysis = useCallback(async () => {
    setIsLoading(true)
    setAnalysisError(null)
    try {
      // Normalize symbol: XAUUSD -> XAU/USD for API compatibility
      const normalizedSymbol = symbol.includes('/') ? symbol : 
        symbol === 'XAUUSD' ? 'XAU/USD' :
        symbol === 'XAGUSD' ? 'XAG/USD' :
        symbol === 'EURUSD' ? 'EUR/USD' :
        symbol === 'GBPUSD' ? 'GBP/USD' :
        symbol === 'USDJPY' ? 'USD/JPY' :
        symbol
      
      console.log('[v0] AI Analysis - fetching for:', normalizedSymbol)
      
      const res = await fetch('/api/orvyn/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: normalizedSymbol, language: 'fr' })
      })
      const data = await res.json()
      console.log('[v0] AI Analysis response:', data)
      
      if (data.error) {
        console.error('[v0] AI Analysis error:', data.error, data.details)
        setAnalysisError(data.details || data.error)
      }
      
      if (data.report) {
        setAnalysisData(data)
        setLastUpdated(new Date())
        setHasLoadedAI(true)
        setAnalysisError(null)
      }
    } catch (error) {
      console.error('[v0] Failed to refresh analysis:', error)
      setAnalysisError('Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }, [symbol])

  // Auto-load AI analysis when component mounts or symbol changes
  useEffect(() => {
    setHasLoadedAI(false)
    setAnalysisData(null)
    setExpandedSection(null)
    refreshAnalysis()
  }, [symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-primary">Analyse IA Complète</h3>
        </div>
        <button
          onClick={refreshAnalysis}
          disabled={isLoading}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            "bg-primary/10 hover:bg-primary/20 text-primary",
            "hover:scale-110 active:scale-95",
            isLoading && "animate-pulse cursor-wait"
          )}
        >
          <Brain className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </button>
      </div>
      
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
        </div>
      ) : analysisError ? (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400 font-medium">Erreur: {analysisError}</p>
          </div>
          <button
            onClick={refreshAnalysis}
            className="text-xs text-primary hover:underline"
          >
            Reessayer
          </button>
        </div>
      ) : analysisData?.report ? (
        <div className="space-y-3">
          {/* Summary */}
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">{analysisData.report.summary}</p>
          
          {/* Timeframes Grid */}
          <div className="grid grid-cols-3 gap-2">
            {analysisData.report.timeframeAnalysis && Object.entries(analysisData.report.timeframeAnalysis).map(([tf, data]: [string, any]) => {
              const biasColor = data.bias === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                              : data.bias === 'BEARISH' ? 'text-red-400 bg-red-500/10 border-red-500/20'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              return (
                <div key={tf} className={cn('rounded-lg border p-2 text-center text-[10px]', biasColor)}>
                  <div className="font-bold uppercase tracking-wider text-xs mb-1">{tf}</div>
                  <div className="font-bold">{data.bias}</div>
                  <div className="text-[8px] opacity-75 mt-0.5">{data.confidence}%</div>
                </div>
              )
            })}
          </div>

          {/* Expandable Sections */}
          <div className="space-y-1">
            {/* Cross-Asset Verdict */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'cross-asset' ? null : 'cross-asset')}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-xs"
            >
              <span className="font-semibold">🔗 Verdict Cross-Asset</span>
              <span className="text-[10px]">{expandedSection === 'cross-asset' ? '▲' : '▼'}</span>
            </button>
            {expandedSection === 'cross-asset' && (
              <div className="p-2 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed">
                {analysisData.report.crossAssetVerdict}
              </div>
            )}

            {/* Calendar Risk */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'calendar' ? null : 'calendar')}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-xs"
            >
              <span className="font-semibold">📅 Risques Calendrier</span>
              <span className="text-[10px]">{expandedSection === 'calendar' ? '▲' : '▼'}</span>
            </button>
            {expandedSection === 'calendar' && (
              <div className="p-2 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed">
                {analysisData.report.calendarRisk}
              </div>
            )}

            {/* Drivers */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'drivers' ? null : 'drivers')}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-xs"
            >
              <span className="font-semibold">📊 Drivers Bullish/Bearish</span>
              <span className="text-[10px]">{expandedSection === 'drivers' ? '▲' : '▼'}</span>
            </button>
            {expandedSection === 'drivers' && (
              <div className="p-2 bg-muted/30 rounded-lg border border-border text-xs space-y-2">
                <div>
                  <div className="font-semibold text-emerald-400 mb-1">Bullish:</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    {analysisData.report.bullishDrivers?.map((d: string, i: number) => (
                      <li key={i} className="text-[10px]">{d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-red-400 mb-1">Bearish:</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    {analysisData.report.bearishDrivers?.map((d: string, i: number) => (
                      <li key={i} className="text-[10px]">{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Risks */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'risks' ? null : 'risks')}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-xs"
            >
              <span className="font-semibold">⚠️ Risques</span>
              <span className="text-[10px]">{expandedSection === 'risks' ? '▲' : '▼'}</span>
            </button>
            {expandedSection === 'risks' && (
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-xs space-y-2">
                {analysisData.report.risks && typeof analysisData.report.risks === 'object' ? (
                  <>
                    <div>
                      <span className="font-semibold text-red-400">Principal: </span>
                      <span className="text-muted-foreground">{analysisData.report.risks.primary}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-400">Secondaire: </span>
                      <span className="text-muted-foreground">{analysisData.report.risks.secondary}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-400">Calendar: </span>
                      <span className="text-muted-foreground">{analysisData.report.risks.calendarEvents}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">{analysisData.report.risks}</span>
                )}
              </div>
            )}

            {/* Invalidation Level */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'invalidation' ? null : 'invalidation')}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-xs"
            >
              <span className="font-semibold">🎯 Niveau d'Invalidation</span>
              <span className="text-[10px]">{expandedSection === 'invalidation' ? '▲' : '▼'}</span>
            </button>
            {expandedSection === 'invalidation' && (
              <div className="p-2 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed">
                {analysisData.report.invalidation}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Analyse non disponible</p>
      )}
      
      {lastUpdated && !isLoading && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Mis à jour: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

// ─── DMA10 TRACKER ─────────────────────────────────────────────────────────────
// Full indicator based on 10DMA trading methodology
interface DMA10Data {
  currentPrice: number
  dma10: number
  distancePercent: number
  distancePoints: number
  position: 'above' | 'below'
}

function DMA10Tracker({ data }: { data: DMA10Data }) {
  const pct = data.distancePercent
  const pts = data.distancePoints
  const isAbove = data.position === 'above'
  
  // Determine zone based on distance percentage
  const getZone = () => {
    if (isAbove) {
      if (pct <= 3) return { name: 'ZONE SAINE', phase: 'healthy', color: 'emerald', advice: 'Zone ideale pour entrer ou ajouter. Risque limite, retour a la moyenne = petit drawdown.' }
      if (pct <= 5) return { name: 'ZONE ALERTE', phase: 'alert', color: 'amber', advice: 'Rapport risque/recompense degrade. Eviter d\'ajouter. Pullback de 3-5% probable.' }
      if (pct <= 7) return { name: 'CLIMAX RUN', phase: 'climax', color: 'orange', advice: 'Retour vers la moyenne probable et brutal. Prendre 25-33% de profits.' }
      return { name: 'ZONE DANGER', phase: 'danger', color: 'red', advice: 'Configuration rare. Correction de 10-20%+ possible. Smart money distribue ici.' }
    } else {
      const absPct = Math.abs(pct)
      if (absPct <= 1) return { name: 'TEST 10DMA', phase: 'test', color: 'blue', advice: 'Prix teste la 10DMA. Surveiller rebond ou cassure. Point d\'entree potentiel.' }
      if (absPct <= 3) return { name: 'SHAKEOUT', phase: 'shakeout', color: 'purple', advice: 'Shakeout sain possible! Meilleur point d\'entree du cycle si rebond avec volume.' }
      return { name: 'CASSURE', phase: 'breakdown', color: 'red', advice: 'Cassure significative. Attendre la 21EMA comme support. Stop sous 21EMA.' }
    }
  }
  
  const zone = getZone()
  
  // Color mapping
  const colors: Record<string, { bg: string; border: string; text: string; fill: string }> = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', fill: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', fill: 'bg-amber-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', fill: 'bg-orange-500' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', fill: 'bg-red-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', fill: 'bg-blue-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', fill: 'bg-purple-500' },
  }
  
  const c = colors[zone.color]
  
  // Gauge position: -10% to +10% mapped to 0-100%
  const gaugePos = Math.min(100, Math.max(0, ((pct + 10) / 20) * 100))
  
  return (
    <div className={cn('rounded-xl border p-4 mt-4', c.bg, c.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full animate-pulse', c.fill)} />
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">10DMA Tracker</span>
        </div>
        <div className={cn('px-3 py-1 rounded-full text-[10px] font-bold border', c.bg, c.border, c.text)}>
          {zone.name}
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Prix</div>
          <div className="text-sm font-bold text-zinc-200 font-mono">{data.currentPrice.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">10DMA</div>
          <div className="text-sm font-bold text-zinc-200 font-mono">{data.dma10.toFixed(2)}</div>
        </div>
        <div className={cn('rounded-lg p-2.5 text-center border', c.bg, c.border)}>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Ecart</div>
          <div className={cn('text-sm font-bold font-mono', c.text)}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
          </div>
        </div>
      </div>
      
      {/* Visual Gauge */}
      <div className="mb-4">
        <div className="relative h-3 rounded-full bg-zinc-800 overflow-visible">
          {/* Zone markers */}
          <div className="absolute inset-0 flex rounded-full overflow-hidden">
            <div className="w-[15%] bg-red-500/30" title="-10% to -3%: Cassure" />
            <div className="w-[10%] bg-purple-500/30" title="-3% to -1%: Shakeout" />
            <div className="w-[5%] bg-blue-500/30" title="-1% to 0%: Test" />
            <div className="w-[15%] bg-emerald-500/30" title="0% to +3%: Saine" />
            <div className="w-[10%] bg-amber-500/30" title="+3% to +5%: Alerte" />
            <div className="w-[10%] bg-orange-500/30" title="+5% to +7%: Climax" />
            <div className="w-[35%] bg-red-500/30" title="+7%+: Danger" />
          </div>
          {/* Center line (0% = DMA10) */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-zinc-500" />
          {/* Current position indicator */}
          <div
            className={cn('absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-zinc-900 shadow-lg transition-all duration-500', c.fill)}
            style={{ left: `${gaugePos}%` }}
          />
        </div>
        {/* Labels */}
        <div className="flex justify-between mt-1.5 text-[8px] text-zinc-500 font-mono">
          <span>-10%</span>
          <span className="text-zinc-400">0% (10DMA)</span>
          <span>+10%</span>
        </div>
      </div>
      
      {/* Distance in points */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-[10px] text-zinc-500">Distance:</span>
        <span className={cn('text-sm font-bold font-mono', c.text)}>
          {pts >= 0 ? '+' : ''}{Math.round(pts).toLocaleString()} pts
        </span>
        <span className={cn('text-[10px] font-semibold uppercase', c.text)}>
          {isAbove ? '(au-dessus)' : '(en-dessous)'}
        </span>
      </div>
      
      {/* Advice Box */}
      <div className={cn('rounded-lg border p-3', c.bg, c.border)}>
        <div className="flex items-start gap-2">
          <span className="text-base">
            {zone.phase === 'healthy' && '✅'}
            {zone.phase === 'alert' && '⚠️'}
            {zone.phase === 'climax' && '🔥'}
            {zone.phase === 'danger' && '🚨'}
            {zone.phase === 'test' && '👀'}
            {zone.phase === 'shakeout' && '💎'}
            {zone.phase === 'breakdown' && '❌'}
          </span>
          <p className={cn('text-xs leading-relaxed', c.text)}>{zone.advice}</p>
        </div>
      </div>
      
      {/* Cycle Phase indicator */}
      <div className="mt-3 pt-3 border-t border-zinc-700/50">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-zinc-500 uppercase tracking-wider">Phase du cycle</span>
          <div className="flex items-center gap-1.5">
            {['Extension', 'Pullback', 'Shakeout', 'Reprise'].map((phase, i) => {
              const isActive = 
                (zone.phase === 'healthy' && i === 3) ||
                (zone.phase === 'alert' && i === 0) ||
                (zone.phase === 'climax' && i === 0) ||
                (zone.phase === 'danger' && i === 0) ||
                (zone.phase === 'test' && i === 1) ||
                (zone.phase === 'shakeout' && i === 2) ||
                (zone.phase === 'breakdown' && i === 1)
              return (
                <span 
                  key={phase} 
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[8px] font-medium',
                    isActive ? cn(c.bg, c.text, 'border', c.border) : 'text-zinc-600 bg-zinc-800/30'
                  )}
                >
                  {phase}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── GOLD VERDICT BANNER ──────────────────────────────────────────────────────
function GoldVerdictBanner({ verdict }: { verdict: GoldVerdictData }) {
  const [expanded, setExpanded] = useState(false)

  const directionConfig = {
    Bullish: {
      label: 'BULLISH',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      dot: 'bg-emerald-400',
    },
    Bearish: {
      label: 'BEARISH',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      bar: 'bg-red-500',
      dot: 'bg-red-400',
    },
    Neutral: {
      label: 'NEUTRE',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      dot: 'bg-amber-400',
    },
  }

  const cfg = directionConfig[verdict.direction]
  const score = verdict.crossAssetScore // -100 to +100
  // Position on bar: 0% = leftmost (-100), 50% = center (0), 100% = rightmost (+100)
  const barPos = Math.round(((score + 100) / 200) * 100)
  const bullishSignals = verdict.signals.filter(s => s.impactOnGold === 'bullish')
  const bearishSignals = verdict.signals.filter(s => s.impactOnGold === 'bearish')

  return (
    <div className={cn('rounded-xl border p-4 mb-1', cfg.bg, cfg.border)}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', cfg.dot)} />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', cfg.dot)} />
          </span>
          <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase">Cross-Asset Gold Verdict</span>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border', cfg.bg, cfg.border, cfg.text)}>
          {cfg.label}
          <span className="opacity-60 font-mono">{verdict.confidence}%</span>
        </div>
      </div>

      {/* Score gauge bar */}
      <div className="relative mb-3">
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-visible">
          {/* Gradient background: red left → zinc center → green right */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/30 via-zinc-700 to-emerald-500/30" />
          {/* Center tick */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-500" />
          {/* Score indicator */}
          <div
            className={cn('absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-zinc-900 shadow-lg transition-all duration-700', cfg.dot)}
            style={{ left: `${barPos}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-red-500/60 font-mono">BEARISH -100</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: score >= 0 ? '#34d399' : '#f87171' }}>
            {score >= 0 ? '+' : ''}{score}
          </span>
          <span className="text-[9px] text-emerald-500/60 font-mono">+100 BULLISH</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
          <div className="text-base font-bold text-emerald-400">{bullishSignals.length}</div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Bullish</div>
        </div>
        <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2 text-center">
          <div className="text-base font-bold text-zinc-300">{verdict.agreement}%</div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Accord</div>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
          <div className="text-base font-bold text-red-400">{bearishSignals.length}</div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wider">Bearish</div>
        </div>
      </div>

      {/* Warning */}
      {verdict.warning && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <span className="text-amber-400 text-xs mt-px">!</span>
          <span className="text-[10px] text-amber-300">{verdict.warning}</span>
        </div>
      )}

      {/* Toggle signals */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span>Detail des signaux ({verdict.signals.length} paires)</span>
        <span className="font-mono">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {verdict.signals.map(sig => {
            const impact = sig.impactOnGold
            const impactColor = impact === 'bullish' ? 'text-emerald-400' : impact === 'bearish' ? 'text-red-400' : 'text-zinc-500'
            const impactBg = impact === 'bullish' ? 'bg-emerald-500/10 border-emerald-500/20' : impact === 'bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-800 border-zinc-700'
            const arrow = impact === 'bullish' ? '↑ GOLD' : impact === 'bearish' ? '↓ GOLD' : '→'
            return (
              <div key={sig.pairId} className={cn('flex items-center justify-between rounded-lg border px-3 py-2', impactBg)}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-300 w-16">{sig.pairId}</span>
                  <span className={cn('text-[9px] font-medium capitalize', sig.bias === 'bullish' ? 'text-emerald-400' : sig.bias === 'bearish' ? 'text-red-400' : 'text-zinc-500')}>
                    {sig.bias} {sig.confidence}%
                  </span>
                </div>
                <span className={cn('text-[9px] font-bold', impactColor)}>{arrow}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AssetDeepDive({ symbol, onBack, goldVerdict }: AssetDeepDiveProps) {
  const { t } = useI18n()
  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '5D' | '1M'>('1D')
  
  // Fetch live price data
  const { data: priceData, isLoading } = useSWR(
    `/api/pair-data?symbol=${encodeURIComponent(symbol)}`,
    (url: string) => fetch(url).then(r => r.json()),
    { refreshInterval: 30000 }
  )
  
  // Fetch deep-dive indicators
  const { data: deepDiveData } = useSWR(
    `/api/deep-dive?symbol=${encodeURIComponent(symbol)}`,
    (url: string) => fetch(url).then(r => r.json()),
    { refreshInterval: 60000 }
  )
  
  const livePrice = priceData?.price || deepDiveData?.price || 0
  const liveChange = priceData?.changePercent || deepDiveData?.change || 0

  // DMA10 - uniquement pour XAU/USD (et autres paires si besoin)
  const { data: dmaData } = useSWR(
    (symbol === 'XAU/USD' || symbol === 'XAUUSD')
      ? `/api/dma?symbol=${encodeURIComponent(symbol)}&period=10`
      : null,
    (url: string) => fetch(url).then(r => r.json()),
    { refreshInterval: 60000 }
  )
  
  // Extract deep-dive indicators with defaults
  const indicators = deepDiveData?.indicators || {}
  const edgeScore = indicators.edgeFactor?.score || 50
  const bias = indicators.edgeFactor?.bias || t('neutralBias')
  const edgeDescription = indicators.edgeFactor?.description || ''
  const aiSummary = indicators.aiOverview || t('technicalsMacroAligned')
  const mood = (indicators.marketMood?.sentiment?.toLowerCase() || 'neutral') as 'risk-on' | 'risk-off' | 'neutral'
  const vix = indicators.marketMood?.vix || 17
  const policy = (indicators.marketPolicy?.stance?.toLowerCase() || 'neutral') as 'hawkish' | 'dovish' | 'neutral'
  const yields = indicators.marketPolicy?.yields || 4.5
  const flow = (indicators.flow?.level?.toLowerCase() || 'healthy') as 'thin' | 'healthy' | 'crowded'
  const flowBullets = indicators.flow?.bullets || []
  const bearing = (indicators.bearing?.direction?.toLowerCase().replace(' ', '-') || 'ranging') as 'trending-up' | 'trending-down' | 'choppy-up' | 'choppy-down' | 'ranging'
  const bearingBullets = indicators.bearing?.bullets || []
  const pulse = (indicators.pulse?.level?.toLowerCase() || 'tradeable') as 'quiet' | 'tradeable' | 'wild'
  const pulseBullets = indicators.pulse?.bullets || []
  
  // Symbol descriptions - mapped from symbol to description
  const getSymbolDescription = () => {
    switch(symbol) {
      case 'XAU/USD': return t('goldSpotVsUSDollar')
      case 'XAG/USD': return 'Silver Spot vs US Dollar'
      case 'DXY': return 'US Dollar Index'
      case 'US30': return 'Dow Jones Industrial Average'
      case 'US100': return 'Nasdaq 100 Index'
      case 'US500': return 'S&P 500 Index'
      case 'WTI': return 'West Texas Intermediate Crude Oil'
      case 'VIX': return 'CBOE Volatility Index'
      case 'US10Y': return 'US 10-Year Treasury Yield'
      default: return symbol
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('backToDashboard')}</span>
          </button>
        </div>
      </div>
      
      {/* Main content - 2 column layout */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* LEFT COLUMN: Symbol, Chart, News */}
          <div className="lg:col-span-1 space-y-4">
            {/* Symbol header with price */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3 mb-4">
                <SymbolLogo symbol={symbol} />
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-wide">{symbol.replace('/', '')}</h1>
                  <p className="text-xs text-muted-foreground">
                    {getSymbolDescription()}
                  </p>
                </div>
              </div>
              
              {/* Price display */}
              <div className="flex items-end justify-between mb-4">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 w-24 bg-muted rounded mb-1"></div>
                    <div className="h-4 w-16 bg-muted rounded"></div>
                  </div>
                ) : livePrice ? (
                  <div>
                    <p className="text-3xl font-bold text-foreground">{livePrice.toFixed(2)}</p>
                    <p className={cn(
                      "text-sm font-medium",
                      liveChange >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {liveChange >= 0 ? '▲' : '▼'} {Math.abs(liveChange || 0).toFixed(2)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">--</p>
                )}
                
                {/* Timeframe buttons */}
                <div className="flex gap-1">
                  {(['1D', '5D', '1M'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setChartTimeframe(tf)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-colors",
                        chartTimeframe === tf 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* TradingView Chart */}
              <TradingViewChart symbol={symbol} timeframe={chartTimeframe} />
            </div>
            
            {/* News Stories */}
            <NewsStories symbol={symbol} />
            
            {/* DMA10 Tracker - Full indicator section */}
            {dmaData && !dmaData.error && (
              <DMA10Tracker data={dmaData} />
            )}

            {/* Cross-Asset Gold Verdict - tout en bas, XAU/USD uniquement */}
            {goldVerdict && (symbol === 'XAU/USD' || symbol === 'XAUUSD') && (
              <GoldVerdictBanner verdict={goldVerdict} />
            )}
          </div>
          
          {/* RIGHT COLUMN: Edge Factor, AI Overview, Indicators */}
          <div className="lg:col-span-2 space-y-4">
            {/* Edge Factor - full width */}
            <EdgeFactorGauge score={edgeScore} bias={bias} description={edgeDescription} />
            
            {/* AI Overview */}
            <AIOverview symbol={symbol} defaultSummary={aiSummary} />
            
            {/* Market Mood & Policy - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MarketMoodGauge mood={mood} vix={vix} />
            <MarketPolicyGauge policy={policy} yields={yields} />
            </div>
            
            {/* Flow, Bearing, Pulse - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FlowGauge flow={flow} bullets={flowBullets} />
              <BearingGauge bearing={bearing} bullets={bearingBullets} />
              <PulseGauge pulse={pulse} bullets={pulseBullets} />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
