import { useState, useCallback } from 'react'

export interface CandleEvent {
  time: number        // unix timestamp de la bougie
  open: number
  high: number
  low: number
  close: number
  symbol: string
}

export interface NewsItem {
  headline: string
  source: string
  url: string
  datetime: number
  sentiment?: 'bullish' | 'bearish' | 'neutral'
}

export interface CandleAnalysis {
  candle: CandleEvent
  news: NewsItem[]
  summary: string
  direction: 'up' | 'down' | 'flat'
  changePct: number
  technicalAnalysis: string
  timestamp: string
}

export function useCandleNews() {
  const [analysis, setAnalysis] = useState<CandleAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeCandle = useCallback(async (candle: CandleEvent) => {
    setLoading(true)
    setAnalysis(null)
    setError(null)

    try {
      // TEMPORARILY DISABLED: /api/candle-analysis causes 429 errors
      // Using simple fallback instead
      const changePct = ((candle.close - candle.open) / candle.open) * 100
      const fallbackAnalysis: CandleAnalysis = {
        candle,
        news: [],
        summary: `Bougie de ${changePct > 0 ? 'hausse' : 'baisse'} de ${Math.abs(changePct).toFixed(2)}%`,
        direction: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
        changePct,
        technicalAnalysis: 'Analyse technique en attente...',
        timestamp: new Date().toISOString()
      }
      setAnalysis(fallbackAnalysis)
      return
      
      /* DISABLED - CAUSING 429 ERRORS
      const res = await fetch('/api/candle-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candle),
      })
      
      if (!res.ok) {
        throw new Error('Failed to analyze candle')
      }
      
      const data = await res.json()
      setAnalysis(data)
      */
    } catch (e) {
      console.error('[v0] Candle analysis error:', e)
      setError('Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setAnalysis(null)
    setError(null)
  }, [])

  return { analysis, loading, error, analyzeCandle, clear }
}
