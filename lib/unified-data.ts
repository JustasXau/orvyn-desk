"use server"

// Unified data cache to ensure consistency across all components
// All components should fetch from this centralized source

export interface UnifiedMarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  swing: {
    bias: 'bull' | 'bear' | 'neu'
    confidence: number
    signals: string[]
  }
  day: {
    bias: 'bull' | 'bear' | 'neu'
    confidence: number
    signals: string[]
  }
  sentiment: number // 0-100
  lastUpdate: string
  source: string
}

// In-memory cache for server-side consistency
const dataCache = new Map<string, { data: UnifiedMarketData; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

export async function getUnifiedData(symbol: string): Promise<UnifiedMarketData | null> {
  const cached = dataCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

export async function setUnifiedData(symbol: string, data: UnifiedMarketData): Promise<void> {
  dataCache.set(symbol, { data, timestamp: Date.now() })
}

export async function getAllCachedSymbols(): Promise<string[]> {
  return Array.from(dataCache.keys())
}
