import { NextResponse } from 'next/server'

// Centralized data store for consistency across all components
const unifiedCache = new Map<string, { data: UnifiedMarketData; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

interface UnifiedMarketData {
  symbol: string
  price: number
  previousPrice: number
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
  sentiment: number
  lastUpdate: string
  source: string
}

// Yahoo Finance symbol mapping - REAL prices, not ETF proxies
const yahooSymbolMap: Record<string, string> = {
  // Metals - Futures (real gold/silver prices)
  'XAU/USD': 'GC=F',    // Gold Futures ~3300 USD
  'XAG/USD': 'SI=F',    // Silver Futures ~32 USD
  // Forex - Spot rates
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'USD/CHF': 'USDCHF=X',
  'AUD/USD': 'AUDUSD=X',
  'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X',
  'EUR/GBP': 'EURGBP=X',
  'EUR/JPY': 'EURJPY=X',
  'GBP/JPY': 'GBPJPY=X',
  // Indices - E-mini Futures (closer to CFD prices)
  'US30': 'YM=F',       // Dow Jones E-mini ~41000
  'US100': 'NQ=F',      // Nasdaq E-mini ~20000
  'US500': 'ES=F',      // S&P 500 E-mini ~5600
  'DXY': 'DX-Y.NYB',    // US Dollar Index ~100
  'GER40': '^GDAXI',    // DAX
  'UK100': '^FTSE',     // FTSE 100
  'JPN225': '^N225',    // Nikkei 225
  'VIX': '^VIX',        // Volatility Index
  // Crypto
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
  'XRP/USD': 'XRP-USD',
  'SOL/USD': 'SOL-USD',
  'ADA/USD': 'ADA-USD',
  'DOGE/USD': 'DOGE-USD',
  // Commodities - Futures
  'USOIL': 'CL=F',      // WTI Crude Oil
  'UKOIL': 'BZ=F',      // Brent Crude
  'NATGAS': 'NG=F',     // Natural Gas
  'COPPER': 'HG=F',     // Copper
}

// Get Yahoo Finance symbol for a trading symbol
function getYahooSymbol(symbol: string): string {
  if (yahooSymbolMap[symbol]) return yahooSymbolMap[symbol]
  // Forex conversion
  if (symbol.includes('/')) return symbol.replace('/', '') + '=X'
  return symbol
}

// Fetch real-time quote from Yahoo Finance (real prices, not ETF proxies)
async function getQuote(symbol: string): Promise<{ c: number; pc: number; dp: number; h: number; l: number; o: number } | null> {
  try {
    const yahooSymbol = getYahooSymbol(symbol)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`
    const res = await fetch(url, { 
      next: { revalidate: 30 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!res.ok) return null
    const data = await res.json()
    
    const result = data?.chart?.result?.[0]
    if (!result) return null
    
    const meta = result.meta
    const quotes = result.indicators?.quote?.[0]
    
    if (!meta?.regularMarketPrice) return null
    
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice
    const changePercent = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0
    
    // Get today's OHLC from quotes array (last entry)
    const lastIdx = quotes?.close?.length ? quotes.close.length - 1 : 0
    const high = quotes?.high?.[lastIdx] || meta.regularMarketDayHigh || currentPrice
    const low = quotes?.low?.[lastIdx] || meta.regularMarketDayLow || currentPrice
    const open = quotes?.open?.[lastIdx] || meta.regularMarketOpen || previousClose
    
    return {
      c: currentPrice,
      pc: previousClose,
      dp: changePercent,
      h: high,
      l: low,
      o: open
    }
  } catch {
    return null
  }
}

// Fetch historical candle data from Yahoo Finance for technical analysis
async function getCandles(symbol: string, range: string, interval?: string): Promise<number[] | null> {
  try {
    const yahooSymbol = getYahooSymbol(symbol)
    // range: '6mo' for daily swing, '1mo' for hourly day trading, '5d' for H4
    const autoInterval = range === '6mo' ? '1d' : range === '5d' ? '1h' : '1h'
    const finalInterval = interval || autoInterval
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${finalInterval}&range=${range}`
    const res = await fetch(url, { 
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!res.ok) return null
    const data = await res.json()
    
    const result = data?.chart?.result?.[0]
    const closes = result?.indicators?.quote?.[0]?.close
    if (!closes || closes.length === 0) return null
    
    // Filter out null values
    return closes.filter((c: number | null) => c !== null) as number[]
  } catch {
    return null
  }
}

// Fetch real H4 candles - aggregate from 1h data properly
async function getH4Candles(symbol: string): Promise<number[] | null> {
  try {
    const yahooSymbol = getYahooSymbol(symbol)
    // Get 10 days of hourly data, then aggregate to H4
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1h&range=10d`
    const res = await fetch(url, { 
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!res.ok) return null
    const data = await res.json()
    
    const result = data?.chart?.result?.[0]
    const timestamps = result?.timestamp
    const quotes = result?.indicators?.quote?.[0]
    if (!timestamps || !quotes?.close) return null
    
    // Aggregate H1 to H4: group by 4-hour blocks and take the close of each block
    const h4Candles: number[] = []
    for (let i = 3; i < quotes.close.length; i += 4) {
      const close = quotes.close[i]
      if (close !== null && close > 0) {
        h4Candles.push(close)
      }
    }
    
    return h4Candles.length >= 10 ? h4Candles : null
  } catch {
    return null
  }
}

// Calculate technical indicators
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]
  const k = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  return ema
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  const recentChanges = changes.slice(-period)
  let gains = 0, losses = 0
  for (const change of recentChanges) {
    if (change > 0) gains += change
    else losses -= change
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  return 100 - (100 / (1 + avgGain / avgLoss))
}

// Determine bias from price data
function determineBias(prices: number[]): { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] } {
  if (prices.length < 20) {
    return { bias: 'neu', confidence: 50, signals: ['Donnees insuffisantes'] }
  }
  
  const currentPrice = prices[prices.length - 1]
  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, Math.min(50, prices.length))
  const ema9 = calculateEMA(prices, 9)
  const ema21 = calculateEMA(prices, 21)
  const rsi = calculateRSI(prices, 14)
  
  let bullScore = 0
  let bearScore = 0
  const signals: string[] = []
  
  // Price vs SMA20
  if (currentPrice > sma20) {
    bullScore += 2
    signals.push('Prix > SMA20')
  } else {
    bearScore += 2
    signals.push('Prix < SMA20')
  }
  
  // Price vs SMA50
  if (currentPrice > sma50) {
    bullScore += 2
    signals.push('Prix > SMA50')
  } else {
    bearScore += 2
    signals.push('Prix < SMA50')
  }
  
  // EMA crossover
  if (ema9 > ema21) {
    bullScore += 1
    signals.push('EMA9 > EMA21')
  } else {
    bearScore += 1
    signals.push('EMA9 < EMA21')
  }
  
  // RSI
  if (rsi > 60) {
    bullScore += 1
    signals.push(`RSI ${rsi.toFixed(0)} - Zone haussiere`)
  } else if (rsi < 40) {
    bearScore += 1
    signals.push(`RSI ${rsi.toFixed(0)} - Zone baissiere`)
  } else {
    signals.push(`RSI ${rsi.toFixed(0)} - Neutre`)
  }
  
  // Trend direction (last 10 vs last 20)
  const recent = calculateSMA(prices.slice(-10), 10)
  const older = calculateSMA(prices.slice(-20, -10), 10)
  if (recent > older * 1.01) {
    bullScore += 1
    signals.push('Tendance ascendante')
  } else if (recent < older * 0.99) {
    bearScore += 1
    signals.push('Tendance descendante')
  }
  
  const total = bullScore + bearScore
  const bullRatio = bullScore / total
  
  let bias: 'bull' | 'bear' | 'neu' = 'neu'
  let confidence = 50
  
  if (bullRatio >= 0.65) {
    bias = 'bull'
    confidence = Math.min(85, 50 + Math.round((bullRatio - 0.5) * 70))
  } else if (bullRatio <= 0.35) {
    bias = 'bear'
    confidence = Math.min(85, 50 + Math.round((0.5 - bullRatio) * 70))
  } else {
    bias = 'neu'
    confidence = 50 + Math.round(Math.abs(bullRatio - 0.5) * 30)
  }
  
  return { bias, confidence, signals }
}

// Calculate sentiment from bias (0-100)
function calculateSentiment(swingBias: { bias: string; confidence: number }, dayBias: { bias: string; confidence: number }): number {
  let score = 50
  
  // Swing bias weight: 60%
  if (swingBias.bias === 'bull') {
    score += (swingBias.confidence - 50) * 0.6
  } else if (swingBias.bias === 'bear') {
    score -= (swingBias.confidence - 50) * 0.6
  }
  
  // Day bias weight: 40%
  if (dayBias.bias === 'bull') {
    score += (dayBias.confidence - 50) * 0.4
  } else if (dayBias.bias === 'bear') {
    score -= (dayBias.confidence - 50) * 0.4
  }
  
  return Math.min(95, Math.max(5, Math.round(score)))
}

// Calculate bias from quote data when candles are not available
function calculateBiasFromQuote(
  quote: { c: number; pc: number; dp: number; h: number; l: number; o: number },
  multiplier: number
): { swing: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }; day: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] } } {
  const currentPrice = quote.c * multiplier
  const previousClose = quote.pc * multiplier
  const high = quote.h * multiplier
  const low = quote.l * multiplier
  const open = quote.o * multiplier
  const changePercent = quote.dp
  
  let bullScore = 0
  let bearScore = 0
  const signals: string[] = []
  
  // 1. Price momentum (change %)
  if (changePercent > 0.5) {
    bullScore += 3
    signals.push(`Hausse +${changePercent.toFixed(2)}%`)
  } else if (changePercent > 0.1) {
    bullScore += 2
    signals.push(`Legere hausse +${changePercent.toFixed(2)}%`)
  } else if (changePercent < -0.5) {
    bearScore += 3
    signals.push(`Baisse ${changePercent.toFixed(2)}%`)
  } else if (changePercent < -0.1) {
    bearScore += 2
    signals.push(`Legere baisse ${changePercent.toFixed(2)}%`)
  }
  
  // 2. Candle position (where price is in today's range)
  const range = high - low
  if (range > 0) {
    const positionInRange = (currentPrice - low) / range
    if (positionInRange > 0.75) {
      bullScore += 2
      signals.push('Prix proche du plus haut')
    } else if (positionInRange > 0.5) {
      bullScore += 1
      signals.push('Prix au-dessus du milieu')
    } else if (positionInRange < 0.25) {
      bearScore += 2
      signals.push('Prix proche du plus bas')
    } else if (positionInRange < 0.5) {
      bearScore += 1
      signals.push('Prix en-dessous du milieu')
    }
  }
  
  // 3. Open vs Close (bullish/bearish candle)
  if (currentPrice > open) {
    bullScore += 2
    signals.push('Bougie haussiere')
  } else if (currentPrice < open) {
    bearScore += 2
    signals.push('Bougie baissiere')
  }
  
  // 4. Price vs previous close
  if (currentPrice > previousClose * 1.005) {
    bullScore += 1
    signals.push('Au-dessus cloture precedente')
  } else if (currentPrice < previousClose * 0.995) {
    bearScore += 1
    signals.push('En-dessous cloture precedente')
  }
  
  // 5. Range expansion (volatility)
  const avgRange = previousClose * 0.01 // Assume 1% average range
  if (range > avgRange * 1.5) {
    // High volatility - trend confirmation
    if (bullScore > bearScore) {
      bullScore += 1
      signals.push('Forte volatilite haussiere')
    } else if (bearScore > bullScore) {
      bearScore += 1
      signals.push('Forte volatilite baissiere')
    }
  }
  
  // Calculate final bias and confidence
  const total = bullScore + bearScore
  const bullRatio = total > 0 ? bullScore / total : 0.5
  
  let dayBias: 'bull' | 'bear' | 'neu' = 'neu'
  let dayConfidence = 50
  
  if (bullRatio >= 0.65) {
    dayBias = 'bull'
    dayConfidence = Math.min(85, 50 + Math.round((bullRatio - 0.5) * 100))
  } else if (bullRatio <= 0.35) {
    dayBias = 'bear'
    dayConfidence = Math.min(85, 50 + Math.round((0.5 - bullRatio) * 100))
  } else {
    dayConfidence = 50 + Math.round(Math.abs(bullRatio - 0.5) * 40)
  }
  
  // Swing bias is similar but with slightly less confidence (no historical data)
  const swingBias: 'bull' | 'bear' | 'neu' = dayBias
  const swingConfidence = Math.max(45, dayConfidence - 5)
  
  return {
    swing: { bias: swingBias, confidence: swingConfidence, signals: [...signals, 'Base sur donnees en temps reel'] },
    day: { bias: dayBias, confidence: dayConfidence, signals }
  }
}

// Fetch unified data for a symbol
async function fetchUnifiedData(symbol: string): Promise<UnifiedMarketData> {
  // Get current quote with full data from Yahoo Finance (real prices)
  const quote = await getQuote(symbol)
  let price = 0
  let previousPrice = 0
  let change = 0
  let changePercent = 0
  let source = 'yahoo'
  
  let swingBias = { bias: 'neu' as const, confidence: 50, signals: ['Donnees non disponibles'] }
  let dayBias = { bias: 'neu' as const, confidence: 50, signals: ['Donnees non disponibles'] }
  
  if (quote && quote.c > 0) {
    price = quote.c       // Real price, no multiplier needed
    previousPrice = quote.pc
    change = price - previousPrice
    changePercent = quote.dp
    
    // Calculate bias from quote data
    const biasData = calculateBiasFromQuote(quote, 1)  // No multiplier
    swingBias = biasData.swing
    dayBias = biasData.day
  } else {
    source = 'unavailable'
  }
  
  // Get historical candles from Yahoo Finance for technical analysis
  const dailyPrices = await getCandles(symbol, '6mo')   // 6 months daily for swing
  const hourlyPrices = await getCandles(symbol, '1mo')  // 1 month hourly for day trading
  
  // Override with candle-based bias if available (more accurate)
  if (dailyPrices && dailyPrices.length >= 20) {
    swingBias = determineBias(dailyPrices)
    if (price === 0) price = dailyPrices[dailyPrices.length - 1]
  }
  
  if (hourlyPrices && hourlyPrices.length >= 20) {
    dayBias = determineBias(hourlyPrices)
  }
  
  // Calculate H4 bias from real aggregated H4 candles
  let h4Bias = { bias: 'neu' as const, confidence: 50, signals: [] as string[] }
  const h4Prices = await getH4Candles(symbol)
  if (h4Prices && h4Prices.length >= 10) {
    h4Bias = determineBias(h4Prices)
  } else if (hourlyPrices && hourlyPrices.length >= 20) {
    // Fallback: aggregate from hourly if H4 fetch fails
    const aggregatedH4: number[] = []
    for (let i = 3; i < hourlyPrices.length; i += 4) {
      aggregatedH4.push(hourlyPrices[i])
    }
    if (aggregatedH4.length >= 10) {
      h4Bias = determineBias(aggregatedH4)
    } else {
      h4Bias = { ...dayBias, confidence: Math.round(dayBias.confidence * 0.9) }
    }
  } else {
    h4Bias = { ...dayBias, confidence: Math.round(dayBias.confidence * 0.9) }
  }
  
  // Calculate H1 bias (more recent hourly data)
  let h1Bias = { bias: 'neu' as const, confidence: 50, signals: [] as string[] }
  if (hourlyPrices && hourlyPrices.length >= 10) {
    // Use last 24 hours
    const recentHourly = hourlyPrices.slice(-24)
    h1Bias = determineBias(recentHourly)
  } else {
    h1Bias = { ...dayBias, confidence: Math.round(dayBias.confidence * 0.8) }
  }
  
  // Calculate trend (longer term momentum from daily data)
  let trend = 0
  if (dailyPrices && dailyPrices.length >= 50) {
    const ma20 = dailyPrices.slice(-20).reduce((a, b) => a + b, 0) / 20
    const ma50 = dailyPrices.slice(-50).reduce((a, b) => a + b, 0) / 50
    const currentPrice = dailyPrices[dailyPrices.length - 1]
    
    // Trend strength: positive if above both MAs, negative if below both
    if (currentPrice > ma20 && ma20 > ma50) {
      trend = Math.min(100, Math.round(((currentPrice - ma50) / ma50) * 500))
    } else if (currentPrice < ma20 && ma20 < ma50) {
      trend = Math.max(-100, Math.round(((currentPrice - ma50) / ma50) * 500))
    } else {
      trend = Math.round(((currentPrice - ma20) / ma20) * 300)
    }
  } else if (swingBias.bias === 'bull') {
    trend = swingBias.confidence * 0.7
  } else if (swingBias.bias === 'bear') {
    trend = -swingBias.confidence * 0.7
  }
  
  // Calculate momentum (rate of change)
  let momentum = 0
  if (dailyPrices && dailyPrices.length >= 14) {
    const currentPrice = dailyPrices[dailyPrices.length - 1]
    const priceNDaysAgo = dailyPrices[dailyPrices.length - 14]
    momentum = Math.max(-100, Math.min(100, Math.round(((currentPrice - priceNDaysAgo) / priceNDaysAgo) * 500)))
  } else if (changePercent !== 0) {
    momentum = Math.max(-100, Math.min(100, Math.round(changePercent * 20)))
  }
  
  // Calculate sentiment score
  const sentiment = calculateSentiment(swingBias, dayBias)
  
  return {
    symbol,
    price,
    previousPrice,
    change,
    changePercent,
    swing: swingBias,
    day: dayBias,
    h4: h4Bias,
    h1: h1Bias,
    trend,
    momentum,
    sentiment,
    lastUpdate: new Date().toISOString(),
    source
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const symbols = searchParams.get('symbols')
  
  try {
    if (symbols) {
      // Batch request
      const symbolList = symbols.split(',').map(s => s.trim())
      const results: Record<string, UnifiedMarketData> = {}
      
      await Promise.all(
        symbolList.map(async (sym) => {
          // Check cache first
          const cached = unifiedCache.get(sym)
          if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            results[sym] = cached.data
          } else {
            const data = await fetchUnifiedData(sym)
            unifiedCache.set(sym, { data, timestamp: Date.now() })
            results[sym] = data
          }
        })
      )
      
      return NextResponse.json({
        data: results,
        timestamp: new Date().toISOString()
      })
    } else if (symbol) {
      // Single symbol request
      const cached = unifiedCache.get(symbol)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data)
      }
      
      const data = await fetchUnifiedData(symbol)
      unifiedCache.set(symbol, { data, timestamp: Date.now() })
      
      return NextResponse.json(data)
    } else {
      return NextResponse.json({ error: 'symbol or symbols parameter required' }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Unified data error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
