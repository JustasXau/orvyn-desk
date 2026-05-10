import { NextResponse } from 'next/server'

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY

// Symbol mapping for different APIs
const symbolMapping: Record<string, { finnhub: string; twelveData: string; type: string }> = {
  'XAU/USD': { finnhub: 'GLD', twelveData: 'XAU/USD', type: 'forex' },
  'XAG/USD': { finnhub: 'SLV', twelveData: 'XAG/USD', type: 'forex' },
  'EUR/USD': { finnhub: 'FXE', twelveData: 'EUR/USD', type: 'forex' },
  'GBP/USD': { finnhub: 'FXB', twelveData: 'GBP/USD', type: 'forex' },
  'USD/JPY': { finnhub: 'FXY', twelveData: 'USD/JPY', type: 'forex' },
  'USD/CHF': { finnhub: 'FXF', twelveData: 'USD/CHF', type: 'forex' },
  'AUD/USD': { finnhub: 'FXA', twelveData: 'AUD/USD', type: 'forex' },
  'USD/CAD': { finnhub: 'FXC', twelveData: 'USD/CAD', type: 'forex' },
  'NZD/USD': { finnhub: 'NZDUSD', twelveData: 'NZD/USD', type: 'forex' },
  'US30': { finnhub: 'DIA', twelveData: 'DJI', type: 'index' },
  'US100': { finnhub: 'QQQ', twelveData: 'NDX', type: 'index' },
  'US500': { finnhub: 'SPY', twelveData: 'SPX', type: 'index' },
  'DXY': { finnhub: 'UUP', twelveData: 'DXY', type: 'index' },
  'GER40': { finnhub: 'EWG', twelveData: 'DAX', type: 'index' },
  'UK100': { finnhub: 'EWU', twelveData: 'FTSE', type: 'index' },
  'BTC/USD': { finnhub: 'BINANCE:BTCUSDT', twelveData: 'BTC/USD', type: 'crypto' },
  'ETH/USD': { finnhub: 'BINANCE:ETHUSDT', twelveData: 'ETH/USD', type: 'crypto' },
  'WTI': { finnhub: 'USO', twelveData: 'WTI/USD', type: 'commodity' },
  'BRENT': { finnhub: 'BNO', twelveData: 'BRENT/USD', type: 'commodity' },
}

interface CandleData {
  c: number[] // Close prices
  h: number[] // High prices
  l: number[] // Low prices
  o: number[] // Open prices
  t: number[] // Timestamps
  v: number[] // Volumes
  s: string   // Status
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

// Calculate Exponential Moving Average
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]
  const k = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  return ema
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  
  const recentChanges = changes.slice(-period)
  let gains = 0
  let losses = 0
  
  for (const change of recentChanges) {
    if (change > 0) gains += change
    else losses -= change
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// Calculate MACD
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macd = ema12 - ema26
  
  // Signal line (9-period EMA of MACD) - simplified
  const signal = macd * 0.9 // Approximation
  const histogram = macd - signal
  
  return { macd, signal, histogram }
}

// Determine bias based on technical indicators
function determineBias(
  currentPrice: number,
  sma20: number,
  sma50: number,
  sma200: number,
  ema9: number,
  ema21: number,
  rsi: number,
  macd: { macd: number; signal: number; histogram: number }
): { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] } {
  let bullSignals = 0
  let bearSignals = 0
  const signals: string[] = []
  
  // Price vs Moving Averages
  if (currentPrice > sma20) {
    bullSignals += 1
    signals.push('Prix > SMA20')
  } else {
    bearSignals += 1
    signals.push('Prix < SMA20')
  }
  
  if (currentPrice > sma50) {
    bullSignals += 1
    signals.push('Prix > SMA50')
  } else {
    bearSignals += 1
    signals.push('Prix < SMA50')
  }
  
  if (currentPrice > sma200) {
    bullSignals += 2 // More weight for long-term trend
    signals.push('Prix > SMA200 (tendance haussiere)')
  } else {
    bearSignals += 2
    signals.push('Prix < SMA200 (tendance baissiere)')
  }
  
  // EMA Crossover
  if (ema9 > ema21) {
    bullSignals += 1
    signals.push('EMA9 > EMA21')
  } else {
    bearSignals += 1
    signals.push('EMA9 < EMA21')
  }
  
  // Moving Average Alignment
  if (sma20 > sma50 && sma50 > sma200) {
    bullSignals += 2
    signals.push('Moyennes mobiles alignees a la hausse')
  } else if (sma20 < sma50 && sma50 < sma200) {
    bearSignals += 2
    signals.push('Moyennes mobiles alignees a la baisse')
  }
  
  // RSI
  if (rsi > 70) {
    bearSignals += 1
    signals.push(`RSI ${rsi.toFixed(0)} - Surachat`)
  } else if (rsi < 30) {
    bullSignals += 1
    signals.push(`RSI ${rsi.toFixed(0)} - Survente`)
  } else if (rsi > 50) {
    bullSignals += 0.5
    signals.push(`RSI ${rsi.toFixed(0)} - Zone haussiere`)
  } else {
    bearSignals += 0.5
    signals.push(`RSI ${rsi.toFixed(0)} - Zone baissiere`)
  }
  
  // MACD
  if (macd.histogram > 0) {
    bullSignals += 1
    signals.push('MACD positif')
  } else {
    bearSignals += 1
    signals.push('MACD negatif')
  }
  
  // Determine final bias
  const totalSignals = bullSignals + bearSignals
  const bullRatio = bullSignals / totalSignals
  
  let bias: 'bull' | 'bear' | 'neu' = 'neu'
  let confidence = 50
  
  if (bullRatio > 0.65) {
    bias = 'bull'
    confidence = Math.min(90, 50 + (bullRatio - 0.5) * 80)
  } else if (bullRatio < 0.35) {
    bias = 'bear'
    confidence = Math.min(90, 50 + (0.5 - bullRatio) * 80)
  } else {
    bias = 'neu'
    confidence = 50 + Math.abs(bullRatio - 0.5) * 40
  }
  
  return { bias, confidence: Math.round(confidence), signals }
}

// Fetch candle data from Finnhub
async function getCandles(symbol: string, resolution: string, from: number, to: number): Promise<CandleData | null> {
  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 300 } }) // Cache for 5 minutes
    
    if (!res.ok) return null
    const data = await res.json()
    
    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching candles:', error)
    return null
  }
}

// Calculate technical analysis for a symbol
async function analyzeSymbol(symbol: string): Promise<{
  swing: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }
  day: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }
  currentPrice: number
  source: string
}> {
  const mapping = symbolMapping[symbol]
  const finnhubSymbol = mapping?.finnhub || symbol
  
  const now = Math.floor(Date.now() / 1000)
  const oneYearAgo = now - 365 * 24 * 60 * 60
  const oneMonthAgo = now - 30 * 24 * 60 * 60
  
  // Try to get daily candles for swing analysis (longer timeframe)
  const dailyCandles = await getCandles(finnhubSymbol, 'D', oneYearAgo, now)
  
  // Try to get hourly candles for day trading analysis
  const hourlyCandles = await getCandles(finnhubSymbol, '60', oneMonthAgo, now)
  
  if (!dailyCandles && !hourlyCandles) {
    // Fallback: return simulated data based on current market conditions
    // This uses real-time sentiment from major financial sources
    return generateFallbackAnalysis(symbol)
  }
  
  // Swing Trading Analysis (Daily timeframe)
  let swingAnalysis = { bias: 'neu' as const, confidence: 50, signals: ['Donnees insuffisantes'] }
  let currentPrice = 0
  
  if (dailyCandles && dailyCandles.c.length >= 50) {
    const closes = dailyCandles.c
    currentPrice = closes[closes.length - 1]
    
    const sma20 = calculateSMA(closes, 20)
    const sma50 = calculateSMA(closes, 50)
    const sma200 = calculateSMA(closes, Math.min(200, closes.length))
    const ema9 = calculateEMA(closes, 9)
    const ema21 = calculateEMA(closes, 21)
    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    
    swingAnalysis = determineBias(currentPrice, sma20, sma50, sma200, ema9, ema21, rsi, macd)
  }
  
  // Day Trading Analysis (Hourly timeframe)
  let dayAnalysis = { bias: 'neu' as const, confidence: 50, signals: ['Donnees insuffisantes'] }
  
  if (hourlyCandles && hourlyCandles.c.length >= 50) {
    const closes = hourlyCandles.c
    if (currentPrice === 0) currentPrice = closes[closes.length - 1]
    
    const sma20 = calculateSMA(closes, 20)
    const sma50 = calculateSMA(closes, 50)
    const sma200 = calculateSMA(closes, Math.min(200, closes.length))
    const ema9 = calculateEMA(closes, 9)
    const ema21 = calculateEMA(closes, 21)
    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    
    dayAnalysis = determineBias(currentPrice, sma20, sma50, sma200, ema9, ema21, rsi, macd)
  } else {
    // If no hourly data, use daily but with different interpretation
    dayAnalysis = { ...swingAnalysis }
  }
  
  return {
    swing: swingAnalysis,
    day: dayAnalysis,
    currentPrice,
    source: 'finnhub'
  }
}

// No fallback - return neutral when data is unavailable
function generateFallbackAnalysis(symbol: string): {
  swing: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }
  day: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }
  currentPrice: number
  source: string
} {
  // Return neutral bias when real data is unavailable
  // No hardcoded demo data - user should see "data unavailable" state
  return {
    swing: { 
      bias: 'neu', 
      confidence: 0, 
      signals: ['Donnees de marche indisponibles', 'Verifiez la connexion API'] 
    },
    day: { 
      bias: 'neu', 
      confidence: 0, 
      signals: ['Donnees de marche indisponibles', 'Verifiez la connexion API'] 
    },
    currentPrice: 0,
    source: 'unavailable'
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'XAU/USD'
  
  try {
    const analysis = await analyzeSymbol(symbol)
    
    return NextResponse.json({
      symbol,
      ...analysis,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Technical analysis error:', error)
    
    // Return fallback on error
    const fallback = generateFallbackAnalysis(symbol)
    return NextResponse.json({
      symbol,
      ...fallback,
      timestamp: new Date().toISOString()
    })
  }
}

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json()
    
    if (!Array.isArray(symbols)) {
      return NextResponse.json({ error: 'symbols must be an array' }, { status: 400 })
    }
    
    const results: Record<string, Awaited<ReturnType<typeof analyzeSymbol>>> = {}
    
    await Promise.all(
      symbols.map(async (symbol: string) => {
        results[symbol] = await analyzeSymbol(symbol)
      })
    )
    
    return NextResponse.json({
      data: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Batch analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
