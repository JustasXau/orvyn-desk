import { NextResponse } from 'next/server'

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY

// Symbol mappings for Alpha Vantage
const FOREX_MAP: Record<string, { from: string; to: string }> = {
  'EUR/USD': { from: 'EUR', to: 'USD' },
  'GBP/USD': { from: 'GBP', to: 'USD' },
  'USD/JPY': { from: 'USD', to: 'JPY' },
  'AUD/USD': { from: 'AUD', to: 'USD' },
  'USD/CHF': { from: 'USD', to: 'CHF' },
  'USD/CAD': { from: 'USD', to: 'CAD' },
  'NZD/USD': { from: 'NZD', to: 'USD' },
  'EUR/GBP': { from: 'EUR', to: 'GBP' },
  'EUR/JPY': { from: 'EUR', to: 'JPY' },
  'GBP/JPY': { from: 'GBP', to: 'JPY' },
  'XAU/USD': { from: 'XAU', to: 'USD' },
  'XAG/USD': { from: 'XAG', to: 'USD' },
}

const INDEX_MAP: Record<string, string> = {
  'US30': 'DIA', 'US100': 'QQQ', 'US500': 'SPY',
  'UK100': 'EWU', 'GER40': 'EWG', 'FRA40': 'EWQ',
  'JPN225': 'EWJ', 'AUS200': 'EWA',
}

// Fetch RSI from Alpha Vantage
async function fetchRSI(symbol: string, interval: string = 'daily'): Promise<number | null> {
  try {
    // Determine the right symbol format
    let avSymbol = symbol
    let isForex = false
    
    if (FOREX_MAP[symbol]) {
      const { from, to } = FOREX_MAP[symbol]
      avSymbol = `${from}${to}`
      isForex = true
    } else if (INDEX_MAP[symbol]) {
      avSymbol = INDEX_MAP[symbol]
    }
    
    const func = isForex ? 'RSI' : 'RSI'
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${avSymbol}&interval=${interval}&time_period=14&series_type=close&apikey=${AV_KEY}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } }) // Cache 1h
    if (!res.ok) return null
    
    const data = await res.json()
    const key = `Technical Analysis: RSI`
    const rsiData = data[key]
    
    if (!rsiData) return null
    
    const dates = Object.keys(rsiData).sort().reverse()
    if (dates.length === 0) return null
    
    return parseFloat(rsiData[dates[0]]?.RSI || '50')
  } catch {
    return null
  }
}

// Fetch MACD from Alpha Vantage
async function fetchMACD(symbol: string, interval: string = 'daily'): Promise<{
  macd: number | null
  signal: number | null
  histogram: number | null
}> {
  try {
    let avSymbol = symbol
    
    if (FOREX_MAP[symbol]) {
      const { from, to } = FOREX_MAP[symbol]
      avSymbol = `${from}${to}`
    } else if (INDEX_MAP[symbol]) {
      avSymbol = INDEX_MAP[symbol]
    }
    
    const url = `https://www.alphavantage.co/query?function=MACD&symbol=${avSymbol}&interval=${interval}&series_type=close&apikey=${AV_KEY}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return { macd: null, signal: null, histogram: null }
    
    const data = await res.json()
    const macdData = data['Technical Analysis: MACD']
    
    if (!macdData) return { macd: null, signal: null, histogram: null }
    
    const dates = Object.keys(macdData).sort().reverse()
    if (dates.length === 0) return { macd: null, signal: null, histogram: null }
    
    const latest = macdData[dates[0]]
    return {
      macd: parseFloat(latest?.MACD || '0'),
      signal: parseFloat(latest?.MACD_Signal || '0'),
      histogram: parseFloat(latest?.MACD_Hist || '0')
    }
  } catch {
    return { macd: null, signal: null, histogram: null }
  }
}

// Fetch ATR for volatility
async function fetchATR(symbol: string, interval: string = 'daily'): Promise<number | null> {
  try {
    let avSymbol = symbol
    
    if (FOREX_MAP[symbol]) {
      const { from, to } = FOREX_MAP[symbol]
      avSymbol = `${from}${to}`
    } else if (INDEX_MAP[symbol]) {
      avSymbol = INDEX_MAP[symbol]
    }
    
    const url = `https://www.alphavantage.co/query?function=ATR&symbol=${avSymbol}&interval=${interval}&time_period=14&apikey=${AV_KEY}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    
    const data = await res.json()
    const atrData = data['Technical Analysis: ATR']
    
    if (!atrData) return null
    
    const dates = Object.keys(atrData).sort().reverse()
    if (dates.length === 0) return null
    
    return parseFloat(atrData[dates[0]]?.ATR || '0')
  } catch {
    return null
  }
}

// Fetch ADX for trend strength
async function fetchADX(symbol: string, interval: string = 'daily'): Promise<number | null> {
  try {
    let avSymbol = symbol
    
    if (FOREX_MAP[symbol]) {
      const { from, to } = FOREX_MAP[symbol]
      avSymbol = `${from}${to}`
    } else if (INDEX_MAP[symbol]) {
      avSymbol = INDEX_MAP[symbol]
    }
    
    const url = `https://www.alphavantage.co/query?function=ADX&symbol=${avSymbol}&interval=${interval}&time_period=14&apikey=${AV_KEY}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    
    const data = await res.json()
    const adxData = data['Technical Analysis: ADX']
    
    if (!adxData) return null
    
    const dates = Object.keys(adxData).sort().reverse()
    if (dates.length === 0) return null
    
    return parseFloat(adxData[dates[0]]?.ADX || '0')
  } catch {
    return null
  }
}

// Fetch EMA
async function fetchEMA(symbol: string, period: number, interval: string = 'daily'): Promise<number | null> {
  try {
    let avSymbol = symbol
    
    if (FOREX_MAP[symbol]) {
      const { from, to } = FOREX_MAP[symbol]
      avSymbol = `${from}${to}`
    } else if (INDEX_MAP[symbol]) {
      avSymbol = INDEX_MAP[symbol]
    }
    
    const url = `https://www.alphavantage.co/query?function=EMA&symbol=${avSymbol}&interval=${interval}&time_period=${period}&series_type=close&apikey=${AV_KEY}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    
    const data = await res.json()
    const emaData = data['Technical Analysis: EMA']
    
    if (!emaData) return null
    
    const dates = Object.keys(emaData).sort().reverse()
    if (dates.length === 0) return null
    
    return parseFloat(emaData[dates[0]]?.EMA || '0')
  } catch {
    return null
  }
}

// Fetch Stochastic
async function fetchStochastic(symbol: string, interval: string = 'daily'): Promise<{
  k: number | null
  d: number | null
}> {
  try {
    let avSymbol = symbol
    
    if (FOREX_MAP[symbol]) {
      const { from, to } = FOREX_MAP[symbol]
      avSymbol = `${from}${to}`
    } else if (INDEX_MAP[symbol]) {
      avSymbol = INDEX_MAP[symbol]
    }
    
    const url = `https://www.alphavantage.co/query?function=STOCH&symbol=${avSymbol}&interval=${interval}&apikey=${AV_KEY}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return { k: null, d: null }
    
    const data = await res.json()
    const stochData = data['Technical Analysis: STOCH']
    
    if (!stochData) return { k: null, d: null }
    
    const dates = Object.keys(stochData).sort().reverse()
    if (dates.length === 0) return { k: null, d: null }
    
    const latest = stochData[dates[0]]
    return {
      k: parseFloat(latest?.SlowK || '50'),
      d: parseFloat(latest?.SlowD || '50')
    }
  } catch {
    return { k: null, d: null }
  }
}

// Calculate volatility level from ATR
function getVolatilityLevel(atr: number | null, price: number): 'low' | 'medium' | 'high' {
  if (!atr || !price) return 'medium'
  const atrPercent = (atr / price) * 100
  if (atrPercent < 0.5) return 'low'
  if (atrPercent > 1.5) return 'high'
  return 'medium'
}

// Calculate RSI interpretation
function getRSIInterpretation(rsi: number | null): {
  status: 'overbought' | 'oversold' | 'neutral'
  description: string
} {
  if (!rsi) return { status: 'neutral', description: 'Donnees indisponibles' }
  if (rsi >= 70) return { status: 'overbought', description: 'Suracheté - potentiel retournement baissier' }
  if (rsi <= 30) return { status: 'oversold', description: 'Survendu - potentiel rebond haussier' }
  return { status: 'neutral', description: 'Zone neutre' }
}

// Typical spreads for instruments (in pips or points)
const TYPICAL_SPREADS: Record<string, { value: number; unit: string }> = {
  'EUR/USD': { value: 0.8, unit: 'pips' },
  'GBP/USD': { value: 1.2, unit: 'pips' },
  'USD/JPY': { value: 1.0, unit: 'pips' },
  'AUD/USD': { value: 1.0, unit: 'pips' },
  'USD/CHF': { value: 1.2, unit: 'pips' },
  'USD/CAD': { value: 1.5, unit: 'pips' },
  'NZD/USD': { value: 1.5, unit: 'pips' },
  'EUR/GBP': { value: 1.5, unit: 'pips' },
  'EUR/JPY': { value: 1.8, unit: 'pips' },
  'GBP/JPY': { value: 2.5, unit: 'pips' },
  'XAU/USD': { value: 0.35, unit: 'USD' },
  'XAG/USD': { value: 0.03, unit: 'USD' },
  'US30': { value: 1.5, unit: 'pts' },
  'US100': { value: 1.0, unit: 'pts' },
  'US500': { value: 0.4, unit: 'pts' },
  'BTC/USD': { value: 25, unit: 'USD' },
  'ETH/USD': { value: 1.5, unit: 'USD' },
}

function getSpread(symbol: string): { value: number; unit: string; display: string } {
  const spread = TYPICAL_SPREADS[symbol] || { value: 2.0, unit: 'pips' }
  return {
    ...spread,
    display: `${spread.value} ${spread.unit}`
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const interval = searchParams.get('interval') || 'daily' // daily or 60min
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  
  // Fetch all indicators in parallel
  const [rsi, macd, atr, adx, stoch, ema9, ema21, ema50, ema200] = await Promise.all([
    fetchRSI(symbol, interval),
    fetchMACD(symbol, interval),
    fetchATR(symbol, interval),
    fetchADX(symbol, interval),
    fetchStochastic(symbol, interval),
    fetchEMA(symbol, 9, interval),
    fetchEMA(symbol, 21, interval),
    fetchEMA(symbol, 50, interval),
    fetchEMA(symbol, 200, interval),
  ])
  
  // Get current price estimate from EMA
  const currentPrice = ema9 || ema21 || ema50 || 100
  
  // Calculate derived values
  const volatility = getVolatilityLevel(atr, currentPrice)
  const rsiInterpretation = getRSIInterpretation(rsi)
  const spread = getSpread(symbol)
  
  // Determine MACD signal
  let macdSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (macd.histogram !== null) {
    if (macd.histogram > 0) macdSignal = 'bullish'
    else if (macd.histogram < 0) macdSignal = 'bearish'
  }
  
  // EMA trend analysis
  let emaTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (ema9 && ema21) {
    if (ema9 > ema21) emaTrend = 'bullish'
    else if (ema9 < ema21) emaTrend = 'bearish'
  }
  
  // Long-term trend (EMA50 vs EMA200)
  let longTermTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (ema50 && ema200) {
    if (ema50 > ema200) longTermTrend = 'bullish'
    else if (ema50 < ema200) longTermTrend = 'bearish'
  }
  
  return NextResponse.json({
    symbol,
    interval,
    indicators: {
      rsi: {
        value: rsi,
        status: rsiInterpretation.status,
        description: rsiInterpretation.description
      },
      macd: {
        macd: macd.macd,
        signal: macd.signal,
        histogram: macd.histogram,
        interpretation: macdSignal
      },
      atr: {
        value: atr,
        volatility,
        volatilityLabel: volatility === 'low' ? 'Faible' : volatility === 'high' ? 'Élevée' : 'Moyenne'
      },
      adx: {
        value: adx,
        trendStrength: adx && adx > 25 ? 'strong' : adx && adx > 20 ? 'moderate' : 'weak'
      },
      stochastic: {
        k: stoch.k,
        d: stoch.d,
        status: stoch.k && stoch.k > 80 ? 'overbought' : stoch.k && stoch.k < 20 ? 'oversold' : 'neutral'
      },
      ema: {
        ema9,
        ema21,
        ema50,
        ema200,
        shortTermTrend: emaTrend,
        longTermTrend
      }
    },
    spread,
    fetchedAt: new Date().toISOString()
  })
}
