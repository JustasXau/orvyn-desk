'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { AlertCircle, TrendingUp, TrendingDown, X, ChevronRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AffectedAsset {
  symbol: string
  impact: 'up' | 'down'
  name: string
}

interface BreakingNews {
  id: string
  headline: string
  summary: string
  timestamp: Date
  severity: 'critical' | 'high' | 'medium'
  affectedAssets: AffectedAsset[]
  source: string
}

// Asset impact analysis based on news keywords
const GEOPOLITICAL_IMPACTS: Record<string, AffectedAsset[]> = {
  'hormuz|iran|middle east|oil embargo|persian gulf': [
    { symbol: 'CLUSD', impact: 'up', name: 'Petrole WTI' },
    { symbol: 'XAU/USD', impact: 'up', name: 'Or' },
    { symbol: 'ESUSD', impact: 'down', name: 'S&P 500' },
    { symbol: 'NQUSD', impact: 'down', name: 'Nasdaq' },
    { symbol: 'VIX', impact: 'up', name: 'VIX' },
    { symbol: 'DXY', impact: 'up', name: 'Dollar' },
  ],
  'russia|ukraine|nato|sanctions': [
    { symbol: 'NGAS', impact: 'up', name: 'Gaz Naturel' },
    { symbol: 'XAU/USD', impact: 'up', name: 'Or' },
    { symbol: 'EUR/USD', impact: 'down', name: 'EUR/USD' },
    { symbol: 'US30', impact: 'down', name: 'Dow Jones' },
  ],
  'china|taiwan|trade war|tariff': [
    { symbol: 'US100', impact: 'down', name: 'Nasdaq' },
    { symbol: 'USD/CNH', impact: 'up', name: 'USD/CNH' },
    { symbol: 'AUD/USD', impact: 'down', name: 'AUD/USD' },
    { symbol: 'COPPER', impact: 'down', name: 'Cuivre' },
  ],
  'fed|fomc|rate hike|rate cut|powell|inflation': [
    { symbol: 'DXY', impact: 'up', name: 'Dollar' },
    { symbol: 'XAU/USD', impact: 'down', name: 'Or' },
    { symbol: 'US30', impact: 'down', name: 'Dow Jones' },
    { symbol: 'EUR/USD', impact: 'down', name: 'EUR/USD' },
  ],
  'ecb|lagarde|eurozone': [
    { symbol: 'EUR/USD', impact: 'up', name: 'EUR/USD' },
    { symbol: 'GER40', impact: 'up', name: 'DAX' },
    { symbol: 'DXY', impact: 'down', name: 'Dollar' },
  ],
  'boj|japan|yen|kuroda|ueda': [
    { symbol: 'USD/JPY', impact: 'down', name: 'USD/JPY' },
    { symbol: 'JPN225', impact: 'up', name: 'Nikkei' },
  ],
  'crypto|bitcoin|btc|ethereum|sec crypto': [
    { symbol: 'BTC/USD', impact: 'up', name: 'Bitcoin' },
    { symbol: 'ETH/USD', impact: 'up', name: 'Ethereum' },
  ],
}

// Detect affected assets based on news content
function detectAffectedAssets(headline: string, summary: string): AffectedAsset[] {
  const text = `${headline} ${summary}`.toLowerCase()
  const assets: AffectedAsset[] = []
  const seen = new Set<string>()

  for (const [patterns, impacts] of Object.entries(GEOPOLITICAL_IMPACTS)) {
    const patternList = patterns.split('|')
    if (patternList.some(p => text.includes(p))) {
      for (const asset of impacts) {
        if (!seen.has(asset.symbol)) {
          seen.add(asset.symbol)
          
          // Check for negative sentiment that might reverse the impact
          const negativeWords = ['ease', 'calm', 'resolve', 'peace', 'deal', 'agreement', 'lower']
          const hasNegative = negativeWords.some(w => text.includes(w))
          
          assets.push({
            ...asset,
            impact: hasNegative ? (asset.impact === 'up' ? 'down' : 'up') : asset.impact
          })
        }
      }
    }
  }

  return assets.slice(0, 6) // Max 6 assets
}

// Detect severity based on keywords
function detectSeverity(headline: string): BreakingNews['severity'] {
  const text = headline.toLowerCase()
  const criticalWords = ['war', 'attack', 'emergency', 'crash', 'collapse', 'crisis', 'urgent']
  const highWords = ['breaking', 'flash', 'alert', 'just in', 'developing']
  
  if (criticalWords.some(w => text.includes(w))) return 'critical'
  if (highWords.some(w => text.includes(w))) return 'high'
  return 'medium'
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function BreakingNewsBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { data } = useSWR('/api/news?breaking=true', fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds for breaking news
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  })

  // Process news to find breaking ones with impact
  const breakingNews: BreakingNews[] = (data?.news || [])
    .filter((item: any) => {
      const text = `${item.headline} ${item.summary}`.toLowerCase()
      // Filter for high-impact geopolitical/economic news
      const impactKeywords = [
        'trump', 'biden', 'war', 'military', 'attack', 'sanctions', 
        'fed', 'rate', 'inflation', 'crisis', 'breaking', 'urgent',
        'oil', 'iran', 'china', 'russia', 'ecb', 'boj', 'fomc'
      ]
      return impactKeywords.some(k => text.includes(k))
    })
    .map((item: any) => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary || '',
      timestamp: new Date(item.datetime),
      severity: detectSeverity(item.headline),
      affectedAssets: detectAffectedAssets(item.headline, item.summary || ''),
      source: item.source
    }))
    .filter((news: BreakingNews) => news.affectedAssets.length > 0)
    .filter((news: BreakingNews) => !dismissed.has(news.id))
    .slice(0, 3) // Show max 3 breaking news

  const latestNews = breakingNews[0]

  if (!latestNews) return null

  const timeAgo = getTimeAgo(latestNews.timestamp)

  return (
    <div className="relative">
      {/* Main Banner */}
      <div 
        className={cn(
          "bg-card/95 backdrop-blur-sm border-b transition-all duration-300",
          latestNews.severity === 'critical' ? 'border-destructive/50' : 'border-border'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-start gap-4">
            {/* Breaking Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                latestNews.severity === 'critical' 
                  ? 'bg-destructive text-destructive-foreground animate-pulse' 
                  : 'bg-primary text-primary-foreground'
              )}>
                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                DERNIERES NOUVELLES
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>

            {/* News Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                {latestNews.headline.toUpperCase()}
              </h3>
              {isExpanded && latestNews.summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {latestNews.summary}
                </p>
              )}
            </div>

            {/* Expand/Dismiss */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )} />
              </button>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, latestNews.id]))}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Affected Assets */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <span className="text-xs text-muted-foreground shrink-0">ACTIFS A SURVEILLER</span>
            <div className="flex items-center gap-2">
              {latestNews.affectedAssets.map((asset) => (
                <div
                  key={asset.symbol}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    asset.impact === 'up' 
                      ? 'bg-success/10 text-success border border-success/20' 
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  )}
                >
                  <span>{asset.symbol}</span>
                  {asset.impact === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional News (Expanded) */}
      {isExpanded && breakingNews.length > 1 && (
        <div className="bg-muted/50 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-2 space-y-2">
            {breakingNews.slice(1).map((news) => (
              <div key={news.id} className="flex items-center gap-3 text-xs">
                <Zap className="w-3 h-3 text-primary shrink-0" />
                <span className="text-muted-foreground">{getTimeAgo(news.timestamp)}</span>
                <span className="text-foreground line-clamp-1 flex-1">{news.headline}</span>
                <div className="flex items-center gap-1">
                  {news.affectedAssets.slice(0, 3).map((asset) => (
                    <span
                      key={asset.symbol}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs",
                        asset.impact === 'up' ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {asset.symbol} {asset.impact === 'up' ? '↑' : '↓'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Il y a quelques instants'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`
  
  return `Il y a ${Math.floor(diffHours / 24)}j`
}
