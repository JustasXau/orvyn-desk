import { getYahooSymbol, getYahooSymbolByTimeframe } from './yahoo-symbols'
import { Redis } from '@upstash/redis'

// Upstash Redis for caching OHLC data - avoids Yahoo rate limits
let redis: Redis | null = null
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
} catch {
  // Redis not available, continue without cache
}

// Cache TTL by timeframe (seconds)
const CACHE_TTL: Record<string, number> = {
  '1wk': 3600,   // Weekly: 1 hour
  '1d': 1800,    // Daily: 30 min
  '60m': 300,    // H1: 5 min
  '15m': 180,    // M15: 3 min
}

interface OHLCBar {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TimeframeData {
  timeframe: string
  bars: OHLCBar[]
}

// Fetch OHLC data from Yahoo Finance for specific timeframe and range
// OPTIMIZED: Redis cache to avoid Yahoo rate limits
async function fetchYahooOHLC(
  orvynSymbol: string,
  timeframe: string,
  interval: '1m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1wk' | '1mo',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'
): Promise<OHLCBar[]> {
  const cacheKey = `ohlc:${orvynSymbol}:${interval}:${range}`
  
  // Try cache first
  if (redis) {
    try {
      const cached = await redis.get<OHLCBar[]>(cacheKey)
      if (cached && cached.length > 0) {
        return cached
      }
    } catch {
      // Cache read failed, continue to fetch
    }
  }
  
  try {
    // Get the correct Yahoo symbol for this timeframe
    const yahooSymbol = getYahooSymbolByTimeframe(orvynSymbol, timeframe)
    
    // Direct Yahoo Finance API call
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 } // 5 min cache
    })
    
    if (!response.ok) {
      console.error(`[OHLC Fetch] API error ${response.status} for ${yahooSymbol}`)
      return []
    }
    
    const data = await response.json() as any
    const result = data.chart?.result?.[0]
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return []
    }
    
    const timestamps = result.timestamp || []
    const quotes = result.indicators.quote[0] || {}
    const opens = quotes.open || []
    const highs = quotes.high || []
    const lows = quotes.low || []
    const closes = quotes.close || []
    const volumes = quotes.volume || []
    
    const bars: OHLCBar[] = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null && closes[i] !== undefined) {
        bars.push({
          timestamp: timestamps[i] * 1000,
          open: opens[i] || closes[i],
          high: highs[i] || closes[i],
          low: lows[i] || closes[i],
          close: closes[i],
          volume: volumes[i] || 0
        })
      }
    }
    
    // VALIDATION: Check minimum data
    if (bars.length < 10) {
      console.error(`[OHLC Fetch] Insufficient data: ${orvynSymbol} ${timeframe} (Yahoo: ${yahooSymbol}) → ${bars.length} bars (need ≥10)`)
      return []
    }
    
    // Cache successful fetch
    if (redis && bars.length > 0) {
      const ttl = CACHE_TTL[interval] || 300
      redis.set(cacheKey, bars, { ex: ttl }).catch(() => {})
    }
    
    return bars
  } catch (error) {
    console.error(`[OHLC Fetch] Exception for ${orvynSymbol}:`, error instanceof Error ? error.message : String(error))
    return []
  }
}

// Fetch all timeframes needed for SWING calculation
// Now accepts ORVYN symbol and selects the right Yahoo symbol per timeframe
export async function fetchSwingTimeframes(orvynSymbol: string): Promise<{
  weekly: OHLCBar[]
  daily: OHLCBar[]
  h4: OHLCBar[]
}> {
  const [weekly, daily, h4] = await Promise.all([
    fetchYahooOHLC(orvynSymbol, 'weekly', '1wk', '1y'),     // 52 weekly bars
    fetchYahooOHLC(orvynSymbol, 'daily', '1d', '9mo'),      // ~200 daily bars
    fetchYahooOHLC(orvynSymbol, 'h4', '60m', '15d'),        // ~90 H4 bars
  ])
  
  return { 
    weekly: weekly.slice(-52),    // Last 52 weeks
    daily: daily.slice(-200),     // Last 200 days
    h4: h4.slice(-90)             // Last 90 H4 bars
  }
}

// Fetch all timeframes needed for DAY calculation
// Now accepts ORVYN symbol and selects the right Yahoo symbol per timeframe
export async function fetchDayTimeframes(orvynSymbol: string): Promise<{
  h4: OHLCBar[]
  h1: OHLCBar[]
  m15: OHLCBar[]
}> {
  const [h4, h1, m15] = await Promise.all([
    fetchYahooOHLC(orvynSymbol, 'h4', '60m', '2d'),         // 30 H4 bars
    fetchYahooOHLC(orvynSymbol, 'h1', '60m', '2d'),         // 48 H1 bars
    fetchYahooOHLC(orvynSymbol, 'm15', '15m', '1d'),        // 96 M15 bars
  ])
  
  return {
    h4: h4.slice(-30),            // Last 30 H4 bars
    h1: h1.slice(-48),            // Last 48 H1 bars
    m15: m15.slice(-96)           // Last 96 M15 bars
  }
}

// Calculate EMA on price array
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return Array(prices.length).fill(0)
  
  const multiplier = 2 / (period + 1)
  const emas: number[] = []
  
  // Start with SMA
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period
  emas.push(ema)
  
  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
    emas.push(ema)
  }
  
  return emas
}

// Calculate RSI using Wilder's smoothing (industry standard)
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  
  // Initial average gains/losses
  let avgGain = 0
  let avgLoss = 0
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i]
    } else {
      avgLoss += -changes[i]
    }
  }
  
  avgGain = avgGain / period
  avgLoss = avgLoss / period
  
  // Wilder's smoothing for remaining prices
  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(0, changes[i])
    const loss = Math.max(0, -changes[i])
    
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50
  
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// Calculate MACD
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { histogram: number; signal: number; macd: number } {
  const emaFast = calculateEMA(prices, fastPeriod)
  const emaSlow = calculateEMA(prices, slowPeriod)
  
  const macd = emaFast[emaFast.length - 1] - emaSlow[emaSlow.length - 1]
  
  const macdLine: number[] = []
  for (let i = 0; i < Math.min(emaFast.length, emaSlow.length); i++) {
    macdLine.push(emaFast[i] - emaSlow[i])
  }
  
  const signal = calculateEMA(macdLine, signalPeriod)[macdLine.length - 1]
  const histogram = macd - signal
  
  return { histogram, signal, macd }
}

// Detect market structure (HH, HL, LH, LL)
export function detectStructure(bars: OHLCBar[]): { pattern: 'HH' | 'HL' | 'LH' | 'LL' | 'none'; strength: number } {
  if (bars.length < 3) return { pattern: 'none', strength: 0 }
  
  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  
  const lastHigh = highs[highs.length - 1]
  const prevHigh = highs[highs.length - 2] || 0
  const lastLow = lows[lows.length - 1]
  const prevLow = lows[lows.length - 2] || Number.MAX_VALUE
  
  const closeAbove200EMA = closes[closes.length - 1] > calculateEMA(closes, 200)[closes.length - 1]
  
  if (lastHigh > prevHigh && lastLow > prevLow) {
    return { pattern: 'HH', strength: closeAbove200EMA ? 2 : 1 }
  } else if (lastHigh < prevHigh && lastLow < prevLow) {
    return { pattern: 'LL', strength: closeAbove200EMA ? 2 : 1 }
  } else if (lastHigh > prevHigh && lastLow < prevLow) {
    return { pattern: 'HH', strength: 1 }
  } else {
    return { pattern: 'LL', strength: 1 }
  }
}
