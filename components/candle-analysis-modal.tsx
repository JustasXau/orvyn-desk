"use client"

import { X, TrendingUp, TrendingDown, Minus, ExternalLink, Loader2, Newspaper, BarChart2 } from "lucide-react"
import { CandleAnalysis } from "@/hooks/use-candle-news"
import { cn } from "@/lib/utils"

interface CandleAnalysisModalProps {
  analysis: CandleAnalysis | null
  loading: boolean
  onClose: () => void
}

export function CandleAnalysisModal({ analysis, loading, onClose }: CandleAnalysisModalProps) {
  if (!loading && !analysis) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Analyse des chandeliers {analysis?.candle.symbol && `- ${analysis.candle.symbol}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Recuperation des news + analyse IA...</p>
          </div>
        )}

        {/* Content */}
        {analysis && (
          <div className="flex-1 overflow-y-auto">
            {/* Main News Banner */}
            {analysis.news.length > 0 && (
              <div className="px-5 py-3 bg-primary/10 border-b border-primary/20">
                <p className="text-sm font-medium text-primary">
                  {analysis.news[0].headline}
                </p>
              </div>
            )}

            {/* "Que s'est-il passe?" Section */}
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-primary mb-3">
                Que s&apos;est-il passe ?
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.summary}
              </p>
              
              {/* Bullet points from news */}
              {analysis.news.length > 1 && (
                <ul className="mt-3 space-y-2">
                  {analysis.news.slice(1, 4).map((news, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                        news.sentiment === 'bullish' ? 'bg-emerald-500' :
                        news.sentiment === 'bearish' ? 'bg-red-500' : 'bg-muted-foreground'
                      )} />
                      <span className="text-sm text-muted-foreground">{news.headline}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Technical Analysis Section */}
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-primary mb-3">
                Donnees techniques
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.technicalAnalysis}
              </p>
              
              {/* Candle Stats */}
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Open</p>
                  <p className="text-sm font-mono font-medium">{analysis.candle.open.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">High</p>
                  <p className="text-sm font-mono font-medium text-emerald-500">{analysis.candle.high.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Low</p>
                  <p className="text-sm font-mono font-medium text-red-500">{analysis.candle.low.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Close</p>
                  <p className={cn(
                    "text-sm font-mono font-medium",
                    analysis.direction === 'up' ? 'text-emerald-500' : 
                    analysis.direction === 'down' ? 'text-red-500' : 'text-foreground'
                  )}>
                    {analysis.candle.close.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* News List */}
            {analysis.news.length > 0 && (
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    News liees ({analysis.news.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {analysis.news.map((news, i) => (
                    <a
                      key={i}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        news.sentiment === 'bullish' ? 'bg-emerald-500' :
                        news.sentiment === 'bearish' ? 'bg-red-500' : 'bg-muted-foreground'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {news.headline}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{news.source}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(news.datetime * 1000).toLocaleString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {analysis.news.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune news trouvee pour cette periode.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {analysis && (
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                analysis.direction === 'up' ? 'bg-emerald-500/20 text-emerald-500' :
                analysis.direction === 'down' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'
              )}>
                {analysis.direction === 'up' ? <TrendingUp className="w-3 h-3" /> :
                 analysis.direction === 'down' ? <TrendingDown className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {analysis.direction === 'up' ? '+' : ''}{analysis.changePct.toFixed(2)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {analysis.timestamp}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
