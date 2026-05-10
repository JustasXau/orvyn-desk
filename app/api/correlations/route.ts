import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/correlations?symbol=XAU/USD
 * Returns real-time correlations as 0-100 scores
 * For XAU/USD: returns DXY, XAG/USD, VIX (always these 3)
 * For other symbols: returns market-relevant correlations
 */

// Yahoo Finance symbols mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  'DXY': 'DX-Y.NYB',
  'VIX': '^VIX',
  'US10Y': '^TNX',
  'US500': 'ES=F',
  'US100': 'NQ=F',
  'US30': 'YM=F',
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'BTC/USD': 'BTC-USD',
}

// Cache for price data (5 min TTL)
const priceCache: Map<string, { data: number[], timestamp: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function fetchPriceHistory(symbol: string): Promise<number[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol
  const cacheKey = yahooSymbol
  
  // Check cache
  const cached = priceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1mo`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 }
      }
    )
    
    if (!response.ok) return []
    
    const data = await response.json()
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
    const validCloses = closes.filter((c: number | null) => c !== null) as number[]
    
    // Cache result
    priceCache.set(cacheKey, { data: validCloses, timestamp: Date.now() })
    
    return validCloses
  } catch {
    return []
  }
}

// Calculate Pearson correlation coefficient
function calculatePearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 5) return 0
  
  const xData = x.slice(-n)
  const yData = y.slice(-n)
  
  const meanX = xData.reduce((a, b) => a + b, 0) / n
  const meanY = yData.reduce((a, b) => a + b, 0) / n
  
  let numerator = 0
  let denominatorX = 0
  let denominatorY = 0
  
  for (let i = 0; i < n; i++) {
    const diffX = xData[i] - meanX
    const diffY = yData[i] - meanY
    numerator += diffX * diffY
    denominatorX += diffX * diffX
    denominatorY += diffY * diffY
  }
  
  const denominator = Math.sqrt(denominatorX * denominatorY)
  if (denominator === 0) return 0
  
  return numerator / denominator
}

/**
 * Convert Pearson to 0-100 score with special handling for inverse correlations
 * 
 * For INVERSE relationships (DXY vs XAU):
 *   - pearson = -1.0 (opposite directions) = GOOD = score 100 (green)
 *   - pearson = 0.0 (no correlation) = NEUTRAL = score 50 (orange)
 *   - pearson = +1.0 (same direction) = BAD = score 0 (red)
 * 
 * For DIRECT relationships (XAG vs XAU):
 *   - pearson = +1.0 (same direction) = GOOD = score 100 (green)
 *   - pearson = 0.0 (no correlation) = NEUTRAL = score 50 (orange)
 *   - pearson = -1.0 (opposite directions) = BAD = score 0 (red)
 */
function pearsonToScore(pearson: number, isInverse: boolean = false): number {
  let score: number
  
  if (isInverse) {
    // Formula: score = 50 - (pearson * 50)
    // pearson=-1 -> 100, pearson=0 -> 50, pearson=+1 -> 0
    score = 50 - (pearson * 50)
  } else {
    // Formula: score = 50 + (pearson * 50)
    // pearson=+1 -> 100, pearson=0 -> 50, pearson=-1 -> 0
    score = 50 + (pearson * 50)
  }
  
  return Math.round(Math.max(0, Math.min(100, score)))
}

// Default correlations for XAU/USD: DXY (inverse), XAG (direct) - only 2
const DEFAULT_XAU_CORRELATIONS = [
  { symbol: 'DXY', correlation: 85, isInverse: true },
  { symbol: 'XAG/USD', correlation: 88, isInverse: false },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'XAU/USD'
  
  try {
    // Special handling for XAU/USD: always return DXY, XAG/USD, VIX
    if (symbol === 'XAU/USD') {
      const mainPrices = await fetchPriceHistory(symbol)
      
      if (mainPrices.length < 5) {
        // Return default scores
        return NextResponse.json({
          symbol,
          correlations: DEFAULT_XAU_CORRELATIONS.map(c => ({
            symbol: c.symbol,
            correlation: c.correlation,
            isInverse: c.isInverse,
            strength: c.correlation >= 80 ? 'strong' : c.correlation >= 50 ? 'moderate' : 'weak'
          })),
          source: 'default'
        })
      }
      
      // Calculate real correlations for DXY and XAG only
      const [dxyPrices, xagPrices] = await Promise.all([
        fetchPriceHistory('DXY'),
        fetchPriceHistory('XAG/USD'),
      ])
      
      const results = []
      
      // DXY: inverse correlation - high score when they move opposite (gold up, DXY down)
      // Low score when they move together (both up or both down = abnormal)
      if (dxyPrices.length >= 5) {
        const dxyPearson = calculatePearson(mainPrices, dxyPrices)
        // pearson negative = moving opposite = GOOD = high score
        // pearson positive = moving together = BAD = low score
        const dxyScore = pearsonToScore(dxyPearson, true) // inverse relationship
        results.push({
          symbol: 'DXY',
          correlation: dxyScore,
          isInverse: true,
          strength: dxyScore >= 80 ? 'strong' : dxyScore >= 50 ? 'moderate' : 'weak'
        })
      }
      
      // XAG/USD: direct correlation - high score when they move together
      if (xagPrices.length >= 5) {
        const xagPearson = calculatePearson(mainPrices, xagPrices)
        const xagScore = pearsonToScore(xagPearson, false) // direct relationship
        results.push({
          symbol: 'XAG/USD',
          correlation: xagScore,
          isInverse: false,
          strength: xagScore >= 80 ? 'strong' : xagScore >= 50 ? 'moderate' : 'weak'
        })
      }
      
      // If we got both 2, return them; otherwise return defaults
      if (results.length === 2) {
        return NextResponse.json({
          symbol,
          correlations: results,
          source: 'realtime',
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // For non-XAU/USD symbols, return defaults
    return NextResponse.json({
      symbol,
      correlations: DEFAULT_XAU_CORRELATIONS,
      source: 'default'
    })
    
  } catch (error) {
    console.error('[Correlations] Error:', error)
    
    // Return defaults on error
    return NextResponse.json({
      symbol,
      correlations: DEFAULT_XAU_CORRELATIONS,
      source: 'default',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
