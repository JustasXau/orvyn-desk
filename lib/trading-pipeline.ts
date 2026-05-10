"use client"

/**
 * TRADING PIPELINE
 * DATA → NORMALIZATION → FEATURE ENGINE → SCORING → AI → RISK → EXECUTION → COT LOG
 */

import { createClient } from '@supabase/supabase-js'

// Types
export interface RawMarketData {
  symbol: string
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
  source: string
}

export interface NormalizedData {
  symbol: string
  price: number
  ohlcv: {
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
  change: number
  changePercent: number
  timestamp: number
  sources: string[]
}

export interface FeatureSet {
  // Trend
  ema9: number
  ema21: number
  ema50: number
  ema200: number
  trendDirection: 'up' | 'down' | 'sideways'
  
  // Momentum
  rsi: number
  macd: number
  macdSignal: number
  macdHistogram: number
  stochK: number
  stochD: number
  
  // Volatility
  atr: number
  atrPercent: number
  bollingerUpper: number
  bollingerLower: number
  bollingerWidth: number
  
  // Volume
  volumeMA: number
  volumeRatio: number
  
  // Support/Resistance
  pivotPoint: number
  resistance1: number
  resistance2: number
  support1: number
  support2: number
}

export interface Score {
  technical: number      // -100 to 100
  momentum: number       // -100 to 100
  trend: number          // -100 to 100
  volatility: number     // 0 to 100
  volume: number         // 0 to 100
  composite: number      // -100 to 100
  confidence: number     // 0 to 100
}

export interface AIAnalysis {
  bias: 'bullish' | 'bearish' | 'neutral'
  conviction: 'high' | 'medium' | 'low'
  summary: string
  keyLevels: {
    entry: number
    stopLoss: number
    takeProfit1: number
    takeProfit2: number
  }
  catalysts: string[]
  risks: string[]
}

export interface RiskMetrics {
  positionSize: number       // % of capital
  riskRewardRatio: number
  maxDrawdown: number
  volatilityAdjustedSize: number
  correlationRisk: number
  eventRisk: 'high' | 'medium' | 'low'
}

export interface ExecutionPlan {
  action: 'BUY' | 'SELL' | 'HOLD'
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LIMIT'
  entry: number
  stopLoss: number
  takeProfit: number[]
  timeframe: 'scalp' | 'intraday' | 'swing' | 'position'
  urgency: 'immediate' | 'wait_for_level' | 'wait_for_confirmation'
  notes: string
}

export interface PipelineResult {
  symbol: string
  timestamp: number
  raw: RawMarketData[]
  normalized: NormalizedData
  features: FeatureSet
  scores: Score
  ai: AIAnalysis
  risk: RiskMetrics
  execution: ExecutionPlan
  logged: boolean
}

// ============================================================================
// 1. DATA - Fetch raw data from multiple sources
// ============================================================================

export async function fetchRawData(symbol: string): Promise<RawMarketData[]> {
  const results: RawMarketData[] = []
  
  // Fetch from Yahoo Finance
  try {
    const yahooSymbol = getYahooSymbol(symbol)
    const res = await fetch(`/api/yahoo-price?symbol=${encodeURIComponent(yahooSymbol)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.price) {
        results.push({
          symbol,
          price: data.price,
          open: data.open || data.price,
          high: data.high || data.price,
          low: data.low || data.price,
          close: data.price,
          volume: data.volume || 0,
          timestamp: Date.now(),
          source: 'yahoo'
        })
      }
    }
  } catch (e) {
    console.error('[Pipeline] Yahoo fetch error:', e)
  }
  
  // Fetch from pair-data API (includes technical data)
  try {
    const res = await fetch(`/api/pair-data?symbol=${encodeURIComponent(symbol)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.price) {
        results.push({
          symbol,
          price: data.price,
          open: data.price,
          high: data.price,
          low: data.price,
          close: data.price,
          volume: 0,
          timestamp: Date.now(),
          source: 'pair-data'
        })
      }
    }
  } catch (e) {
    console.error('[Pipeline] Pair-data fetch error:', e)
  }
  
  return results
}

// ============================================================================
// 2. NORMALIZATION - Standardize data formats
// ============================================================================

export function normalizeData(rawData: RawMarketData[]): NormalizedData {
  if (rawData.length === 0) {
    throw new Error('No raw data to normalize')
  }
  
  // Average prices from multiple sources
  const avgPrice = rawData.reduce((sum, d) => sum + d.price, 0) / rawData.length
  const avgOpen = rawData.reduce((sum, d) => sum + d.open, 0) / rawData.length
  const avgHigh = rawData.reduce((sum, d) => sum + d.high, 0) / rawData.length
  const avgLow = rawData.reduce((sum, d) => sum + d.low, 0) / rawData.length
  const avgClose = rawData.reduce((sum, d) => sum + d.close, 0) / rawData.length
  const totalVolume = rawData.reduce((sum, d) => sum + d.volume, 0)
  
  const change = avgClose - avgOpen
  const changePercent = avgOpen > 0 ? (change / avgOpen) * 100 : 0
  
  return {
    symbol: rawData[0].symbol,
    price: avgPrice,
    ohlcv: {
      open: avgOpen,
      high: avgHigh,
      low: avgLow,
      close: avgClose,
      volume: totalVolume
    },
    change,
    changePercent,
    timestamp: Date.now(),
    sources: rawData.map(d => d.source)
  }
}

// ============================================================================
// 3. FEATURE ENGINE - Calculate technical indicators
// ============================================================================

export async function calculateFeatures(symbol: string, normalized: NormalizedData): Promise<FeatureSet> {
  // Fetch additional technical data
  let technicalData: any = null
  try {
    const res = await fetch(`/api/pair-data?symbol=${encodeURIComponent(symbol)}`)
    if (res.ok) {
      technicalData = await res.json()
    }
  } catch (e) {
    console.error('[Pipeline] Technical data fetch error:', e)
  }
  
  const price = normalized.price
  const { high, low, close } = normalized.ohlcv
  
  // Calculate pivot points
  const pivotPoint = (high + low + close) / 3
  const resistance1 = 2 * pivotPoint - low
  const resistance2 = pivotPoint + (high - low)
  const support1 = 2 * pivotPoint - high
  const support2 = pivotPoint - (high - low)
  
  // Default values (would be calculated from historical data in production)
  const rsi = technicalData?.rsi || 50
  const atr = technicalData?.atr || price * 0.01
  
  return {
    // Trend (estimated from price position)
    ema9: price * 0.998,
    ema21: price * 0.995,
    ema50: price * 0.99,
    ema200: price * 0.97,
    trendDirection: normalized.changePercent > 0.1 ? 'up' : normalized.changePercent < -0.1 ? 'down' : 'sideways',
    
    // Momentum
    rsi,
    macd: technicalData?.macdHistogram || 0,
    macdSignal: 0,
    macdHistogram: technicalData?.macdHistogram || 0,
    stochK: 50,
    stochD: 50,
    
    // Volatility
    atr,
    atrPercent: (atr / price) * 100,
    bollingerUpper: price * 1.02,
    bollingerLower: price * 0.98,
    bollingerWidth: 4,
    
    // Volume
    volumeMA: normalized.ohlcv.volume,
    volumeRatio: 1,
    
    // Support/Resistance
    pivotPoint,
    resistance1,
    resistance2,
    support1,
    support2
  }
}

// ============================================================================
// 4. SCORING - Generate trading signals
// ============================================================================

export function calculateScores(features: FeatureSet, normalized: NormalizedData): Score {
  // Technical Score (-100 to 100)
  let technical = 0
  
  // EMA alignment
  if (features.ema9 > features.ema21 && features.ema21 > features.ema50) {
    technical += 30 // Bullish alignment
  } else if (features.ema9 < features.ema21 && features.ema21 < features.ema50) {
    technical -= 30 // Bearish alignment
  }
  
  // Price vs EMAs
  const price = normalized.price
  if (price > features.ema50) technical += 20
  if (price > features.ema200) technical += 20
  if (price < features.ema50) technical -= 20
  if (price < features.ema200) technical -= 20
  
  // Momentum Score (-100 to 100)
  let momentum = 0
  
  // RSI
  if (features.rsi > 70) momentum -= 30 // Overbought
  else if (features.rsi < 30) momentum += 30 // Oversold
  else if (features.rsi > 50) momentum += (features.rsi - 50) * 0.6
  else momentum -= (50 - features.rsi) * 0.6
  
  // MACD
  if (features.macdHistogram > 0) momentum += 20
  if (features.macdHistogram < 0) momentum -= 20
  
  // Stochastic
  if (features.stochK > 80) momentum -= 15
  else if (features.stochK < 20) momentum += 15
  
  // Trend Score (-100 to 100)
  let trend = 0
  if (features.trendDirection === 'up') trend = 50
  else if (features.trendDirection === 'down') trend = -50
  
  trend += normalized.changePercent * 10
  
  // Volatility Score (0 to 100)
  const volatility = Math.min(100, features.atrPercent * 20)
  
  // Volume Score (0 to 100)
  const volume = Math.min(100, features.volumeRatio * 50)
  
  // Composite Score
  const composite = (
    technical * 0.3 +
    momentum * 0.25 +
    trend * 0.25 +
    (volatility > 50 ? -10 : 10) +
    (volume > 100 ? 10 : 0)
  )
  
  // Confidence based on signal alignment
  const signals = [technical, momentum, trend]
  const allPositive = signals.every(s => s > 0)
  const allNegative = signals.every(s => s < 0)
  const confidence = allPositive || allNegative ? 80 : 50 + Math.abs(composite) / 2
  
  return {
    technical: Math.max(-100, Math.min(100, technical)),
    momentum: Math.max(-100, Math.min(100, momentum)),
    trend: Math.max(-100, Math.min(100, trend)),
    volatility: Math.max(0, Math.min(100, volatility)),
    volume: Math.max(0, Math.min(100, volume)),
    composite: Math.max(-100, Math.min(100, composite)),
    confidence: Math.max(0, Math.min(100, confidence))
  }
}

// ============================================================================
// 5. AI - Use Groq for analysis
// ============================================================================

export async function getAIAnalysis(
  symbol: string,
  normalized: NormalizedData,
  features: FeatureSet,
  scores: Score
): Promise<AIAnalysis> {
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        type: 'technical',
        context: {
          price: normalized.price,
          change: normalized.changePercent,
          scores,
          features: {
            rsi: features.rsi,
            trend: features.trendDirection,
            support: features.support1,
            resistance: features.resistance1
          }
        }
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      return {
        bias: scores.composite > 20 ? 'bullish' : scores.composite < -20 ? 'bearish' : 'neutral',
        conviction: scores.confidence > 70 ? 'high' : scores.confidence > 50 ? 'medium' : 'low',
        summary: data.analysis || 'Analyse en cours...',
        keyLevels: {
          entry: normalized.price,
          stopLoss: features.support1,
          takeProfit1: features.resistance1,
          takeProfit2: features.resistance2
        },
        catalysts: [],
        risks: []
      }
    }
  } catch (e) {
    console.error('[Pipeline] AI analysis error:', e)
  }
  
  // Fallback
  return {
    bias: scores.composite > 20 ? 'bullish' : scores.composite < -20 ? 'bearish' : 'neutral',
    conviction: scores.confidence > 70 ? 'high' : scores.confidence > 50 ? 'medium' : 'low',
    summary: `Score technique: ${scores.technical.toFixed(0)}, Momentum: ${scores.momentum.toFixed(0)}, Tendance: ${features.trendDirection}`,
    keyLevels: {
      entry: normalized.price,
      stopLoss: features.support1,
      takeProfit1: features.resistance1,
      takeProfit2: features.resistance2
    },
    catalysts: [],
    risks: []
  }
}

// ============================================================================
// 6. RISK - Calculate risk metrics
// ============================================================================

export function calculateRisk(
  normalized: NormalizedData,
  features: FeatureSet,
  scores: Score,
  ai: AIAnalysis,
  accountSize: number = 10000
): RiskMetrics {
  const price = normalized.price
  const stopDistance = Math.abs(price - ai.keyLevels.stopLoss)
  const targetDistance = Math.abs(ai.keyLevels.takeProfit1 - price)
  
  // Risk/Reward Ratio
  const riskRewardRatio = stopDistance > 0 ? targetDistance / stopDistance : 0
  
  // Position size based on 1-2% risk
  const riskPercent = scores.confidence > 70 ? 0.02 : 0.01 // 2% for high confidence, 1% otherwise
  const riskAmount = accountSize * riskPercent
  const positionSize = stopDistance > 0 ? (riskAmount / stopDistance) * price : 0
  const positionSizePercent = (positionSize / accountSize) * 100
  
  // Volatility adjusted size
  const volatilityMultiplier = features.atrPercent > 2 ? 0.5 : features.atrPercent > 1 ? 0.75 : 1
  const volatilityAdjustedSize = positionSizePercent * volatilityMultiplier
  
  // Event risk (simplified)
  const eventRisk: 'high' | 'medium' | 'low' = 
    features.atrPercent > 3 ? 'high' : 
    features.atrPercent > 1.5 ? 'medium' : 'low'
  
  return {
    positionSize: Math.min(100, positionSizePercent),
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    maxDrawdown: riskPercent * 100,
    volatilityAdjustedSize: Math.min(100, volatilityAdjustedSize),
    correlationRisk: 0, // Would need portfolio data
    eventRisk
  }
}

// ============================================================================
// 7. EXECUTION - Generate trade plan
// ============================================================================

export function generateExecutionPlan(
  normalized: NormalizedData,
  features: FeatureSet,
  scores: Score,
  ai: AIAnalysis,
  risk: RiskMetrics
): ExecutionPlan {
  // Determine action
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  if (scores.composite > 30 && scores.confidence > 60) {
    action = 'BUY'
  } else if (scores.composite < -30 && scores.confidence > 60) {
    action = 'SELL'
  }
  
  // Determine order type
  const orderType: 'MARKET' | 'LIMIT' | 'STOP_LIMIT' = 
    scores.confidence > 75 ? 'MARKET' : 'LIMIT'
  
  // Determine timeframe
  const timeframe: 'scalp' | 'intraday' | 'swing' | 'position' =
    features.atrPercent > 2 ? 'scalp' :
    features.atrPercent > 1 ? 'intraday' : 'swing'
  
  // Determine urgency
  const urgency: 'immediate' | 'wait_for_level' | 'wait_for_confirmation' =
    scores.confidence > 80 && Math.abs(scores.composite) > 50 ? 'immediate' :
    Math.abs(scores.composite) > 30 ? 'wait_for_level' : 'wait_for_confirmation'
  
  // Generate notes
  const notes = [
    `Score: ${scores.composite.toFixed(0)}/100`,
    `Confiance: ${scores.confidence.toFixed(0)}%`,
    `R:R = ${risk.riskRewardRatio}:1`,
    `Taille position: ${risk.volatilityAdjustedSize.toFixed(1)}%`
  ].join(' | ')
  
  return {
    action,
    orderType,
    entry: ai.keyLevels.entry,
    stopLoss: ai.keyLevels.stopLoss,
    takeProfit: [ai.keyLevels.takeProfit1, ai.keyLevels.takeProfit2],
    timeframe,
    urgency,
    notes
  }
}

// ============================================================================
// 8. COT LOG - Log to Supabase
// ============================================================================

export async function logToCOT(result: Omit<PipelineResult, 'logged'>): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Pipeline] Supabase not configured')
      return false
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { error } = await supabase.from('cot_logs').insert([{
      symbol: result.symbol,
      report_date: new Date().toISOString().split('T')[0],
      long_positions: result.scores.composite > 0 ? Math.abs(result.scores.composite) : 0,
      short_positions: result.scores.composite < 0 ? Math.abs(result.scores.composite) : 0,
      net_position: result.scores.composite,
      data_source: 'pipeline',
      raw_data: {
        normalized: result.normalized,
        features: result.features,
        scores: result.scores,
        ai: result.ai,
        risk: result.risk,
        execution: result.execution
      },
      created_at: new Date().toISOString()
    }])
    
    if (error) {
      console.error('[Pipeline] COT log error:', error)
      return false
    }
    
    return true
  } catch (e) {
    console.error('[Pipeline] COT log exception:', e)
    return false
  }
}

// ============================================================================
// MAIN PIPELINE EXECUTOR
// ============================================================================

export async function runPipeline(symbol: string, accountSize: number = 10000): Promise<PipelineResult> {
  console.log(`[Pipeline] Starting analysis for ${symbol}`)
  
  // 1. DATA
  const rawData = await fetchRawData(symbol)
  if (rawData.length === 0) {
    throw new Error(`No data available for ${symbol}`)
  }
  
  // 2. NORMALIZATION
  const normalized = normalizeData(rawData)
  
  // 3. FEATURE ENGINE
  const features = await calculateFeatures(symbol, normalized)
  
  // 4. SCORING
  const scores = calculateScores(features, normalized)
  
  // 5. AI
  const ai = await getAIAnalysis(symbol, normalized, features, scores)
  
  // 6. RISK
  const risk = calculateRisk(normalized, features, scores, ai, accountSize)
  
  // 7. EXECUTION
  const execution = generateExecutionPlan(normalized, features, scores, ai, risk)
  
  // 8. COT LOG
  const pipelineData = {
    symbol,
    timestamp: Date.now(),
    raw: rawData,
    normalized,
    features,
    scores,
    ai,
    risk,
    execution
  }
  
  const logged = await logToCOT(pipelineData)
  
  console.log(`[Pipeline] Analysis complete for ${symbol}:`, execution.action)
  
  return { ...pipelineData, logged }
}

// Helper function
function getYahooSymbol(symbol: string): string {
  const mapping: Record<string, string> = {
    'XAU/USD': 'GC=F',
    'XAG/USD': 'SI=F',
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'USDJPY=X',
    'US30': 'YM=F',
    'US100': 'NQ=F',
    'US500': 'ES=F',
    'BTC/USD': 'BTC-USD',
    'ETH/USD': 'ETH-USD',
    'USOIL': 'CL=F',
    'UKOIL': 'BZ=F',
  }
  return mapping[symbol] || symbol
}
