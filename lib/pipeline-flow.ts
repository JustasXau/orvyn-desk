/**
 * CLEAN PIPELINE FLOW
 * market → indicators → news → macro → scores → regime → AI → COT LOG
 */

import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { getMarketData, getBestPrice } from './get-market-data'
import { computeGlobalScore, detectRegime, detectRegimeExtended } from './decision-engine'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate median of an array of numbers
 * More robust than average for price data (resistant to outliers)
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculate median price from multiple sources
 * Filters out invalid prices (0, null, undefined)
 */
export function medianPrice(prices: (number | null | undefined)[]): number {
  const validPrices = prices.filter((p): p is number => typeof p === 'number' && p > 0)
  return median(validPrices)
}

/**
 * Calculate weighted median (for prices with confidence weights)
 */
export function weightedMedian(
  values: number[], 
  weights: number[]
): number {
  if (values.length === 0 || values.length !== weights.length) return 0
  
  // Create pairs and sort by value
  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] }))
    .sort((a, b) => a.value - b.value)
  
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let cumWeight = 0
  
  for (const pair of pairs) {
    cumWeight += pair.weight
    if (cumWeight >= totalWeight / 2) {
      return pair.value
    }
  }
  
  return pairs[pairs.length - 1]?.value || 0
}

// ============================================================================
// TYPES
// ============================================================================

export interface Indicators {
  ema9: number
  ema21: number
  ema50: number
  ema200: number
  rsi: number
  macd: number
  macdSignal: number
  macdHistogram: number
  adx: number
  atr: number
  volatility: number
  stochK: number
  stochD: number
}

export interface NewsItem {
  title: string
  sentiment: number // -1 to 1
  source: string
  timestamp: string
}

export interface MacroData {
  fedRate: number
  inflation: number
  dxy: number
  vix: number
  oil: number
}

export interface PipelineResult {
  symbol: string
  market: {
    price: number
    change: number
    changePercent: number
    source: string
  }
  indicators: Indicators
  scores: {
    tech: number
    sentiment: number
    macro: number
    global: number
  }
  regime: string
  decision: {
    bias: string
    action: string
    confidence: number
    entry: number
    stopLoss: number
    takeProfit: number
    riskReward: number
  }
  reasoning: string[]
  warnings: string[]
  timestamp: string
}

// ============================================================================
// DATA FETCHERS
// ============================================================================

// 1. Get Market Data
export async function fetchMarketData(symbol: string) {
  const data = await getBestPrice(symbol)
  if (!data) throw new Error(`No market data for ${symbol}`)
  
  return {
    price: data.price,
    change: data.change || 0,
    changePercent: data.changePercent || 0,
    high: data.high || data.price,
    low: data.low || data.price,
    open: data.open || data.price,
    volume: data.volume || 0,
    source: data.source,
  }
}

// 2. Get Indicators (from Yahoo Finance candles)
export async function fetchIndicators(symbol: string): Promise<Indicators> {
  // Map symbol to Yahoo format
  const symbolMap: Record<string, string> = {
    'XAU/USD': 'GC=F', 'XAG/USD': 'SI=F', 'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X', 'USD/JPY': 'USDJPY=X', 'US30': 'YM=F',
    'US100': 'NQ=F', 'US500': 'ES=F', 'USOIL': 'CL=F', 'BTC/USD': 'BTC-USD',
  }
  
  const yahooSymbol = symbolMap[symbol] || symbol.replace('/', '')
  
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1h&range=1mo`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    const quotes = data.chart?.result?.[0]
    
    if (!quotes?.indicators?.quote?.[0]) {
      return getDefaultIndicators()
    }
    
    const closes = quotes.indicators.quote[0].close?.filter((c: number | null) => c !== null) || []
    const highs = quotes.indicators.quote[0].high?.filter((h: number | null) => h !== null) || []
    const lows = quotes.indicators.quote[0].low?.filter((l: number | null) => l !== null) || []
    
    if (closes.length < 50) return getDefaultIndicators()
    
    // Calculate indicators
    const ema9 = calcEMA(closes, 9)
    const ema21 = calcEMA(closes, 21)
    const ema50 = calcEMA(closes, 50)
    const ema200 = closes.length >= 200 ? calcEMA(closes, 200) : ema50
    const rsi = calcRSI(closes, 14)
    const { macd, signal, histogram } = calcMACD(closes)
    const adx = calcADX(highs, lows, closes, 14)
    const atr = calcATR(highs, lows, closes, 14)
    const volatility = atr / closes[closes.length - 1]
    const { k, d } = calcStochastic(highs, lows, closes, 14, 3)
    
    return {
      ema9, ema21, ema50, ema200,
      rsi,
      macd, macdSignal: signal, macdHistogram: histogram,
      adx, atr, volatility,
      stochK: k, stochD: d,
    }
  } catch (error) {
    console.error('Error fetching indicators:', error)
    return getDefaultIndicators()
  }
}

// ============================================================================
// SENTIMENT SUMMARIZATION
// ============================================================================

export type SentimentLabel = 'bullish' | 'bearish' | 'neutral'

export interface SentimentSummary {
  label: SentimentLabel
  intensity: number  // 0-1 scale
  score: number      // -100 to 100 raw score
}

/**
 * Summarize sentiment into bullish/bearish/neutral with intensity (0-1)
 * 
 * @param score - Raw sentiment score (-100 to 100)
 * @returns SentimentSummary with label and intensity
 */
export function summarizeSentiment(score: number): SentimentSummary {
  // Clamp score to -100 to 100
  const clampedScore = Math.max(-100, Math.min(100, score))
  
  // Calculate intensity (0-1) from absolute score
  const intensity = Math.abs(clampedScore) / 100
  
  // Determine label based on score thresholds
  let label: SentimentLabel
  if (clampedScore >= 20) {
    label = 'bullish'
  } else if (clampedScore <= -20) {
    label = 'bearish'
  } else {
    label = 'neutral'
  }
  
  return {
    label,
    intensity: Math.round(intensity * 100) / 100, // Round to 2 decimals
    score: clampedScore,
  }
}

/**
 * Summarize multiple news sentiments into aggregate sentiment
 */
export function summarizeNewsSentiment(news: NewsItem[]): SentimentSummary {
  if (news.length === 0) {
    return { label: 'neutral', intensity: 0, score: 0 }
  }
  
  // Calculate weighted average (more recent news = higher weight)
  let totalWeight = 0
  let weightedSum = 0
  
  news.forEach((item, index) => {
    // More recent articles (lower index) get higher weight
    const weight = news.length - index
    totalWeight += weight
    weightedSum += item.sentiment * weight
  })
  
  const avgScore = weightedSum / totalWeight
  return summarizeSentiment(avgScore)
}

/**
 * Combine multiple sentiment sources into final sentiment
 */
export function combineSentiments(
  newsSentiment: SentimentSummary,
  socialSentiment?: SentimentSummary,
  cotSentiment?: SentimentSummary
): SentimentSummary {
  const weights = { news: 0.5, social: 0.3, cot: 0.2 }
  
  let totalWeight = weights.news
  let weightedScore = newsSentiment.score * weights.news
  
  if (socialSentiment) {
    totalWeight += weights.social
    weightedScore += socialSentiment.score * weights.social
  }
  
  if (cotSentiment) {
    totalWeight += weights.cot
    weightedScore += cotSentiment.score * weights.cot
  }
  
  const finalScore = weightedScore / totalWeight
  return summarizeSentiment(finalScore)
}

// 3. Get News with Sentiment
export async function fetchNews(symbol: string): Promise<NewsItem[]> {
  try {
    const keywords = getNewsKeywords(symbol)
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`,
      { next: { revalidate: 600 } }
    )
    const articles = await res.json()
    
    if (!Array.isArray(articles)) return []
    
    // Filter relevant news and compute sentiment
    return articles
      .filter((a: any) => {
        const text = `${a.headline} ${a.summary}`.toLowerCase()
        return keywords.some(k => text.includes(k.toLowerCase()))
      })
      .slice(0, 10)
      .map((a: any) => ({
        title: a.headline,
        sentiment: computeNewsSentiment(a.headline + ' ' + a.summary),
        source: a.source,
        timestamp: new Date(a.datetime * 1000).toISOString(),
      }))
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

// 4. Get Macro Data
export async function fetchMacro(): Promise<MacroData> {
  try {
    // Fetch DXY and VIX from Yahoo
    const [dxyRes, vixRes, oilRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=5d'),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d'),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=5d'),
    ])
    
    const [dxyData, vixData, oilData] = await Promise.all([
      dxyRes.json(), vixRes.json(), oilRes.json(),
    ])
    
    const getLastPrice = (data: any) => {
      const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
      return closes.filter((c: number | null) => c !== null).pop() || 0
    }
    
    return {
      fedRate: 5.25, // Could fetch from FRED API
      inflation: 3.2, // Could fetch from FRED API
      dxy: getLastPrice(dxyData),
      vix: getLastPrice(vixData),
      oil: getLastPrice(oilData),
    }
  } catch (error) {
    console.error('Error fetching macro:', error)
    return { fedRate: 5.25, inflation: 3.2, dxy: 104, vix: 15, oil: 75 }
  }
}

// ============================================================================
// SCORE COMPUTATIONS
// ============================================================================

// Compute Technical Score (-100 to 100)
export function computeTechScore(indicators: Indicators): number {
  let score = 0
  const price = indicators.ema9 // Use EMA9 as proxy for current price
  
  // EMA Alignment (30 points)
  if (price > indicators.ema21 && indicators.ema21 > indicators.ema50) score += 30
  else if (price < indicators.ema21 && indicators.ema21 < indicators.ema50) score -= 30
  
  // MACD (25 points)
  if (indicators.macdHistogram > 0) score += Math.min(25, indicators.macdHistogram * 10)
  else score += Math.max(-25, indicators.macdHistogram * 10)
  
  // RSI (20 points)
  if (indicators.rsi > 70) score -= 20
  else if (indicators.rsi < 30) score += 20
  else if (indicators.rsi > 50) score += (indicators.rsi - 50) * 0.5
  else score -= (50 - indicators.rsi) * 0.5
  
  // ADX Trend Strength (15 points)
  if (indicators.adx > 25) {
    score += (indicators.ema9 > indicators.ema50 ? 15 : -15)
  }
  
  // Stochastic (10 points)
  if (indicators.stochK > 80 && indicators.stochK < indicators.stochD) score -= 10
  else if (indicators.stochK < 20 && indicators.stochK > indicators.stochD) score += 10
  
  return Math.max(-100, Math.min(100, score))
}

// Compute Sentiment Score (-100 to 100)
export function computeSentiment(news: NewsItem[]): number {
  if (news.length === 0) return 0
  
  const avgSentiment = news.reduce((sum, n) => sum + n.sentiment, 0) / news.length
  return Math.round(avgSentiment * 100)
}

// Compute Macro Score (-100 to 100)
export function computeMacro(macro: MacroData): number {
  let score = 0
  
  // VIX (fear gauge)
  if (macro.vix < 15) score += 20 // Low fear = bullish
  else if (macro.vix > 25) score -= 20 // High fear = bearish
  
  // DXY impact (strong dollar = bearish for commodities/EM)
  if (macro.dxy > 105) score -= 15
  else if (macro.dxy < 100) score += 15
  
  // Fed Rate (high rates = bearish for risk assets)
  if (macro.fedRate > 5) score -= 10
  else if (macro.fedRate < 3) score += 10
  
  // Inflation (high inflation = uncertain)
  if (macro.inflation > 4) score -= 10
  else if (macro.inflation < 2) score += 5
  
  return Math.max(-100, Math.min(100, score))
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

export async function callAI(context: {
  symbol: string
  market: any
  indicators: Indicators
  news: NewsItem[]
  macro: MacroData
  globalScore: number
  regime: string
}): Promise<{
  bias: string
  action: string
  confidence: number
  entry: number
  stopLoss: number
  takeProfit: number
  reasoning: string[]
  warnings: string[]
}> {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
  
  const systemPrompt = `Tu es un analyste macro + quant senior chez Goldman Sachs.
Analyse l'actif ${context.symbol} en multi-timeframe.
Utilise les données techniques, news récentes et contexte macro.
Donne une analyse concise, honnête, avec biais directionnel clair et niveaux clés.

RÈGLES STRICTES:
- Confidence < 65% → action = HOLD
- Regime RANGING → action = HOLD
- Toujours donner stop loss et take profit
- Max 5 raisons dans reasoning
- Langue : Français

Réponds en JSON strict:
{
  "bias": "BULLISH|BEARISH|NEUTRAL",
  "action": "BUY|SELL|HOLD",
  "confidence": 0-100,
  "entry": prix,
  "stopLoss": prix,
  "takeProfit": prix,
  "reasoning": ["max 5 bullets"],
  "warnings": ["risques"]
}`

  const userPrompt = `
DONNÉES MARCHÉ ${context.symbol}:
- Prix: ${context.market.price}
- Variation: ${context.market.changePercent?.toFixed(2)}%

INDICATEURS:
- EMA9/21/50: ${context.indicators.ema9.toFixed(2)} / ${context.indicators.ema21.toFixed(2)} / ${context.indicators.ema50.toFixed(2)}
- RSI: ${context.indicators.rsi.toFixed(1)}
- MACD Histogram: ${context.indicators.macdHistogram.toFixed(4)}
- ADX: ${context.indicators.adx.toFixed(1)}
- Volatilité: ${(context.indicators.volatility * 100).toFixed(2)}%

MACRO:
- DXY: ${context.macro.dxy}
- VIX: ${context.macro.vix}
- Fed Rate: ${context.macro.fedRate}%

SCORES SYSTÈME:
- Score Global: ${context.globalScore.toFixed(1)}
- Régime: ${context.regime}

NEWS RÉCENTES:
${context.news.slice(0, 5).map(n => `- ${n.title} (sentiment: ${n.sentiment > 0 ? '+' : ''}${(n.sentiment * 100).toFixed(0)}%)`).join('\n')}

Analyse et donne ta décision en JSON.`

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    })
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        bias: parsed.bias || 'NEUTRAL',
        action: parsed.action || 'HOLD',
        confidence: parsed.confidence || 50,
        entry: parsed.entry || context.market.price,
        stopLoss: parsed.stopLoss || parsed.stop_loss || 0,
        takeProfit: parsed.takeProfit || parsed.take_profit || 0,
        reasoning: parsed.reasoning || [],
        warnings: parsed.warnings || [],
      }
    }
  } catch (error) {
    console.error('AI error:', error)
  }
  
  // Fallback
  return {
    bias: 'NEUTRAL',
    action: 'HOLD',
    confidence: 50,
    entry: context.market.price,
    stopLoss: 0,
    takeProfit: 0,
    reasoning: ['Analyse IA non disponible'],
    warnings: ['Utiliser analyse manuelle'],
  }
}

// ============================================================================
// COT LOG
// ============================================================================

export async function logToCOT(result: PipelineResult): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  await supabase.from('cot_logs').insert({
    symbol: result.symbol,
    regime: result.regime,
    ai_bias: result.decision.bias,
    system_score: result.scores.global,
    confidence: result.decision.confidence,
    entry_price: result.decision.entry,
    stop_loss: result.decision.stopLoss,
    take_profit: result.decision.takeProfit,
    action: result.decision.action,
    risk_reward: result.decision.riskReward,
    sources: { market: result.market.source },
    reasoning: result.reasoning,
    warnings: result.warnings,
    created_at: new Date().toISOString(),
  })
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export async function runPipeline(symbol: string): Promise<PipelineResult> {
  // 1. Fetch all data in parallel
  const [market, indicators, news, macro] = await Promise.all([
    fetchMarketData(symbol),
    fetchIndicators(symbol),
    fetchNews(symbol),
    fetchMacro(),
  ])
  
  // 2. Compute scores
  const techScore = computeTechScore(indicators)
  const sentimentScore = computeSentiment(news)
  const macroScore = computeMacro(macro)
  const globalScore = computeGlobalScore({
    tech: techScore,
    sentiment: sentimentScore,
    macro: macroScore,
  })
  
  // 3. Detect regime
  const regime = detectRegime(indicators.adx, indicators.volatility)
  
  // 3.5. HARD RULE: If global score confidence < 60%, return HOLD
  if (Math.abs(globalScore) < 60) {
    const holdResult: PipelineResult = {
      symbol,
      market,
      scores: {
        technical: techScore,
        sentiment: sentimentScore,
        macro: macroScore,
        global: globalScore,
      },
      regime,
      decision: {
        bias: 'NEUTRAL',
        action: 'HOLD',
        confidence: Math.abs(globalScore),
        entry: null,
        stopLoss: null,
        takeProfit: null,
        riskReward: 0,
      },
      reasoning: ['Global score below 60% threshold - no clear edge'],
      warnings: ['Low confidence signal - staying out of market'],
      timestamp: new Date().toISOString(),
    }
    
    // Still log to COT for record keeping
    await logToCOT(holdResult)
    
    return holdResult
  }
  
  // 4. Call AI for analysis
  const aiResponse = await callAI({
    symbol,
    market,
    indicators,
    news,
    macro,
    globalScore,
    regime,
  })
  
  // 4.5. HARD RULE: If AI confidence < 65%, override action to HOLD
  if (aiResponse.confidence < 65) {
    aiResponse.action = 'HOLD'
    aiResponse.warnings.push('AI confidence below 65% threshold - action overridden to HOLD')
  }
  
  // 5. Calculate risk/reward
  const riskReward = aiResponse.stopLoss > 0 && aiResponse.takeProfit > 0
    ? Math.abs(aiResponse.takeProfit - aiResponse.entry) / Math.abs(aiResponse.entry - aiResponse.stopLoss)
    : 0
  
  // 6. Build result
  const result: PipelineResult = {
    symbol,
    market: {
      price: market.price,
      change: market.change,
      changePercent: market.changePercent,
      source: market.source,
    },
    indicators,
    scores: {
      tech: techScore,
      sentiment: sentimentScore,
      macro: macroScore,
      global: globalScore,
    },
    regime,
    decision: {
      bias: aiResponse.bias,
      action: aiResponse.action,
      confidence: aiResponse.confidence,
      entry: aiResponse.entry,
      stopLoss: aiResponse.stopLoss,
      takeProfit: aiResponse.takeProfit,
      riskReward: Math.round(riskReward * 100) / 100,
    },
    reasoning: aiResponse.reasoning,
    warnings: aiResponse.warnings,
    timestamp: new Date().toISOString(),
  }
  
  // 7. Log to COT
  await logToCOT(result)
  
  return result
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDefaultIndicators(): Indicators {
  return {
    ema9: 0, ema21: 0, ema50: 0, ema200: 0,
    rsi: 50, macd: 0, macdSignal: 0, macdHistogram: 0,
    adx: 20, atr: 0, volatility: 0.02,
    stochK: 50, stochD: 50,
  }
}

function getNewsKeywords(symbol: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'XAU/USD': ['gold', 'or', 'precious metal', 'fed', 'inflation', 'dollar'],
    'XAG/USD': ['silver', 'argent', 'precious metal'],
    'EUR/USD': ['euro', 'ecb', 'lagarde', 'fed', 'dollar', 'europe'],
    'GBP/USD': ['pound', 'sterling', 'boe', 'uk', 'britain'],
    'USD/JPY': ['yen', 'boj', 'japan', 'dollar'],
    'US30': ['dow', 'djia', 'wall street', 'stocks'],
    'US100': ['nasdaq', 'tech', 'apple', 'microsoft', 'nvidia'],
    'USOIL': ['oil', 'crude', 'opec', 'energy', 'petrole'],
    'BTC/USD': ['bitcoin', 'crypto', 'btc', 'cryptocurrency'],
  }
  return keywordMap[symbol] || [symbol.replace('/', ' ')]
}

function computeNewsSentiment(text: string): number {
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'bullish', 'high', 'growth', 'positive', 'up', 'hausse']
  const bearishWords = ['drop', 'fall', 'decline', 'bearish', 'low', 'crash', 'negative', 'down', 'baisse', 'fear']
  
  const lower = text.toLowerCase()
  let score = 0
  
  bullishWords.forEach(w => { if (lower.includes(w)) score += 0.15 })
  bearishWords.forEach(w => { if (lower.includes(w)) score -= 0.15 })
  
  return Math.max(-1, Math.min(1, score))
}

// Technical indicator calculations
function calcEMA(data: number[], period: number): number {
  const k = 2 / (period + 1)
  let ema = data[0]
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }
  return ema
}

function calcRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  const rs = gains / (losses || 1)
  return 100 - 100 / (1 + rs)
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd = ema12 - ema26
  const signal = macd * 0.15 // Simplified
  return { macd, signal, histogram: macd - signal }
}

function calcADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (closes.length < period + 1) return 20
  let plusDM = 0, minusDM = 0, tr = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const highDiff = highs[i] - highs[i - 1]
    const lowDiff = lows[i - 1] - lows[i]
    plusDM += highDiff > lowDiff && highDiff > 0 ? highDiff : 0
    minusDM += lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0
    tr += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]))
  }
  const plusDI = (plusDM / tr) * 100
  const minusDI = (minusDM / tr) * 100
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI || 1) * 100
  return dx
}

function calcATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (closes.length < period + 1) return 0
  let atr = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]))
    atr += tr
  }
  return atr / period
}

function calcStochastic(highs: number[], lows: number[], closes: number[], period: number, smooth: number): { k: number; d: number } {
  if (closes.length < period) return { k: 50, d: 50 }
  const recentHighs = highs.slice(-period)
  const recentLows = lows.slice(-period)
  const highestHigh = Math.max(...recentHighs)
  const lowestLow = Math.min(...recentLows)
  const currentClose = closes[closes.length - 1]
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow || 1)) * 100
  return { k, d: k } // Simplified, should be SMA of K
}
