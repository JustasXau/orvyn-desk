/**
 * Hook to fetch quick analysis from /api/quick-analysis
 * Provides news-aware 2-sentence analysis for market cards
 */

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface QuickAnalysisParams {
  symbol: string
  price: number
  priceChange: number
  swingBias: { direction: string; confidence: number; score: number }
  dayBias: { direction: string; confidence: number; score: number }
  news?: any[]
}

interface QuickAnalysisResult {
  analysis: string
  newsCount: number
  hasDivergence: boolean
  isLoading: boolean
  error?: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

/**
 * Global queue to stagger API calls and prevent rate limit
 * Reduces simultaneous requests when switching pairs
 */
const REQUEST_QUEUE = new Map<string, { priority: number; queued: number }>()
const SYMBOL_CALL_TIMES = new Map<string, number>()
const STAGGER_DELAY_MS = 800 // Délai entre chaque appel (0ms, 800ms, 1600ms, etc)
const MIN_TIME_BETWEEN_CALLS_MS = 2000 // Minimum 2 secondes entre appels du même symbole

/**
 * Hook: useQuickAnalysis
 * Fetches quick analysis from /api/quick-analysis for a given pair
 * Implements client-side rate limiting with staggered delays to prevent 429 errors
 * 
 * @param symbol - Trading pair symbol (e.g., 'XAU/USD')
 * @param price - Current price
 * @param priceChange - Price change percentage
 * @param swingBias - Swing bias from bias engine
 * @param dayBias - Day bias from bias engine
 * @returns Analysis text, news count, and loading state
 */
export function useQuickAnalysis(
  symbol: string,
  price: number,
  priceChange: number,
  swingBias: { direction: string; confidence: number; score: number },
  dayBias: { direction: string; confidence: number; score: number }
): QuickAnalysisResult {
  const [mounted, setMounted] = useState(false)
  const [delayApplied, setDelayApplied] = useState(false)

  // Only enable SWR on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply staggered delay based on symbol priority
  useEffect(() => {
    if (!mounted) return

    // Calculate priority based on order in card display
    const priority = getSymbolPriority(symbol)
    const delay = priority * STAGGER_DELAY_MS

    console.log(`[useQuickAnalysis] ${symbol} priority=${priority}, delay=${delay}ms`)

    const timer = setTimeout(() => {
      setDelayApplied(true)
    }, delay)

    return () => {
      clearTimeout(timer)
      setDelayApplied(false)
    }
  }, [symbol, mounted])

  // Fetch quick analysis with rate limit protection
  const { data, error, isLoading } = useSWR(
    mounted && delayApplied ? `/api/quick-analysis-${symbol}` : null,
    async () => {
      // TEMPORARILY DISABLED: /api/quick-analysis causes 429 errors
      // Returning simple fallback
      const fallback = generateFallback(symbol, swingBias, dayBias, priceChange)
      return {
        analysis: fallback,
        newsCount: 0,
        source: 'fallback-disabled',
      }
      
      /* DISABLED - CAUSING 429 ERRORS
      // Check if enough time has passed since last call for this symbol
      const lastCall = SYMBOL_CALL_TIMES.get(symbol) ?? 0
      const timeSinceLastCall = Date.now() - lastCall
      
      if (timeSinceLastCall < MIN_TIME_BETWEEN_CALLS_MS) {
        const waitTime = MIN_TIME_BETWEEN_CALLS_MS - timeSinceLastCall
        console.log(`[useQuickAnalysis] ${symbol} rate limit: waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }

      const res = await fetch('/api/quick-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          price,
          priceChange,
          swingBias,
          dayBias,
        }),
      })

      // Record call time for rate limiting
      SYMBOL_CALL_TIMES.set(symbol, Date.now())

      // Handle 429 with fallback
      if (res.status === 429) {
        console.warn(`[useQuickAnalysis] ${symbol} got 429 - returning fallback`)
        const fallback = generateFallback(symbol, swingBias, dayBias, priceChange)
        return {
          analysis: fallback,
          newsCount: 0,
          source: 'fallback-429',
        }
      }

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      return res.json()
      */
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      focusThrottleInterval: 300000,
      errorRetryCount: 1,
      errorRetryInterval: 5000,
    }
  )

  return {
    analysis: data?.analysis || '',
    newsCount: data?.newsCount || 0,
    hasDivergence: data?.hasDivergence || false,
    isLoading: (isLoading || !mounted || !delayApplied),
    error: error?.message,
  }
}

/**
 * Get symbol priority based on position in card display
 * Symbols are displayed in a consistent order, so we use that for staggering
 */
function getSymbolPriority(symbol: string): number {
  const ORDER = [
    'XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY',
    'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP',
    'US30', 'US100', 'US500', 'DXY',
    'WTI', 'BRENT', 'XAG/USD',
    'BTC/USD', 'ETH/USD',
  ]
  
  const index = ORDER.indexOf(symbol)
  return index >= 0 ? index : 0
}

/**
 * Fallback analysis when API returns 429 or fails
 * Provides technical analysis without Groq
 */
function generateFallback(
  symbol: string,
  swingBias: { direction: string; confidence: number; score: number },
  dayBias: { direction: string; confidence: number; score: number },
  priceChange: number
): string {
  const direction = priceChange > 0 ? 'hausse' : priceChange < 0 ? 'baisse' : 'stable'
  const changeAbs = Math.abs(priceChange).toFixed(2)
  const swing = swingBias?.direction || 'Neutre'
  const day = dayBias?.direction || 'Neutre'
  
  return `${symbol} en ${direction} de ${changeAbs}%. Swing ${swing}, Day ${day} — analyse IA temporaire, données techniques actives.`
}

/**
 * Hook: useQuickAnalysisWithInterval
 * Fetches quick analysis and refreshes every 5 minutes
 */
export function useQuickAnalysisWithInterval(
  symbol: string,
  price: number,
  priceChange: number,
  swingBias: { direction: string; confidence: number; score: number },
  dayBias: { direction: string; confidence: number; score: number }
): QuickAnalysisResult {
  const [analysis, setAnalysis] = useState('')
  const [newsCount, setNewsCount] = useState(0)
  const [hasDivergence, setHasDivergence] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true)
        
        // TEMPORARILY DISABLED: /api/quick-analysis causes 429 errors
        // Using simple fallback instead
        const fallbackAnalysis = generateFallback(symbol, swingBias, dayBias, priceChange)
        setAnalysis(fallbackAnalysis)
        setNewsCount(0)
        setHasDivergence(false)
        setError(undefined)
        return
        
        /* DISABLED - CAUSING 429 ERRORS
        console.log('[useQuickAnalysisWithInterval] Fetching for:', {
          symbol,
          price,
          priceChange,
          swingBias: swingBias?.direction,
          dayBias: dayBias?.direction,
        })

        const res = await fetch('/api/quick-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            price,
            priceChange,
            swingBias,
            dayBias,
          }),
        })

        // Log brute response before parsing
        const text = await res.text()
        console.log('[useQuickAnalysisWithInterval] Response status:', res.status)
        console.log('[useQuickAnalysisWithInterval] Response text:', text.substring(0, 200))

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${text}`)
        }

        const data = JSON.parse(text)
        setAnalysis(data.analysis || '')
        setNewsCount(data.dataUsed?.relevantNews || 0)
        setHasDivergence(data.hasDivergence || false)
        setError(undefined)
        */
      } catch (err) {
        console.error('[useQuickAnalysisWithInterval] Complete error:', err)
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
        
        // Fallback: Generate technical analysis if API fails
        const fallbackAnalysis = generateFallback(symbol, swingBias, dayBias, priceChange)
        setAnalysis(fallbackAnalysis)
        // Keep previous analysis on error
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchAnalysis()

    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalysis, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [symbol, price, priceChange, swingBias, dayBias])

  return {
    analysis,
    newsCount,
    hasDivergence,
    isLoading,
    error,
  }
}

/**
 * Fallback analysis if Groq/API fails
 * Returns simple technical analysis based on bias
 */
function generateTechnicalFallback(
  symbol: string,
  swingBias: { direction: string; confidence: number; score: number },
  priceChange: number
): string {
  const direction = priceChange > 0 ? 'hausse' : priceChange < 0 ? 'baisse' : 'stable'
  const changeAbs = Math.abs(priceChange).toFixed(2)
  const biasLabel = swingBias?.direction || 'Neutre'
  return `${symbol} en ${direction} de ${changeAbs}%. Bias swing ${biasLabel} — analyse détaillée indisponible momentanément.`
}
