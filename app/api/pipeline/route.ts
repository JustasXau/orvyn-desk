import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiApiLimiter, checkRateLimit } from '@/lib/rate-limit'
import { 
  runDecisionEngine, 
  DecisionInput, 
  DecisionOutput,
  TechnicalScores,
  RawIndicators,
  MarketData,
  NewsSentiment,
  MacroData,
  createDefaultMacroData,
  createDefaultNewsSentiment
} from '@/lib/decision-engine'
import { getMarketData, getBestPrice } from '@/lib/get-market-data'
import { fetchDayIndicators } from '@/lib/indicatorFetcher'

// Pipeline stages type
interface PipelineStage {
  name: string
  status: 'pending' | 'running' | 'complete' | 'error'
  duration?: number
  data?: unknown
  error?: string
}

interface PipelineResult {
  success: boolean
  symbol: string
  stages: PipelineStage[]
  decision: DecisionOutput | null
  totalDuration: number
  timestamp: number
}

// Symbol to Yahoo ticker mapping
function getYahooTicker(symbol: string): string {
  const mapping: Record<string, string> = {
    'XAU/USD': 'GC=F',
    'XAG/USD': 'SI=F',
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'USDJPY=X',
    'USD/CHF': 'USDCHF=X',
    'AUD/USD': 'AUDUSD=X',
    'USD/CAD': 'USDCAD=X',
    'NZD/USD': 'NZDUSD=X',
    'US30': 'YM=F',
    'US100': 'NQ=F',
    'US500': 'ES=F',
    'BTC/USD': 'BTC-USD',
    'ETH/USD': 'ETH-USD',
    'USOIL': 'CL=F',
    'UKOIL': 'BZ=F',
    'NATGAS': 'NG=F',
  }
  return mapping[symbol] || symbol.replace('/', '')
}

export async function POST(request: NextRequest) {
  // Rate limiting - 5 req/min (heavy operation)
  const rateLimitCheck = await checkRateLimit(request, aiApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }
  
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { symbol } = body
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }
    
    const stages: PipelineStage[] = [
      { name: 'DATA', status: 'pending' },
      { name: 'NORMALIZATION', status: 'pending' },
      { name: 'FEATURE_ENGINE', status: 'pending' },
      { name: 'SCORING', status: 'pending' },
      { name: 'DECISION', status: 'pending' },
      { name: 'RISK', status: 'pending' },
      { name: 'COT_LOG', status: 'pending' },
    ]
    
    const startTime = Date.now()
    const yahooTicker = getYahooTicker(symbol)
    
    // ========================================================================
    // STAGE 1: DATA - Fetch from multiple sources
    // ========================================================================
    stages[0].status = 'running'
    let stageStart = Date.now()
    
    let marketDataRaw: Awaited<ReturnType<typeof getMarketData>> = []
    let priceData: Awaited<ReturnType<typeof getBestPrice>> = null
    
    try {
      const [multiSourceData, bestPrice] = await Promise.all([
        getMarketData(symbol),
        getBestPrice(symbol)
      ])
      marketDataRaw = multiSourceData
      priceData = bestPrice
      
      stages[0].status = 'complete'
      stages[0].duration = Date.now() - stageStart
      stages[0].data = { 
        sources: marketDataRaw.map(d => d.source),
        priceCount: marketDataRaw.length
      }
    } catch (error) {
      stages[0].status = 'error'
      stages[0].error = error instanceof Error ? error.message : 'Data fetch failed'
      throw error
    }
    
    // ========================================================================
    // STAGE 2: NORMALIZATION - Standardize data
    // ========================================================================
    stages[1].status = 'running'
    stageStart = Date.now()
    
    const marketData: MarketData = {
      symbol,
      price: priceData?.price || 0,
      open: priceData?.open || priceData?.price || 0,
      high: priceData?.high || priceData?.price || 0,
      low: priceData?.low || priceData?.price || 0,
      close: priceData?.price || 0,
      previousClose: priceData?.price ? priceData.price - (priceData.change || 0) : 0,
      change: priceData?.change || 0,
      changePercent: priceData?.changePercent || 0,
      volume: priceData?.volume,
      timestamp: Date.now(),
      sources: marketDataRaw.map(d => d.source)
    }
    
    stages[1].status = 'complete'
    stages[1].duration = Date.now() - stageStart
    stages[1].data = { normalizedPrice: marketData.price }
    
    // ========================================================================
    // STAGE 3: FEATURE ENGINE - Calculate indicators
    // ========================================================================
    stages[2].status = 'running'
    stageStart = Date.now()
    
    let dayIndicators: Awaited<ReturnType<typeof fetchDayIndicators>> | null = null
    
    try {
      dayIndicators = await fetchDayIndicators(yahooTicker)
      stages[2].status = 'complete'
      stages[2].duration = Date.now() - stageStart
      stages[2].data = { 
        rsi: dayIndicators?.rsi,
        adx: dayIndicators?.adx,
        atr: dayIndicators?.atr
      }
    } catch (error) {
      stages[2].status = 'error'
      stages[2].error = 'Indicator calculation failed'
      // Continue with defaults
    }
    
    // Build raw indicators
    const rawIndicators: RawIndicators = {
      ema9: dayIndicators?.ema9 || marketData.price,
      ema21: dayIndicators?.ema21 || marketData.price,
      ema50: dayIndicators?.ema50 || marketData.price,
      ema200: dayIndicators?.ema200 || marketData.price,
      rsi: dayIndicators?.rsi || 50,
      macd: dayIndicators?.macd || 0,
      macdSignal: dayIndicators?.macdSignal || 0,
      macdHistogram: dayIndicators?.macdHistogram || 0,
      adx: dayIndicators?.adx || 20,
      atr: dayIndicators?.atr || marketData.price * 0.01,
      atrPercent: dayIndicators?.atr ? (dayIndicators.atr / marketData.price) * 100 : 1,
      bbUpper: dayIndicators?.bbUpper || marketData.price * 1.02,
      bbLower: dayIndicators?.bbLower || marketData.price * 0.98,
      bbMiddle: dayIndicators?.bbMiddle || marketData.price,
      stochK: dayIndicators?.stochK || 50,
      stochD: dayIndicators?.stochD || 50,
    }
    
    // ========================================================================
    // STAGE 4: SCORING - Calculate technical scores
    // ========================================================================
    stages[3].status = 'running'
    stageStart = Date.now()
    
    // Calculate EMA alignment score (-100 to 100)
    let emaAlignment = 0
    if (rawIndicators.ema9 > rawIndicators.ema21) emaAlignment += 25
    if (rawIndicators.ema21 > rawIndicators.ema50) emaAlignment += 25
    if (rawIndicators.ema50 > rawIndicators.ema200) emaAlignment += 25
    if (marketData.price > rawIndicators.ema9) emaAlignment += 25
    emaAlignment = emaAlignment - 50 // Center around 0
    
    // MACD momentum score
    const macdMomentum = rawIndicators.macdHistogram > 0 
      ? Math.min(100, rawIndicators.macdHistogram * 50)
      : Math.max(-100, rawIndicators.macdHistogram * 50)
    
    // RSI signal
    let rsiSignal = 0
    if (rawIndicators.rsi < 30) rsiSignal = 80 // Oversold = bullish
    else if (rawIndicators.rsi > 70) rsiSignal = -80 // Overbought = bearish
    else if (rawIndicators.rsi < 45) rsiSignal = 30
    else if (rawIndicators.rsi > 55) rsiSignal = -30
    
    // Trend strength (ADX based)
    const trendStrength = Math.min(100, rawIndicators.adx * 2)
    
    // Multi-timeframe confirmation (simplified)
    const mtfConfirmation = (emaAlignment + macdMomentum) / 2
    
    const technicalScores: TechnicalScores = {
      emaAlignment,
      macdMomentum,
      rsiSignal,
      trendStrength,
      mtfConfirmation
    }
    
    stages[3].status = 'complete'
    stages[3].duration = Date.now() - stageStart
    stages[3].data = technicalScores
    
    // ========================================================================
    // STAGE 5: DECISION - Run decision engine
    // ========================================================================
    stages[4].status = 'running'
    stageStart = Date.now()
    
    // Fetch news sentiment directly from Finnhub (production-safe)
    let newsSentiment: NewsSentiment = createDefaultNewsSentiment()
    try {
      const FINNHUB_KEY = process.env.FINNHUB_API_KEY
      const newsRes = FINNHUB_KEY 
        ? await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`)
        : { ok: false } as Response
      if (newsRes.ok) {
        const newsData = await newsRes.json()
        const articles = newsData.articles || []
        const bullish = articles.filter((a: { sentiment?: string }) => a.sentiment === 'positive').length
        const bearish = articles.filter((a: { sentiment?: string }) => a.sentiment === 'negative').length
        
        newsSentiment = {
          score: articles.length > 0 ? (bullish - bearish) / articles.length : 0,
          articlesCount: articles.length,
          bullishCount: bullish,
          bearishCount: bearish,
          neutralCount: articles.length - bullish - bearish,
          hasPanic: articles.some((a: { headline?: string }) => 
            a.headline?.toLowerCase().includes('crash') || 
            a.headline?.toLowerCase().includes('plunge')),
          hasHype: articles.some((a: { headline?: string }) => 
            a.headline?.toLowerCase().includes('surge') || 
            a.headline?.toLowerCase().includes('soar')),
          recentHeadlines: articles.slice(0, 3).map((a: { headline?: string }) => a.headline || '')
        }
      }
    } catch {
      // Use defaults
    }
    
    // Macro data (simplified defaults)
    const macroData: MacroData = createDefaultMacroData()
    
    // Build decision input
    const decisionInput: DecisionInput = {
      technicalScores,
      rawIndicators,
      marketData,
      newsSentiment,
      macroData
    }
    
    // Run the decision engine
    const decision = runDecisionEngine(decisionInput)
    
    stages[4].status = 'complete'
    stages[4].duration = Date.now() - stageStart
    stages[4].data = {
      regime: decision.regime,
      action: decision.action,
      confidence: decision.confidence
    }
    
    // ========================================================================
    // STAGE 6: RISK - Already calculated in decision engine
    // ========================================================================
    stages[5].status = 'running'
    stageStart = Date.now()
    
    stages[5].status = 'complete'
    stages[5].duration = Date.now() - stageStart
    stages[5].data = decision.risk
    
    // ========================================================================
    // STAGE 7: COT LOG - Log to Supabase
    // ========================================================================
    stages[6].status = 'running'
    stageStart = Date.now()
    
    try {
      await supabase.from('cot_logs').insert({
        symbol,
        report_date: new Date().toISOString().split('T')[0],
        data_source: 'pipeline',
        raw_data: {
          decision,
          technicalScores,
          rawIndicators: {
            rsi: rawIndicators.rsi,
            adx: rawIndicators.adx,
            macd: rawIndicators.macd,
            atr: rawIndicators.atr
          },
          marketData: {
            price: marketData.price,
            change: marketData.change,
            changePercent: marketData.changePercent
          },
          user_id: user.id
        },
        created_at: new Date().toISOString()
      })
      
      stages[6].status = 'complete'
      stages[6].duration = Date.now() - stageStart
    } catch (error) {
      stages[6].status = 'error'
      stages[6].error = 'COT log failed'
    }
    
    // ========================================================================
    // FINAL RESULT
    // ========================================================================
    const result: PipelineResult = {
      success: true,
      symbol,
      stages,
      decision,
      totalDuration: Date.now() - startTime,
      timestamp: Date.now()
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline failed',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for status/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    pipeline: 'institutional-grade-decision-engine',
    version: '2.0',
    stages: [
      'DATA',
      'NORMALIZATION', 
      'FEATURE_ENGINE',
      'SCORING',
      'DECISION',
      'RISK',
      'COT_LOG'
    ],
    weights: {
      technical: '70%',
      sentiment: '20%',
      macro: '10%'
    },
    hardRules: [
      'Confidence < 65 → HOLD',
      'No trend → HOLD',
      'Never overtrade',
      'Always include stop loss'
    ]
  })
}
