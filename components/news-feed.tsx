"use client"

import { useState } from "react"
import useSWR from "swr"
import { Bookmark, Globe, Zap, Landmark, Radio, RefreshCw, ExternalLink } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { EconomicSummary } from "./economic-summary"

type NewsCategory = "all" | "breaking" | "high-impact" | "economic"

interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  datetime: number
  url: string
  category: "breaking" | "high-impact" | "economic" | "general"
  relatedAssets: { symbol: string; impact: "up" | "down" | "neutral" }[]
  isBreaking: boolean
}

interface NewsResponse {
  news: NewsItem[]
  popularIds: string[]
  timestamp: string
  sources: { finnhub: number; newsapi: number }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// Clean HTML tags from text
function stripHtml(html: string): string {
  if (!html) return ""
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ')
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&apos;/g, "'")
  // Clean up multiple spaces
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

interface NewsFeedProps {
  compact?: boolean
}

export function NewsFeed({ compact = false }: NewsFeedProps) {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all")
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const { t } = useI18n()

  const { data, error, isLoading, mutate } = useSWR<NewsResponse>(
    "/api/news",
    fetcher,
    { refreshInterval: 60000 }
  )

  const categoryConfig: Record<NewsCategory, { label: string; icon: React.ReactNode }> = {
    all: { label: t('all'), icon: <Globe className="w-3 h-3" /> },
    breaking: { label: t('breakingNews'), icon: <Radio className="w-3 h-3" /> },
    "high-impact": { label: t('highImpact'), icon: <Zap className="w-3 h-3" /> },
    economic: { label: t('economicData'), icon: <Landmark className="w-3 h-3" /> },
  }

  const news = data?.news || []

  const filteredNews = (() => {
    if (activeCategory === "all") return news
    return news.filter(item => item.category === activeCategory)
  })()

  const toggleSave = (id: string) => {
    setSavedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={cn("flex flex-col h-full", compact ? "bg-transparent" : "bg-card/30")}>
      {/* Header */}
      <div className={cn("border-b border-border", compact ? "p-3" : "p-4")}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={cn("font-semibold text-primary", compact ? "text-sm" : "text-lg")}>
              {t('liveNews')}
            </h2>
            {!compact && (
              <p className="text-xs text-muted-foreground">{t('realTimeHeadlines')}</p>
            )}
          </div>
          <button
            onClick={() => mutate(undefined, { revalidate: true })}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className={cn(
        "flex items-center gap-1 border-b border-border overflow-x-auto",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}>
        {(Object.keys(categoryConfig) as NewsCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap transition-colors",
              activeCategory === cat
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {cat === "breaking" && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            )}
            {categoryConfig[cat].icon}
            {!compact && categoryConfig[cat].label}
          </button>
        ))}
      </div>

      {/* News List or Economic Summary */}
      <div className="flex-1 overflow-y-auto">
        {/* Show Economic Summary for economic tab */}
        {activeCategory === "economic" ? (
          <EconomicSummary compact={compact} />
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-3 text-center text-destructive text-xs">
                Failed to load news.
              </div>
            )}

            {!isLoading && filteredNews.length === 0 && (
              <div className="p-3 text-center text-muted-foreground text-xs">
                No news found.
              </div>
            )}

            {filteredNews.slice(0, compact ? 10 : 50).map((item) => (
          <article
            key={item.id}
            className={cn(
              "border-b border-border/50 hover:bg-accent/30 transition-colors",
              compact ? "p-2.5" : "p-4"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Timestamp and Breaking Badge */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">{formatTimeAgo(item.datetime)}</span>
                  {item.isBreaking && (
                    <span className="flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-bold uppercase bg-destructive/20 text-destructive rounded">
                      <span className="w-1 h-1 rounded-full bg-destructive animate-pulse" />
                      Breaking
                    </span>
                  )}
                </div>

                {/* Headline */}
                <h3 className={cn(
                  "font-medium text-foreground leading-snug",
                  compact ? "text-[11px] line-clamp-2" : "text-sm mb-1"
                )}>
                  {stripHtml(item.headline)}
                </h3>

                {/* Summary - only in non-compact */}
                {!compact && item.summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                    {stripHtml(item.summary)}
                  </p>
                )}

                {/* Assets Affected */}
                {item.relatedAssets && item.relatedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.relatedAssets.slice(0, compact ? 3 : 6).map((asset, idx) => (
                      <span
                        key={`${asset.symbol}-${idx}`}
                        className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded border",
                          asset.impact === "up"
                            ? "bg-success/10 border-success/30 text-success"
                            : asset.impact === "down"
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        {asset.symbol}
                        <span>{asset.impact === "up" ? "↑" : asset.impact === "down" ? "↓" : "•"}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions - only in non-compact */}
              {!compact && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => toggleSave(item.id)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      savedItems.has(item.id)
                        ? "text-primary bg-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={savedItems.has(item.id) ? "currentColor" : "none"} />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </article>
        ))}
          </>
        )}
      </div>
    </div>
  )
}
