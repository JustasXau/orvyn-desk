import React from 'react'
import { Newspaper, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewsAnalysisDisplayProps {
  data: any
  loading?: boolean
}

export function NewsAnalysisDisplay({ data, loading }: NewsAnalysisDisplayProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 bg-muted rounded animate-pulse w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const newsItems = data.items || []
  const sentiment = data.sentiment || 'neutral'
  const relevantCount = data.relevantCount || 0

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">News Impact</h3>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-full text-[10px] font-bold',
          sentiment === 'bullish' && 'bg-emerald-500/20 text-emerald-400',
          sentiment === 'bearish' && 'bg-red-500/20 text-red-400',
          sentiment === 'neutral' && 'bg-amber-500/20 text-amber-400'
        )}>
          {relevantCount} relevant
        </div>
      </div>

      {/* News items */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {newsItems.length > 0 ? (
          newsItems.map((item: any, i: number) => (
            <div key={i} className="p-2 bg-muted/30 rounded border border-border/50 hover:border-border transition-colors">
              <div className="flex items-start gap-2">
                <div className={cn(
                  'flex-shrink-0 mt-1 w-2 h-2 rounded-full',
                  item.sentiment === 'bullish' && 'bg-emerald-400',
                  item.sentiment === 'bearish' && 'bg-red-400',
                  item.sentiment === 'neutral' && 'bg-amber-400'
                )} />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-foreground line-clamp-2">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{item.source}</div>
                  {item.impact && (
                    <div className="text-[10px] text-muted-foreground mt-1 italic">{item.impact}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <div className="text-[10px] text-muted-foreground">No relevant news in last 24h</div>
          </div>
        )}
      </div>

      {/* Sentiment gauge */}
      <div className="border-t border-border pt-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Sentiment Score</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                data.sentimentScore > 50 && 'bg-emerald-500',
                data.sentimentScore <= 50 && data.sentimentScore > 30 && 'bg-amber-500',
                data.sentimentScore <= 30 && 'bg-red-500'
              )}
              style={{ width: `${Math.max(0, Math.min(100, (data.sentimentScore || 50) + 50))}%` }}
            />
          </div>
          <span className="text-xs font-bold text-foreground">{data.sentimentScore || 0}</span>
        </div>
      </div>
    </div>
  )
}
