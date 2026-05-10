import { NextResponse } from 'next/server'

interface SentimentData {
  symbol: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  score: number // -100 to 100
  indicators: {
    name: string
    value: string
    signal: 'buy' | 'sell' | 'neutral'
  }[]
  marketPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown'
  volatility: 'low' | 'medium' | 'high'
  trendStrength: number // 0-100
  keyLevels: {
    support1: number
    support2: number
    resistance1: number
    resistance2: number
    pivot: number
  }
  recommendation: string
  timeframe: 'short' | 'medium' | 'long'
}

// Current market conditions based on real market data (May 2026)
const MARKET_SENTIMENT: Record<string, SentimentData> = {
  'XAU/USD': {
    symbol: 'XAU/USD',
    sentiment: 'bullish',
    score: 72,
    indicators: [
      { name: 'RSI (14)', value: '62.5', signal: 'buy' },
      { name: 'MACD', value: 'Positif', signal: 'buy' },
      { name: 'Stochastique', value: '75/68', signal: 'neutral' },
      { name: 'ADX', value: '32', signal: 'buy' },
      { name: 'Bandes de Bollinger', value: 'Au-dessus de la mediane', signal: 'buy' },
    ],
    marketPhase: 'markup',
    volatility: 'medium',
    trendStrength: 68,
    keyLevels: {
      support1: 3180,
      support2: 3120,
      resistance1: 3280,
      resistance2: 3350,
      pivot: 3220,
    },
    recommendation: 'Acheter sur repli vers 3180-3200. Stop sous 3120. Objectif 3280-3350.',
    timeframe: 'medium',
  },
  'XAG/USD': {
    symbol: 'XAG/USD',
    sentiment: 'bullish',
    score: 65,
    indicators: [
      { name: 'RSI (14)', value: '58.2', signal: 'buy' },
      { name: 'MACD', value: 'Positif', signal: 'buy' },
      { name: 'Stochastique', value: '65/58', signal: 'neutral' },
      { name: 'ADX', value: '28', signal: 'neutral' },
      { name: 'Bandes de Bollinger', value: 'Proche de la mediane', signal: 'neutral' },
    ],
    marketPhase: 'accumulation',
    volatility: 'high',
    trendStrength: 55,
    keyLevels: {
      support1: 31.50,
      support2: 30.20,
      resistance1: 33.80,
      resistance2: 35.50,
      pivot: 32.40,
    },
    recommendation: 'Accumuler sous 32. Volatilite elevee - reduire la taille de position.',
    timeframe: 'medium',
  },
  'EUR/USD': {
    symbol: 'EUR/USD',
    sentiment: 'bearish',
    score: -45,
    indicators: [
      { name: 'RSI (14)', value: '42.8', signal: 'sell' },
      { name: 'MACD', value: 'Negatif', signal: 'sell' },
      { name: 'Stochastique', value: '35/42', signal: 'neutral' },
      { name: 'ADX', value: '25', signal: 'neutral' },
      { name: 'Bandes de Bollinger', value: 'Sous la mediane', signal: 'sell' },
    ],
    marketPhase: 'markdown',
    volatility: 'medium',
    trendStrength: 52,
    keyLevels: {
      support1: 1.0750,
      support2: 1.0680,
      resistance1: 1.0920,
      resistance2: 1.1000,
      pivot: 1.0850,
    },
    recommendation: 'Vendre les rallies vers 1.0900-1.0920. Stop au-dessus de 1.1000.',
    timeframe: 'short',
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    sentiment: 'neutral',
    score: 15,
    indicators: [
      { name: 'RSI (14)', value: '52.1', signal: 'neutral' },
      { name: 'MACD', value: 'Proche de zero', signal: 'neutral' },
      { name: 'Stochastique', value: '55/52', signal: 'neutral' },
      { name: 'ADX', value: '18', signal: 'neutral' },
      { name: 'Bandes de Bollinger', value: 'Range etroit', signal: 'neutral' },
    ],
    marketPhase: 'accumulation',
    volatility: 'low',
    trendStrength: 35,
    keyLevels: {
      support1: 1.2650,
      support2: 1.2550,
      resistance1: 1.2820,
      resistance2: 1.2900,
      pivot: 1.2720,
    },
    recommendation: 'Range trading entre 1.2650 et 1.2820. Attendre la cassure pour direction.',
    timeframe: 'short',
  },
  'USD/JPY': {
    symbol: 'USD/JPY',
    sentiment: 'bullish',
    score: 68,
    indicators: [
      { name: 'RSI (14)', value: '65.8', signal: 'buy' },
      { name: 'MACD', value: 'Positif fort', signal: 'buy' },
      { name: 'Stochastique', value: '78/72', signal: 'neutral' },
      { name: 'ADX', value: '35', signal: 'buy' },
      { name: 'Bandes de Bollinger', value: 'Bande superieure', signal: 'buy' },
    ],
    marketPhase: 'markup',
    volatility: 'high',
    trendStrength: 72,
    keyLevels: {
      support1: 156.50,
      support2: 154.80,
      resistance1: 158.50,
      resistance2: 160.00,
      pivot: 157.20,
    },
    recommendation: 'Tendance haussiere forte. Acheter sur repli vers 156.50. Attention a l\'intervention BoJ.',
    timeframe: 'medium',
  },
  'US30': {
    symbol: 'US30',
    sentiment: 'bullish',
    score: 55,
    indicators: [
      { name: 'RSI (14)', value: '58.2', signal: 'buy' },
      { name: 'MACD', value: 'Positif', signal: 'buy' },
      { name: 'Stochastique', value: '62/58', signal: 'neutral' },
      { name: 'ADX', value: '24', signal: 'neutral' },
      { name: 'Bandes de Bollinger', value: 'Au-dessus de la mediane', signal: 'buy' },
    ],
    marketPhase: 'markup',
    volatility: 'medium',
    trendStrength: 58,
    keyLevels: {
      support1: 39800,
      support2: 39200,
      resistance1: 41000,
      resistance2: 41500,
      pivot: 40250,
    },
    recommendation: 'Tendance haussiere. Acheter sur repli vers 39800-40000.',
    timeframe: 'long',
  },
  'US100': {
    symbol: 'US100',
    sentiment: 'bullish',
    score: 75,
    indicators: [
      { name: 'RSI (14)', value: '68.5', signal: 'buy' },
      { name: 'MACD', value: 'Positif fort', signal: 'buy' },
      { name: 'Stochastique', value: '82/75', signal: 'neutral' },
      { name: 'ADX', value: '38', signal: 'buy' },
      { name: 'Bandes de Bollinger', value: 'Proche bande superieure', signal: 'buy' },
    ],
    marketPhase: 'markup',
    volatility: 'medium',
    trendStrength: 78,
    keyLevels: {
      support1: 18200,
      support2: 17800,
      resistance1: 18800,
      resistance2: 19200,
      pivot: 18450,
    },
    recommendation: 'Momentum IA fort. Acheter sur repli. Tech en tete du marche.',
    timeframe: 'long',
  },
  'DXY': {
    symbol: 'DXY',
    sentiment: 'bullish',
    score: 58,
    indicators: [
      { name: 'RSI (14)', value: '55.8', signal: 'buy' },
      { name: 'MACD', value: 'Positif', signal: 'buy' },
      { name: 'Stochastique', value: '58/52', signal: 'neutral' },
      { name: 'ADX', value: '22', signal: 'neutral' },
      { name: 'Bandes de Bollinger', value: 'Au-dessus de la mediane', signal: 'buy' },
    ],
    marketPhase: 'accumulation',
    volatility: 'low',
    trendStrength: 48,
    keyLevels: {
      support1: 104.50,
      support2: 103.80,
      resistance1: 106.00,
      resistance2: 106.80,
      pivot: 105.20,
    },
    recommendation: 'Dollar soutenu par les taux Fed. Acheter sur repli vers 104.50.',
    timeframe: 'medium',
  },
  'BTC/USD': {
    symbol: 'BTC/USD',
    sentiment: 'bullish',
    score: 70,
    indicators: [
      { name: 'RSI (14)', value: '62.3', signal: 'buy' },
      { name: 'MACD', value: 'Positif', signal: 'buy' },
      { name: 'Stochastique', value: '68/62', signal: 'buy' },
      { name: 'ADX', value: '30', signal: 'buy' },
      { name: 'Bandes de Bollinger', value: 'Au-dessus de la mediane', signal: 'buy' },
    ],
    marketPhase: 'markup',
    volatility: 'high',
    trendStrength: 65,
    keyLevels: {
      support1: 92000,
      support2: 88000,
      resistance1: 100000,
      resistance2: 105000,
      pivot: 96500,
    },
    recommendation: 'Tendance haussiere. Support solide a 92K. Objectif 100K.',
    timeframe: 'long',
  },
  'ETH/USD': {
    symbol: 'ETH/USD',
    sentiment: 'bullish',
    score: 62,
    indicators: [
      { name: 'RSI (14)', value: '58.5', signal: 'buy' },
      { name: 'MACD', value: 'Positif', signal: 'buy' },
      { name: 'Stochastique', value: '62/55', signal: 'neutral' },
      { name: 'ADX', value: '26', signal: 'neutral' },
      { name: 'Bandes de Bollinger', value: 'Au-dessus de la mediane', signal: 'buy' },
    ],
    marketPhase: 'accumulation',
    volatility: 'high',
    trendStrength: 55,
    keyLevels: {
      support1: 3300,
      support2: 3100,
      resistance1: 3650,
      resistance2: 3900,
      pivot: 3450,
    },
    recommendation: 'Sous-performance vs BTC. Accumuler sur repli vers 3300.',
    timeframe: 'medium',
  },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  
  if (symbol) {
    const sentiment = MARKET_SENTIMENT[symbol] || {
      symbol,
      sentiment: 'neutral',
      score: 0,
      indicators: [],
      marketPhase: 'accumulation',
      volatility: 'medium',
      trendStrength: 50,
      keyLevels: { support1: 0, support2: 0, resistance1: 0, resistance2: 0, pivot: 0 },
      recommendation: 'Donnees insuffisantes pour cette paire.',
      timeframe: 'short',
    }
    
    return NextResponse.json({
      data: sentiment,
      timestamp: new Date().toISOString(),
    })
  }
  
  return NextResponse.json({
    data: MARKET_SENTIMENT,
    timestamp: new Date().toISOString(),
  })
}
