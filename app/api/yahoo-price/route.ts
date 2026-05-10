import { NextRequest, NextResponse } from "next/server"
import { priceApiLimiter, checkRateLimit } from '@/lib/rate-limit'

// Cache for prices (30 second TTL for real-time feel)
const priceCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

// Symbol mapping to Yahoo Finance symbols
const SYMBOL_MAP: Record<string, string> = {
  // Metals
  'XAU/USD': 'GC=F',    // Gold Futures
  'XAG/USD': 'SI=F',    // Silver Futures
  'XPT/USD': 'PL=F',    // Platinum Futures
  'XPD/USD': 'PA=F',    // Palladium Futures
  // Energy - CFD to Futures
  'USOIL': 'CL=F',      // WTI Crude Oil Futures
  'UKOIL': 'BZ=F',      // Brent Crude Oil Futures
  'NATGAS': 'NG=F',     // Natural Gas Futures
  'HEAT': 'HO=F',       // Heating Oil Futures
  'GASOLINE': 'RB=F',   // RBOB Gasoline Futures
  // Indices - E-mini Futures (CFD equivalent)
  'US30': 'YM=F',       // Dow Jones E-mini
  'US100': 'NQ=F',      // Nasdaq E-mini
  'US500': 'ES=F',      // S&P 500 E-mini
  'DXY': 'DX-Y.NYB',    // US Dollar Index
  'GER40': '^GDAXI',    // DAX
  'UK100': '^FTSE',     // FTSE 100
  'JPN225': '^N225',    // Nikkei 225
  'VIX': '^VIX',        // Volatility Index
  // Agriculture
  'WHEAT': 'ZW=F',      // Wheat Futures
  'CORN': 'ZC=F',       // Corn Futures
  'SOYBN': 'ZS=F',      // Soybeans Futures
  'COFFEE': 'KC=F',     // Coffee Futures
  'SUGAR': 'SB=F',      // Sugar Futures
  'COCOA': 'CC=F',      // Cocoa Futures
  'COTTON': 'CT=F',     // Cotton Futures
  // Industrial Metals
  'COPPER': 'HG=F',     // Copper Futures
  'ALUM': 'ALI=F',      // Aluminum Futures
}

// Convert trading symbol to Yahoo Finance symbol
function toYahooSymbol(symbol: string): string {
  // Check direct mapping first
  if (SYMBOL_MAP[symbol]) return SYMBOL_MAP[symbol]
  // Crypto
  if (symbol.includes('BTC')) return 'BTC-USD'
  if (symbol.includes('ETH')) return 'ETH-USD'
  if (symbol.includes('XRP')) return 'XRP-USD'
  if (symbol.includes('SOL')) return 'SOL-USD'
  if (symbol.includes('ADA')) return 'ADA-USD'
  if (symbol.includes('DOGE')) return 'DOGE-USD'
  // Forex - convert EUR/USD to EURUSD=X
  if (symbol.includes('/')) return symbol.replace('/', '') + '=X'
  return symbol
}

export async function GET(request: NextRequest) {
  // Rate limiting - 100 requetes/min par utilisateur
  const rateLimitCheck = await checkRateLimit(request, priceApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }
  
  const symbol = request.nextUrl.searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  
  // Convert to Yahoo symbol
  const yahooSymbol = toYahooSymbol(symbol)
  
  // Check cache
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }
  
  try {
    // Yahoo Finance quote endpoint - use converted symbol
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 30 }
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
    }
    
    const data = await res.json()
    const result = data.chart?.result?.[0]
    
    if (!result) {
      return NextResponse.json({ error: 'No data' }, { status: 404 })
    }
    
    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    
    // Get current price
    const price = meta.regularMarketPrice || meta.previousClose || 0
    const previousClose = meta.chartPreviousClose || meta.previousClose || price
    
    // Calculate change
    const change = price - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    
    // Get high/low from today's data
    const closes = quote?.close?.filter((c: number | null) => c !== null) || []
    const highs = quote?.high?.filter((h: number | null) => h !== null) || []
    const lows = quote?.low?.filter((l: number | null) => l !== null) || []
    
    const high = highs.length > 0 ? Math.max(...highs) : price
    const low = lows.length > 0 ? Math.min(...lows) : price
    
    const response = {
      symbol: meta.symbol,
      price,
      change,
      changePercent,
      high,
      low,
      previousClose,
      currency: meta.currency,
      timestamp: Date.now()
    }
    
    // Cache the result
    priceCache.set(symbol, { data: response, timestamp: Date.now() })
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[v0] Yahoo price error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
