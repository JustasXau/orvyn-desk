import { NextResponse } from 'next/server'

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY

// Symbol mappings
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
  'UK100': 'EWU', 'GER40': 'EWG', 'JPN225': 'EWJ',
}

// Get Alpha Vantage symbol
function getAVSymbol(symbol: string): string {
  if (FOREX_MAP[symbol]) {
    const { from, to } = FOREX_MAP[symbol]
    return `${from}${to}`
  }
  if (INDEX_MAP[symbol]) return INDEX_MAP[symbol]
  return symbol
}

// Fetch indicator from Alpha Vantage
async function fetchIndicator(
  func: string,
  symbol: string, 
  interval: string,
  timePeriod?: number,
  seriesType?: string
): Promise<number | null> {
  try {
    const avSymbol = getAVSymbol(symbol)
    let url = `https://www.alphavantage.co/query?function=${func}&symbol=${avSymbol}&interval=${interval}&apikey=${AV_KEY}`
    
    if (timePeriod) url += `&time_period=${timePeriod}`
    if (seriesType) url += `&series_type=${seriesType}`
    
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    
    const data = await res.json()
    
    // Find the technical analysis key
    const keys = Object.keys(data)
    const taKey = keys.find(k => k.startsWith('Technical Analysis'))
    if (!taKey || !data[taKey]) return null
    
    const dates = Object.keys(data[taKey]).sort().reverse()
    if (dates.length === 0) return null
    
    const latest = data[taKey][dates[0]]
    
    // Extract the value based on function type
    if (func === 'RSI') return parseFloat(latest.RSI || '50')
    if (func === 'ADX') return parseFloat(latest.ADX || '20')
    if (func === 'EMA') return parseFloat(latest.EMA || '0')
    if (func === 'MACD') return parseFloat(latest.MACD_Hist || '0')
    if (func === 'STOCH') return parseFloat(latest.SlowK || '50')
    if (func === 'BBANDS') {
      const upper = parseFloat(latest['Real Upper Band'] || '0')
      const lower = parseFloat(latest['Real Lower Band'] || '0')
      const middle = parseFloat(latest['Real Middle Band'] || '0')
      // Return price position within bands (-100 to +100)
      if (upper === lower) return 0
      return ((middle - lower) / (upper - lower) * 200) - 100
    }
    
    return null
  } catch {
    return null
  }
}

// Bias calculation result
interface BiasResult {
  bias: 'bull' | 'bear' | 'neu'
  confidence: number
  signals: string[]
  score: number
}

// Calculate DAY TRADING bias (60min timeframe)
async function calculateDayBias(symbol: string): Promise<BiasResult> {
  const signals: string[] = []
  let bullScore = 0
  let bearScore = 0
  
  // Fetch all indicators in parallel
  const [rsi, macd, ema9, ema21, stoch] = await Promise.all([
    fetchIndicator('RSI', symbol, '60min', 14, 'close'),
    fetchIndicator('MACD', symbol, '60min'),
    fetchIndicator('EMA', symbol, '60min', 9, 'close'),
    fetchIndicator('EMA', symbol, '60min', 21, 'close'),
    fetchIndicator('STOCH', symbol, '60min'),
  ])
  
  // RSI Analysis (14 period)
  if (rsi !== null) {
    if (rsi >= 70) {
      bearScore += 2
      signals.push(`RSI(14) surachete: ${rsi.toFixed(1)}`)
    } else if (rsi <= 30) {
      bullScore += 2
      signals.push(`RSI(14) survendu: ${rsi.toFixed(1)}`)
    } else if (rsi > 55) {
      bullScore += 1
      signals.push(`RSI(14) haussier: ${rsi.toFixed(1)}`)
    } else if (rsi < 45) {
      bearScore += 1
      signals.push(`RSI(14) baissier: ${rsi.toFixed(1)}`)
    }
  }
  
  // MACD Histogram Analysis
  if (macd !== null) {
    if (macd > 0) {
      bullScore += 2
      signals.push(`MACD histogramme positif`)
    } else if (macd < 0) {
      bearScore += 2
      signals.push(`MACD histogramme negatif`)
    }
  }
  
  // EMA 9/21 Crossover
  if (ema9 !== null && ema21 !== null) {
    const diff = ((ema9 - ema21) / ema21) * 100
    if (diff > 0.1) {
      bullScore += 2
      signals.push(`EMA9 > EMA21 (tendance haussiere)`)
    } else if (diff < -0.1) {
      bearScore += 2
      signals.push(`EMA9 < EMA21 (tendance baissiere)`)
    }
  }
  
  // Stochastic Analysis
  if (stoch !== null) {
    if (stoch >= 80) {
      bearScore += 1
      signals.push(`Stochastique surachete: ${stoch.toFixed(1)}`)
    } else if (stoch <= 20) {
      bullScore += 1
      signals.push(`Stochastique survendu: ${stoch.toFixed(1)}`)
    }
  }
  
  // Calculate final bias
  const totalScore = bullScore + bearScore
  const netScore = bullScore - bearScore
  
  let bias: 'bull' | 'bear' | 'neu' = 'neu'
  let confidence = 50
  
  if (totalScore > 0) {
    const ratio = bullScore / totalScore
    if (ratio >= 0.65) {
      bias = 'bull'
      confidence = Math.min(85, 50 + Math.round((ratio - 0.5) * 100))
    } else if (ratio <= 0.35) {
      bias = 'bear'
      confidence = Math.min(85, 50 + Math.round((0.5 - ratio) * 100))
    } else {
      confidence = 50 + Math.round(Math.abs(ratio - 0.5) * 40)
    }
  }
  
  return { bias, confidence, signals, score: netScore }
}

// Calculate SWING TRADING bias (daily timeframe)
async function calculateSwingBias(symbol: string): Promise<BiasResult> {
  const signals: string[] = []
  let bullScore = 0
  let bearScore = 0
  
  // Fetch all indicators in parallel
  const [rsi, macd, ema50, ema200, adx] = await Promise.all([
    fetchIndicator('RSI', symbol, 'daily', 14, 'close'),
    fetchIndicator('MACD', symbol, 'daily'),
    fetchIndicator('EMA', symbol, 'daily', 50, 'close'),
    fetchIndicator('EMA', symbol, 'daily', 200, 'close'),
    fetchIndicator('ADX', symbol, 'daily', 14),
  ])
  
  // RSI Analysis (14 period daily)
  if (rsi !== null) {
    if (rsi >= 70) {
      bearScore += 2
      signals.push(`RSI(14) daily surachete: ${rsi.toFixed(1)}`)
    } else if (rsi <= 30) {
      bullScore += 2
      signals.push(`RSI(14) daily survendu: ${rsi.toFixed(1)}`)
    } else if (rsi > 55) {
      bullScore += 1
      signals.push(`RSI(14) daily haussier: ${rsi.toFixed(1)}`)
    } else if (rsi < 45) {
      bearScore += 1
      signals.push(`RSI(14) daily baissier: ${rsi.toFixed(1)}`)
    }
  }
  
  // MACD Histogram Analysis (daily)
  if (macd !== null) {
    if (macd > 0) {
      bullScore += 2
      signals.push(`MACD daily histogramme positif`)
    } else if (macd < 0) {
      bearScore += 2
      signals.push(`MACD daily histogramme negatif`)
    }
  }
  
  // EMA 50/200 Golden/Death Cross
  if (ema50 !== null && ema200 !== null) {
    const diff = ((ema50 - ema200) / ema200) * 100
    if (diff > 0.5) {
      bullScore += 3
      signals.push(`Golden Cross: EMA50 > EMA200`)
    } else if (diff < -0.5) {
      bearScore += 3
      signals.push(`Death Cross: EMA50 < EMA200`)
    }
  }
  
  // ADX Trend Strength
  if (adx !== null) {
    if (adx > 25) {
      // Strong trend - amplify the current direction
      if (bullScore > bearScore) {
        bullScore += 1
        signals.push(`ADX fort (${adx.toFixed(1)}) - tendance confirmee`)
      } else if (bearScore > bullScore) {
        bearScore += 1
        signals.push(`ADX fort (${adx.toFixed(1)}) - tendance confirmee`)
      }
    } else {
      signals.push(`ADX faible (${adx.toFixed(1)}) - pas de tendance claire`)
    }
  }
  
  // Calculate final bias
  const totalScore = bullScore + bearScore
  const netScore = bullScore - bearScore
  
  let bias: 'bull' | 'bear' | 'neu' = 'neu'
  let confidence = 50
  
  if (totalScore > 0) {
    const ratio = bullScore / totalScore
    if (ratio >= 0.65) {
      bias = 'bull'
      confidence = Math.min(90, 50 + Math.round((ratio - 0.5) * 120))
    } else if (ratio <= 0.35) {
      bias = 'bear'
      confidence = Math.min(90, 50 + Math.round((0.5 - ratio) * 120))
    } else {
      confidence = 50 + Math.round(Math.abs(ratio - 0.5) * 50)
    }
  }
  
  return { bias, confidence, signals, score: netScore }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  
  // Calculate both biases in parallel
  const [swingBias, dayBias] = await Promise.all([
    calculateSwingBias(symbol),
    calculateDayBias(symbol)
  ])
  
  // Combined recommendation
  let recommendation = ''
  if (swingBias.bias === 'bull' && dayBias.bias === 'bull') {
    recommendation = 'Forte opportunite ACHAT - Swing et Day alignes haussiers'
  } else if (swingBias.bias === 'bear' && dayBias.bias === 'bear') {
    recommendation = 'Forte opportunite VENTE - Swing et Day alignes baissiers'
  } else if (swingBias.bias === 'bull' && dayBias.bias === 'bear') {
    recommendation = 'Prudence - Swing haussier mais Day baissier (correction possible)'
  } else if (swingBias.bias === 'bear' && dayBias.bias === 'bull') {
    recommendation = 'Prudence - Swing baissier mais Day haussier (rebond temporaire)'
  } else {
    recommendation = 'Neutre - Attendre un signal plus clair'
  }
  
  return NextResponse.json({
    symbol,
    swing: swingBias,
    day: dayBias,
    recommendation,
    overallScore: swingBias.score + dayBias.score,
    fetchedAt: new Date().toISOString()
  })
}
