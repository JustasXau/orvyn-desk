import { NextRequest, NextResponse } from 'next/server'
import { calculateBias } from '@/lib/bias-engine-universal'
import { getYahooSymbol } from '@/lib/yahoo-symbols'
import { analysisApiLimiter, checkRateLimit } from '@/lib/rate-limit'

// Cache for storing computed data (5 minutes for bias data)
const dataCache = new Map<string, { data: PairData; timestamp: number }>()
const CACHE_TTL = 300000 // 5 minutes

interface PairData {
  price: number
  change: number
  changePercent: number
  change1M: number | null
  change3M: number | null
  change12M: number | null
  rsi: number | null
  swingBias: {
    bias: 'bull' | 'bear' | 'neu'
    confidence: number
    label: string
  }
  dayBias: {
    bias: 'bull' | 'bear' | 'neu'
    confidence: number
    label: string
  }
  spread: string
  source: string
}

// Spreads - keep as is
const SPREADS: Record<string, string> = {
  'EUR/USD': '0.8 pips', 'GBP/USD': '1.2 pips', 'USD/JPY': '1.0 pips',
  'XAU/USD': '0.35 USD', 'XAG/USD': '0.03 USD',
  'US30': '1.5 pts', 'US100': '1.0 pts', 'US500': '0.4 pts',
  'BTC/USD': '25 USD', 'ETH/USD': '1.5 USD',
  'WTI': '0.03 USD', 'BRENT': '0.04 USD',
}

// Convert direction to short bias
function convertBiasToApiFormat(direction: string): 'bull' | 'bear' | 'neu' {
  if (direction.toLowerCase().includes('bullish')) return 'bull'
  if (direction.toLowerCase().includes('bearish')) return 'bear'
  return 'neu'
}

// Fetch price data from Yahoo Finance - uses the SAME mapping as BiasEngine
async function fetchYahooPrice(symbol: string): Promise<{
  price: number
  change: number
  changePercent: number
  prices: number[]
} | null> {
  try {
    // Use getYahooSymbol from yahoo-symbols.ts to ensure consistency with BiasEngine
    const yahooSymbol = getYahooSymbol(symbol)
    console.log(`[Pair Data] ${symbol} → Yahoo Symbol: ${yahooSymbol}`)
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1y`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    })
    
    if (!response.ok) {
      console.error(`[Pair Data] Yahoo Finance error ${response.status} for ${yahooSymbol}`)
      return null
    }
    const data = await response.json() as any
    
    const result = data.chart?.result?.[0]
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      console.error(`[Pair Data] No data in Yahoo response for ${yahooSymbol}`)
      return null
    }
    
    const quotes = result.indicators.quote[0]
    const closes = quotes.close || []
    const currentPrice = closes[closes.length - 1] || 0
    const previousClose = closes[closes.length - 2] || currentPrice
    
    return {
      price: currentPrice,
      change: currentPrice - previousClose,
      changePercent: ((currentPrice - previousClose) / previousClose) * 100,
      prices: closes
    }
  } catch (error) {
    console.error(`[Pair Data] Exception fetching ${symbol}:`, error instanceof Error ? error.message : String(error))
    return null
  }
}

// Main handler
export async function GET(request: NextRequest) {
  const rateLimitCheck = await checkRateLimit(request, analysisApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }

  try {
    const symbol = request.nextUrl.searchParams.get('symbol') || 'XAU/USD'
    
    // Check cache
    const cached = dataCache.get(symbol)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }
    
    console.log(`[Pair Data] Fetching ${symbol}`)
    
    // Fetch price and bias in parallel
    const [yahooData, biasResult] = await Promise.all([
      fetchYahooPrice(symbol),
      calculateBias(symbol)
    ])
    
    if (!yahooData) {
      return NextResponse.json({
        error: `No data for ${symbol}`
      }, { status: 404 })
    }
    
    // Calculate period changes
    const prices = yahooData.prices || []
    const currentPrice = yahooData.price || 0
    
    const change1M = prices.length >= 22 
      ? ((currentPrice - prices[Math.max(0, prices.length - 22)]) / prices[Math.max(0, prices.length - 22)]) * 100 
      : null
    
    const change3M = prices.length >= 66 
      ? ((currentPrice - prices[Math.max(0, prices.length - 66)]) / prices[Math.max(0, prices.length - 66)]) * 100 
      : null
    
    const change12M = prices.length >= 252 
      ? ((currentPrice - prices[0]) / prices[0]) * 100 
      : (prices.length > 100 ? ((currentPrice - prices[0]) / prices[0]) * 100 : null)
    
    // Build response
    const pairData: PairData = {
      price: yahooData.price,
      change: yahooData.change,
      changePercent: yahooData.changePercent,
      change1M,
      change3M,
      change12M,
      rsi: null, // Would need to calculate from OHLC
      swingBias: {
        bias: convertBiasToApiFormat(biasResult.swing.direction),
        confidence: biasResult.swing.confidence,
        label: biasResult.swing.direction
      },
      dayBias: {
        bias: convertBiasToApiFormat(biasResult.day.direction),
        confidence: biasResult.day.confidence,
        label: biasResult.day.direction
      },
      spread: SPREADS[symbol] || 'N/A',
      source: 'YahooFinance + BiasEngine v2'
    }
    
    // Cache result
    dataCache.set(symbol, { data: pairData, timestamp: Date.now() })
    
    console.log(`[Pair Data] ${symbol}: Swing ${pairData.swingBias.label}(${pairData.swingBias.confidence}%), Day ${pairData.dayBias.label}(${pairData.dayBias.confidence}%)`)
    
    return NextResponse.json(pairData)
  } catch (error) {
    console.error('[Pair Data] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch pair data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
