"use client"

import { X, Loader2, AlertCircle, RefreshCw, Clock, Zap } from "lucide-react"
import { useState } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"

interface AssetReportModalProps {
  symbol: string
  onClose: () => void
}

export function AssetReportModal({ symbol, onClose }: AssetReportModalProps) {
  const [showRawData, setShowRawData] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Re-enabled with proper rate limiting (5 min dedupe, no auto-refresh)
  const { data: reportData, isLoading: reportLoading, error: reportError, mutate, isValidating } = useSWR(
    `/api/unified-report?symbol=${symbol}`,
    () => fetch('/api/unified-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, forceRefresh })
    }).then(r => r.json()),
    { 
      revalidateOnFocus: false, 
      revalidateOnReconnect: false,
      refreshInterval: 0, // Pas d'auto-refresh
      dedupingInterval: 300000, // 5 minutes de dedupe
    }
  )
  
  // Force refresh function with 60s debounce to prevent Groq 429 errors
  const REFRESH_COOLDOWN = 60000 // 60 seconds
  const handleRefresh = async () => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefreshTime
    
    if (timeSinceLastRefresh < REFRESH_COOLDOWN) {
      const remaining = Math.ceil((REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)
      setCooldownRemaining(remaining)
      setTimeout(() => setCooldownRemaining(0), remaining * 1000)
      return
    }
    
    setLastRefreshTime(now)
    setForceRefresh(true)
    await mutate()
    setTimeout(() => setForceRefresh(false), 1000)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border z-10 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{symbol}</h2>
            <p className="text-sm text-muted-foreground">
              Rapport Unifié Complet • Croisement de toutes les données
              {reportData?.cached && (
                <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                  Cache: {reportData.cacheExpiresIn}s
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isValidating}
              className={cn(
                "p-2 hover:bg-muted rounded-lg transition-colors",
                isValidating && "opacity-50 cursor-not-allowed"
              )}
              title="Rafraîchir (ignore le cache)"
            >
              <RefreshCw className={cn("w-5 h-5", isValidating && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Loading State */}
          {reportLoading && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Croisement de toutes les données...</span>
            </div>
          )}

          {/* Error State - SWR error */}
          {reportError && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Erreur de connexion</p>
                <p className="text-sm text-destructive/80">{reportError.message || String(reportError)}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Reessayer
                </button>
              </div>
            </div>
          )}

          {/* Error State - API returned error */}
          {reportData?.error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Erreur de generation du rapport</p>
                <p className="text-sm text-destructive/80">{reportData.error}</p>
                {reportData.details && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{reportData.details}</p>
                )}
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Reessayer
                </button>
              </div>
            </div>
          )}

          {/* Empty Report State */}
          {reportData && !reportData.error && !reportData.report && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-500">Rapport vide</p>
                <p className="text-sm text-amber-500/80">Le rapport n'a pas pu etre genere. Verifiez que GROQ_API_KEY est configuree.</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Reessayer
                </button>
              </div>
            </div>
          )}

          {/* Report Content - only show if we have actual report data */}
          {reportData && !reportData.error && reportData.report && (
            <>
              {/* Data Quality Indicator */}
              {reportData.dataQuality && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Complétude des données</span>
                    <span className="text-lg font-bold text-primary">{reportData.dataQuality.completeness}%</span>
                  </div>
                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${reportData.dataQuality.completeness}%` }}
                    />
                  </div>
                  {reportData.dataQuality.missingData.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Données manquantes: {reportData.dataQuality.missingData.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Cache Status */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                {reportData.cached ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Rapport en cache (expire dans {reportData.cacheExpiresIn}s)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Rapport généré à l'instant</span>
                  </>
                )}
              </div>

              {/* Main Report */}
              <div className="prose prose-invert max-w-none space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                  {reportData.report}
                </div>
              </div>

              {/* Raw Data Toggle */}
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="w-full py-2 px-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                {showRawData ? '▼ Masquer' : '▶ Afficher'} données brutes
              </button>

              {/* Raw Data */}
              {showRawData && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 text-xs font-mono max-h-64 overflow-y-auto">
                  <pre>{JSON.stringify(reportData, null, 2)}</pre>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={() => mutate()}
                className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                Rafraîchir le rapport
              </button>
            </>
          )}

          {/* No Report */}
          {!reportLoading && !reportData && !reportError && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun rapport disponible pour {symbol}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
