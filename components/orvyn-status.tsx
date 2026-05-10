"use client"

import { useState, useEffect } from "react"
import { Shield, CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrvynResponse {
  status: 'OK' | 'WARNING' | 'ERROR'
  checks: {
    watchlist: 'OK' | 'ISSUE'
    favorites: 'OK' | 'ISSUE'
    market_data: 'OK' | 'ISSUE'
  }
  issues: string[]
  suggestions: string[]
  summary: string
  trading_hint: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'NONE'
    confidence: number
  }
}

interface OrvynStatusProps {
  watchlist?: string[]
  favorites?: string[]
  marketData?: Record<string, { price: number; timestamp: number; change?: number }>
  compact?: boolean
}

export function OrvynStatus({ watchlist, favorites, marketData, compact = false }: OrvynStatusProps) {
  const [status, setStatus] = useState<OrvynResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchStatus = async () => {
    setIsLoading(true)
    try {
      // TEMPORARILY DISABLED: /api/orvyn uses Groq causing 429 errors
      // Using simple OK status fallback instead
      setStatus({ status: 'OK', message: 'Market Status: Normal' })
      
      /* DISABLED - CAUSING 429 ERRORS
      const response = await fetch('/api/orvyn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWatchlist: watchlist,
          userFavorites: favorites,
          marketData,
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
      */
    } catch (error) {
      console.error('[Orvyn] Fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [watchlist?.length, favorites?.length])

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
    if (!status) return <Shield className="w-4 h-4 text-muted-foreground" />
    
    switch (status.status) {
      case 'OK':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'ERROR':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = () => {
    if (!status) return 'border-border'
    switch (status.status) {
      case 'OK': return 'border-emerald-500/30 bg-emerald-500/5'
      case 'WARNING': return 'border-amber-500/30 bg-amber-500/5'
      case 'ERROR': return 'border-red-500/30 bg-red-500/5'
    }
  }

  const getBiasIcon = () => {
    if (!status || status.trading_hint.bias === 'NONE') return null
    switch (status.trading_hint.bias) {
      case 'BULLISH':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
      case 'BEARISH':
        return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
      case 'NEUTRAL':
        return <Minus className="w-3.5 h-3.5 text-amber-500" />
    }
  }

  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
          getStatusColor(),
          "hover:opacity-80"
        )}
      >
        {getStatusIcon()}
        <span className="text-xs font-medium">Orvyn</span>
        {status?.trading_hint.bias !== 'NONE' && getBiasIcon()}
      </button>
    )
  }

  return (
    <div className={cn("rounded-xl border p-4", getStatusColor())}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold">Orvyn Desk AI</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            status?.status === 'OK' && "bg-emerald-500/20 text-emerald-500",
            status?.status === 'WARNING' && "bg-amber-500/20 text-amber-500",
            status?.status === 'ERROR' && "bg-red-500/20 text-red-500",
            !status && "bg-muted text-muted-foreground"
          )}>
            {isLoading ? 'Analyse...' : status?.status || 'Chargement'}
          </span>
        </div>
      </div>

      {status && (
        <>
          <p className="text-sm text-foreground mb-4">{status.summary}</p>

          {/* Checks */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
              status.checks.watchlist === 'OK' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {status.checks.watchlist === 'OK' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              Watchlist
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
              status.checks.favorites === 'OK' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {status.checks.favorites === 'OK' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              Favoris
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
              status.checks.market_data === 'OK' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {status.checks.market_data === 'OK' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              Donnees
            </div>
          </div>

          {/* Trading Hint */}
          {status.trading_hint.bias !== 'NONE' && (
            <div className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg mb-4",
              status.trading_hint.bias === 'BULLISH' && "bg-emerald-500/10",
              status.trading_hint.bias === 'BEARISH' && "bg-red-500/10",
              status.trading_hint.bias === 'NEUTRAL' && "bg-amber-500/10"
            )}>
              <div className="flex items-center gap-2">
                {getBiasIcon()}
                <span className={cn(
                  "text-sm font-medium",
                  status.trading_hint.bias === 'BULLISH' && "text-emerald-500",
                  status.trading_hint.bias === 'BEARISH' && "text-red-500",
                  status.trading_hint.bias === 'NEUTRAL' && "text-amber-500"
                )}>
                  {status.trading_hint.bias}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Confiance: {status.trading_hint.confidence}%
              </span>
            </div>
          )}

          {/* Issues */}
          {status.issues.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Problemes detectes</h4>
              <ul className="space-y-1">
                {status.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-amber-500 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {status.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Suggestions</h4>
              <ul className="space-y-1">
                {status.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Rafraichir l'analyse
          </button>
        </>
      )}
    </div>
  )
}
