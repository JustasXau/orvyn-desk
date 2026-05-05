export type Timeframe = 'WEEKLY' | 'DAILY' | 'H4' | 'H1' | 'M15'

export type PriceData = {
  symbol: string
  price: number
  change: number
  changePct: number
  high: number
  low: number
  open: number
  volume: number
  timestamp: number
}

export type BiasIndicator = {
  name: string
  score: number
  description: string
}

export type TimeframeBias = {
  timeframe: Timeframe
  weight: number
  indicators: BiasIndicator[]
  score: number
  emaFast: number
  emaSlow: number
  rsi: number
  structure: 'HH/HL' | 'LH/LL' | 'RANGE'
  macdHistogram: number
  adx: number
}

export type GoldBias = {
  swing: {
    weekly: TimeframeBias
    daily: TimeframeBias
    h4: TimeframeBias
    score: number
    confidence: number
  }
  day: {
    h4: TimeframeBias
    h1: TimeframeBias
    m15: TimeframeBias
    score: number
    confidence: number
  }
  lastUpdated: number
}

export type GoldNews = {
  id: string
  title: string
  summary: string
  source: string
  publishedAt: string
  url: string
  relevanceScore: number
  goldImpact: 'bullish' | 'bearish' | 'neutral'
  keywords: string[]
}

export type CalendarEvent = {
  id: string
  title: string
  time: string
  impact: 'High' | 'Medium' | 'Low'
  previous: string
  forecast: string
  actual: string | null
  goldImpact: {
    ifBetter: string
    ifWorse: string
    magnitude: 'high' | 'medium' | 'low'
  }
}