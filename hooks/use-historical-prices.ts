"use client"

import { useState, useEffect, useCallback } from 'react'

const CACHE_KEY = 'orvyndesk_historical_v1'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface HistoricalData {
  change1M: number | null
  change3M: number | null
  change12M: number | null
  currentPrice: number | null
  source: string
  timestamp: number
}

interface CacheEntry {
  data: HistoricalData
  timestamp: number
}

interface Cache {
  [symbol: string]: CacheEntry
}

function getCache(): Cache {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function setCache(cache: Cache) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable
  }
}

function getCachedData(symbol: string): HistoricalData | null {
  const cache = getCache()
  const entry = cache[symbol]
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  return null
}

function setCachedData(symbol: string, data: HistoricalData) {
  const cache = getCache()
  cache[symbol] = { data, timestamp: Date.now() }
  setCache(cache)
}

export function useHistoricalPrices(symbols: string[]) {
  const [data, setData] = useState<Record<string, HistoricalData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistoricalPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) {
      setLoading(false)
      return
    }

    // Check cache first
    const cachedData: Record<string, HistoricalData> = {}
    const symbolsToFetch: string[] = []

    for (const symbol of symbols) {
      const cached = getCachedData(symbol)
      if (cached) {
        cachedData[symbol] = cached
      } else {
        symbolsToFetch.push(symbol)
      }
    }

    // If all data is cached, use it
    if (symbolsToFetch.length === 0) {
      setData(cachedData)
      setLoading(false)
      return
    }

    try {
      // Fetch missing data from API
      const res = await fetch(`/api/historical-prices?symbols=${symbolsToFetch.join(',')}`)
      if (!res.ok) throw new Error('Failed to fetch historical prices')

      const result = await res.json()

      // Update cache with new data
      if (result.data) {
        for (const [symbol, historicalData] of Object.entries(result.data)) {
          const dataWithTimestamp = {
            ...(historicalData as HistoricalData),
            timestamp: Date.now()
          }
          setCachedData(symbol, dataWithTimestamp)
          cachedData[symbol] = dataWithTimestamp
        }
      }

      setData(cachedData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Still use cached data even if fetch fails
      setData(cachedData)
    } finally {
      setLoading(false)
    }
  }, [symbols])

  useEffect(() => {
    fetchHistoricalPrices()
  }, [fetchHistoricalPrices])

  return { data, loading, error, refetch: fetchHistoricalPrices }
}

export function useHistoricalPrice(symbol: string) {
  const [data, setData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) {
      setLoading(false)
      return
    }

    // Check cache first
    const cached = getCachedData(symbol)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    // Fetch from API
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/historical-prices?symbol=${encodeURIComponent(symbol)}`)
        if (!res.ok) throw new Error('Failed to fetch historical price')

        const result = await res.json()
        const historicalData: HistoricalData = {
          change1M: result.change1M,
          change3M: result.change3M,
          change12M: result.change12M,
          currentPrice: result.currentPrice,
          source: result.source,
          timestamp: Date.now()
        }

        setCachedData(symbol, historicalData)
        setData(historicalData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol])

  return { data, loading, error }
}
