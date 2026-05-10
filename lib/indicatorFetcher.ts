// ═══════════════════════════════════════════════════
// INDICATOR FETCHER - Yahoo Finance based (free, no API key)
// Calculates all technical indicators from price data
// ═══════════════════════════════════════════════════

import { SwingIndicators, DayIndicators } from './biasEngine'

// Cache for indicator data (5 minutes TTL)
const indicatorCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 300000 // 5 minutes

// ═══════════════════════════════
// TECHNICAL INDICATOR CALCULATIONS
// ═══════════════════════════════

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const k = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  return ema
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(prices: number[]): { macdLine: number; macdSignal: number; macdHist: number } {
  if (prices.length < 26) return { macdLine: 0, macdSignal: 0, macdHist: 0 }
  
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macdLine = ema12 - ema26
  
  // Calculate MACD line history for signal line
  const macdHistory: number[] = []
  for (let i = 26; i <= prices.length; i++) {
    const e12 = calculateEMA(prices.slice(0, i), 12)
    const e26 = calculateEMA(prices.slice(0, i), 26)
    macdHistory.push(e12 - e26)
  }
  
  const macdSignal = macdHistory.length >= 9 ? calculateEMA(macdHistory, 9) : macdLine
  const macdHist = macdLine - macdSignal
  
  return { macdLine, macdSignal, macdHist }
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 20
  
  const trueRanges: number[] = []
  const plusDMs: number[] = []
  const minusDMs: number[] = []
  
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i]
    const low = lows[i]
    const prevHigh = highs[i - 1]
    const prevLow = lows[i - 1]
    const prevClose = closes[i - 1]
    
    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
    
    // Directional Movement
    const upMove = high - prevHigh
    const downMove = prevLow - low
    
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }
  
  // Smoothed averages
  const atr = calculateEMA(trueRanges, period)
  const plusDI = (calculateEMA(plusDMs, period) / atr) * 100
  const minusDI = (calculateEMA(minusDMs, period) / atr) * 100
  
  // DX and ADX
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
  
  return isNaN(dx) ? 20 : dx
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { stochK: number; stochD: number } {
  if (closes.length < period) return { stochK: 50, stochD: 50 }
  
  const recentHighs = highs.slice(-period)
  const recentLows = lows.slice(-period)
  const highestHigh = Math.max(...recentHighs)
  const lowestLow = Math.min(...recentLows)
  const currentClose = closes[closes.length - 1]
  
  const stochK = highestHigh !== lowestLow 
    ? ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 
    : 50
  
  // Calculate %D (3-period SMA of %K)
  const kValues: number[] = []
  for (let i = period; i <= closes.length; i++) {
    const h = highs.slice(i - period, i)
    const l = lows.slice(i - period, i)
    const hh = Math.max(...h)
    const ll = Math.min(...l)
    const c = closes[i - 1]
    kValues.push(hh !== ll ? ((c - ll) / (hh - ll)) * 100 : 50)
  }
  
  const stochD = kValues.length >= 3 ? calculateSMA(kValues, 3) : stochK
  
  return { stochK, stochD }
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const mid = prices[prices.length - 1] || 0
    return { upper: mid, middle: mid, lower: mid }
  }
  
  const slice = prices.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period
  
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period
  const std = Math.sqrt(variance)
  
  return {
    upper: middle + stdDev * std,
    middle,
    lower: middle - stdDev * std
  }
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < 2) return 0
  
  const trueRanges: number[] = []
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trueRanges.push(tr)
  }
  
  return calculateEMA(trueRanges, period)
}

// ═══════════════════════════════
// YAHOO FINANCE DATA FETCHER
// ═══════════════════════════════

// Multiple symbol options for gold (fallback if primary fails)
const GOLD_SYMBOLS = ['GC=F', 'GLD', 'IAU', 'XAUUSD=X']
const SILVER_SYMBOLS = ['SI=F', 'SLV', 'XAGUSD=X']

const YAHOO_SYMBOLS: Record<string, string> = {
  // Metals - Primary symbols (fallbacks handled separately)
  'XAU/USD': 'GC=F', 'XAG/USD': 'SI=F', 'XPT/USD': 'PL=F', 'XPD/USD': 'PA=F',
  // Forex
  'EUR/USD': 'EURUSD=X', 'GBP/USD': 'GBPUSD=X', 'USD/JPY': 'USDJPY=X',
  'USD/CHF': 'USDCHF=X', 'AUD/USD': 'AUDUSD=X', 'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X', 'EUR/GBP': 'EURGBP=X', 'EUR/JPY': 'EURJPY=X',
  'GBP/JPY': 'GBPJPY=X', 'EUR/CHF': 'EURCHF=X', 'EUR/AUD': 'EURAUD=X',
  'EUR/CAD': 'EURCAD=X', 'GBP/CHF': 'GBPCHF=X', 'GBP/AUD': 'GBPAUD=X',
  'AUD/JPY': 'AUDJPY=X', 'CAD/JPY': 'CADJPY=X', 'CHF/JPY': 'CHFJPY=X',
  // Indices
  'US30': 'YM=F', 'US100': 'NQ=F', 'US500': 'ES=F',
  'GER40': '^GDAXI', 'UK100': '^FTSE', 'JPN225': '^N225',
  'DXY': 'DX-Y.NYB',
  // Energy
  'USOIL': 'CL=F', 'UKOIL': 'BZ=F', 'NATGAS': 'NG=F',
  // Crypto
  'BTC/USD': 'BTC-USD', 'ETH/USD': 'ETH-USD', 'XRP/USD': 'XRP-USD',
  'SOL/USD': 'SOL-USD', 'ADA/USD': 'ADA-USD', 'DOGE/USD': 'DOGE-USD',
}

function getYahooSymbol(symbol: string): string {
  if (YAHOO_SYMBOLS[symbol]) return YAHOO_SYMBOLS[symbol]
  if (symbol.includes('/')) return symbol.replace('/', '') + '=X'
  return symbol
}

interface YahooOHLC {
  timestamps: number[]
  opens: number[]
  highs: number[]
  lows: number[]
  closes: number[]
}

async function fetchYahooDataSingle(yahooSymbol: string, interval: string, range: string): Promise<YahooOHLC | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }
    })
    
    if (!res.ok) {
      console.log(`[v0] Yahoo fetch failed for ${yahooSymbol}: ${res.status}`)
      return null
    }
    
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) {
      console.log(`[v0] Yahoo no result for ${yahooSymbol}`)
      return null
    }
    
    const quote = result.indicators?.quote?.[0]
    if (!quote) {
      console.log(`[v0] Yahoo no quote data for ${yahooSymbol}`)
      return null
    }
    
    const ohlc: YahooOHLC = {
      timestamps: result.timestamp || [],
      opens: (quote.open || []).filter((v: number | null) => v !== null) as number[],
      highs: (quote.high || []).filter((v: number | null) => v !== null) as number[],
      lows: (quote.low || []).filter((v: number | null) => v !== null) as number[],
      closes: (quote.close || []).filter((v: number | null) => v !== null) as number[],
    }
    
    console.log(`[v0] Yahoo success for ${yahooSymbol}: ${ohlc.closes.length} candles`)
    return ohlc
  } catch (error) {
    console.log(`[v0] Yahoo error for ${yahooSymbol}:`, error)
    return null
  }
}

async function fetchYahooData(symbol: string, interval: string, range: string): Promise<YahooOHLC | null> {
  const cacheKey = `yahoo_${symbol}_${interval}_${range}`
  const cached = indicatorCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as YahooOHLC
  }
  
  // Get list of symbols to try (with fallbacks for gold/silver)
  let symbolsToTry: string[] = []
  
  if (symbol === 'XAU/USD') {
    symbolsToTry = GOLD_SYMBOLS
  } else if (symbol === 'XAG/USD') {
    symbolsToTry = SILVER_SYMBOLS
  } else {
    symbolsToTry = [getYahooSymbol(symbol)]
  }
  
  // Try each symbol until one works
  for (const yahooSymbol of symbolsToTry) {
    const ohlc = await fetchYahooDataSingle(yahooSymbol, interval, range)
    if (ohlc && ohlc.closes.length >= 10) {
      indicatorCache.set(cacheKey, { data: ohlc, timestamp: Date.now() })
      return ohlc
    }
  }
  
  console.log(`[v0] All Yahoo symbols failed for ${symbol}`)
  return null
}

// ═══════════════════════════════
// MAIN INDICATOR FETCHERS
// ═══════════════════════════════

export async function fetchSwingIndicators(symbol: string): Promise<SwingIndicators | null> {
  try {
    console.log(`[v0] Fetching SWING indicators for ${symbol}`)
    
    // Fetch daily data for 1 year (needed for EMA200)
    const daily = await fetchYahooData(symbol, '1d', '1y')
    
    if (!daily) {
      console.log(`[v0] No daily data for ${symbol}`)
      return null
    }
    
    if (daily.closes.length < 50) {
      console.log(`[v0] Not enough daily data for ${symbol}: ${daily.closes.length} candles (need 50)`)
      return null
    }
    
    console.log(`[v0] Got ${daily.closes.length} daily candles for ${symbol}`)
    
    const closes = daily.closes
    const highs = daily.highs
    const lows = daily.lows
    
    // Calculate all indicators
    const ema50 = calculateEMA(closes, 50)
    const ema200 = closes.length >= 200 ? calculateEMA(closes, 200) : calculateEMA(closes, Math.min(closes.length, 100))
    const { macdLine, macdSignal, macdHist } = calculateMACD(closes)
    const rsi = calculateRSI(closes, 14)
    const adx = calculateADX(highs, lows, closes, 14)
    
    // Price momentum
    const currentPrice = closes[closes.length - 1]
    const price1M = closes.length > 22 ? closes[closes.length - 22] : closes[0]
    const price3M = closes.length > 66 ? closes[closes.length - 66] : closes[0]
    
    const change1M = ((currentPrice - price1M) / price1M) * 100
    const change3M = ((currentPrice - price3M) / price3M) * 100
    
    return {
      ema50,
      ema200,
      adx,
      macdLine,
      macdSignal,
      macdHist,
      rsi,
      change1M,
      change3M,
      sentiment: 0 // Would require Finnhub API key
    }
  } catch {
    return null
  }
}

export async function fetchDayIndicators(symbol: string): Promise<DayIndicators | null> {
  try {
    console.log(`[v0] Fetching DAY indicators for ${symbol}`)
    
    // Fetch hourly data for 1 month
    const hourly = await fetchYahooData(symbol, '1h', '1mo')
    
    if (!hourly) {
      console.log(`[v0] No hourly data for ${symbol}`)
      return null
    }
    
    if (hourly.closes.length < 30) {
      console.log(`[v0] Not enough hourly data for ${symbol}: ${hourly.closes.length} candles (need 30)`)
      return null
    }
    
    console.log(`[v0] Got ${hourly.closes.length} hourly candles for ${symbol}`)
    
    const closes = hourly.closes
    const highs = hourly.highs
    const lows = hourly.lows
    const currentPrice = closes[closes.length - 1]
    
    // Calculate all indicators
    const { macdLine, macdSignal } = calculateMACD(closes)
    const ema9 = calculateEMA(closes, 9)
    const ema21 = calculateEMA(closes, 21)
    const rsi = calculateRSI(closes, 14)
    const { stochK, stochD } = calculateStochastic(highs, lows, closes, 14)
    const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calculateBollingerBands(closes, 20, 2)
    const atr = calculateATR(highs, lows, closes, 14)
    const atrPct = currentPrice > 0 ? (atr / currentPrice) * 100 : 0
    
    return {
      macdLine,
      macdSignal,
      ema9,
      ema21,
      rsi,
      stochK,
      stochD,
      price: currentPrice,
      bbUpper,
      bbMiddle,
      bbLower,
      atr,
      atrPct,
      sentiment4h: 0 // Would require Finnhub API key
    }
  } catch {
    return null
  }
}

// ═══════════════════════════════
// UTILITY: Get instrument type
// ═══════════════════════════════
export function getInstrumentType(symbol: string): 'forex' | 'metal' | 'energy' | 'index' | 'crypto' | 'stock' {
  if (['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD', 'COPPER'].includes(symbol)) return 'metal'
  if (['USOIL', 'UKOIL', 'NATGAS', 'HEAT', 'GASOLINE'].includes(symbol)) return 'energy'
  if (['US30', 'US100', 'US500', 'GER40', 'UK100', 'JPN225', 'DXY'].includes(symbol)) return 'index'
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('XRP') || 
      symbol.includes('SOL') || symbol.includes('ADA') || symbol.includes('DOGE')) return 'crypto'
  if (symbol.includes('/')) return 'forex'
  return 'stock'
}
