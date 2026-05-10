import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getAsset, isValidSymbol } from '@/lib/assets'
import { buildContextualPrompt, validateContextualReport, SYSTEM_PROMPT_ANALYST } from '@/lib/contextual-report'
import { filterEventsForSymbol, filterNewsForSymbol } from '@/lib/impact-map'

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED REPORT API v2.0 - Croisement complet de TOUTES les données
// ═══════════════════════════════════════════════════════════════════════════
//
// Logique:
// 1. Fetch TOUTES les données (prix, bias, indicateurs, structure, corrélations, news, calendrier, COT, Trump)
// 2. Croisement côté serveur (pas de client)
// 3. Cache 5 min pour éviter appels Groq inutiles
// 4. Génère rapport professionnel unique pour chaque actif
// 5. Si donnée manquante → l'indiquer plutôt que d'inventer
//
// ═══════════════════════════════════════════════════════════════════════════

// Client Groq - initialisation defensive
const GROQ_API_KEY = process.env.GROQ_API_KEY
let groq: Groq | null = null

if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY })
}

// Cache simple en mémoire (5 min)
const reportCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

interface UnifiedReportData {
  symbol: string
  session: string
  priceData: {
    current: number
    change24h: number
    changePercent24h: number
    high24h: number
    low24h: number
    volume?: number
  }
  bias: {
    swing: { score: number; confidence: number; direction: string }
    day: { score: number; confidence: number; direction: string }
  }
  technicalAnalysis: {
    ema50: number | null
    ema200: number | null
    rsi: number | null
    macd: { line: number; signal: number; histogram: number } | null
    adx: number | null
    structure?: string
    orderBlocks?: string[]
  }
  correlations: {
    symbol: string
    correlation: number
    impact: string
  }[]
  news: {
    headline: string
    summary: string
    source: string
    datetime: number
    impact: 'high' | 'medium' | 'low'
  }[]
  economicEvents: {
    name: string
    datetime: number
    forecast: number | null
    previous: number | null
    actual: number | null
    importance: 'high' | 'medium' | 'low'
  }[]
  coT: {
    reportDate: string
    longPositions: number | null
    shortPositions: number | null
    netPosition: number | null
    sentiment: 'bullish' | 'bearish' | 'neutral'
  } | null
  trump: {
    riskLevel: 'high' | 'medium' | 'low'
    latestStatement?: string
    affectedInstruments: string[]
  } | null
  missingData: string[]
}

import { getInternalApiUrl } from '@/lib/api-utils'

const API_BASE = () => getInternalApiUrl()

// Fetch prix actuels via Yahoo Finance direct
async function fetchPrice(symbol: string): Promise<any> {
  try {
    const yahooSymbol = symbol === 'XAU/USD' ? 'GC=F' : 
      symbol === 'XAG/USD' ? 'SI=F' : 
      symbol === 'DXY' ? 'DX-Y.NYB' : 
      symbol.replace('/', '').replace('USD', '=X')
    
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`,
      { next: { revalidate: 60 }, headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    const quote = result?.indicators?.quote?.[0]
    const meta = result?.meta
    if (!meta) return null
    return {
      price: meta.regularMarketPrice || quote?.close?.slice(-1)[0],
      previousClose: meta.previousClose || meta.chartPreviousClose,
      change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100) || 0
    }
  } catch {
    return null
  }
}

// Fetch biais - use internal API with proper base URL
async function fetchBias(symbol: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE()}/api/orvyn/bias?symbol=${encodeURIComponent(symbol)}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Fetch news direct from Finnhub
async function fetchNews(symbol: string): Promise<any> {
  try {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY
    if (!FINNHUB_KEY) return []
    
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`)
    if (!res.ok) return []
    const news = await res.json()
    const keywords = getAsset(symbol)?.keywords || [symbol.toLowerCase()]
    return (news || []).slice(0, 20).filter((n: any) =>
      keywords.some(kw => (n.headline || '').toLowerCase().includes(kw.toLowerCase()))
    )
  } catch {
    return []
  }
}

// Return static correlations (no external API needed)
function fetchCorrelations(symbol: string): any {
  const correlations: Record<string, any[]> = {
    'XAU/USD': [{ symbol: 'DXY', correlation: -0.78 }, { symbol: 'US10Y', correlation: -0.55 }],
    'DXY': [{ symbol: 'EUR/USD', correlation: -0.95 }, { symbol: 'XAU/USD', correlation: -0.78 }],
    'US500': [{ symbol: 'US100', correlation: 0.92 }, { symbol: 'VIX', correlation: -0.85 }],
  }
  return correlations[symbol] || []
}

// Fetch calendrier économique direct from Finnhub
async function fetchEconomicCalendar(symbol: string): Promise<any> {
  try {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY
    if (!FINNHUB_KEY) return []
    
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const res = await fetch(`https://finnhub.io/api/v1/calendar/economic?from=${today}&to=${nextWeek}&token=${FINNHUB_KEY}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.economicCalendar || []).slice(0, 10)
  } catch {
    return []
  }
}

// Fetch Trump tracking with proper base URL
async function fetchTrump(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE()}/api/trump`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Determine current market session
function getMarketSession(): string {
  const hours = new Date().getHours()
  if (hours >= 1 && hours < 8) return 'Asie/Tokyo'
  if (hours >= 8 && hours < 16) return 'Londres'
  if (hours >= 16 && hours < 22) return 'New York'
  return 'Post-marché'
}

// Assemble unified report data
async function assembleUnifiedData(symbol: string): Promise<UnifiedReportData> {
  const missingData: string[] = []

  const [price, bias, news, correlations, economicEvents, trump] = await Promise.all([
    fetchPrice(symbol),
    fetchBias(symbol),
    fetchNews(symbol),
    fetchCorrelations(symbol),
    fetchEconomicCalendar(symbol),
    fetchTrump(),
  ])

  if (!price) missingData.push('Price data')
  if (!bias) missingData.push('Bias calculation')
  if (!news || news.length === 0) missingData.push('Recent news')
  if (!correlations || correlations.length === 0) missingData.push('Correlation data')

  return {
    symbol,
    session: getMarketSession(),
    priceData: price ? {
      current: price.price || price.current,
      change24h: price.change || 0,
      changePercent24h: price.changePercent || 0,
      high24h: price.high || 0,
      low24h: price.low || 0,
      volume: price.volume,
    } : {
      current: 0,
      change24h: 0,
      changePercent24h: 0,
      high24h: 0,
      low24h: 0,
    },
    bias: bias ? {
      swing: bias.swing || { score: 0, confidence: 0, direction: 'neutral' },
      day: bias.day || { score: 0, confidence: 0, direction: 'neutral' },
    } : {
      swing: { score: 0, confidence: 0, direction: 'neutral' },
      day: { score: 0, confidence: 0, direction: 'neutral' },
    },
    technicalAnalysis: bias?.indicators || {},
    correlations: Array.isArray(correlations)
      ? correlations
      : correlations && typeof correlations === 'object'
      ? Object.entries(correlations).map(([symbol, correlation]: any) => ({
          symbol,
          correlation: correlation.correlation || correlation,
          impact: correlation.impact || 'neutral'
        }))
      : [],
    news: (news || []).slice(0, 5).map((n: any) => ({
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      datetime: n.datetime,
      impact: n.importance > 7 ? 'high' : n.importance > 4 ? 'medium' : 'low',
    })),
    economicEvents: economicEvents || [],
    trump: trump ? {
      riskLevel: trump.riskLevel === 'high' ? 'high' : trump.riskLevel === 'medium' ? 'medium' : 'low',
      latestStatement: trump.statements?.[0]?.statement,
      affectedInstruments: trump.statements?.[0]?.affectedInstruments?.map((i: any) => i.symbol) || [],
    } : null,
    missingData,
  }
}

// Generate report with Groq using CONTEXTUAL mapping
async function generateReport(data: UnifiedReportData): Promise<string> {
  // Verification defensive du client Groq
  if (!groq) {
    throw new Error('Groq client not initialized — check GROQ_API_KEY environment variable')
  }

  // Filter events and news for this SPECIFIC symbol using impact mapping
  const relevantEvents = filterEventsForSymbol(data.symbol, data.economicEvents || [])
  const relevantNews = filterNewsForSymbol(data.symbol, data.news || [], { logDetails: true })

  // QUALITY CHECKS - Prevent empty or low-quality reports
  const changePercent = data.priceData?.changePercent24h ?? 0
  const hasDivergence = (changePercent > 0 && data.bias?.day?.score < 0) || (changePercent < 0 && data.bias?.day?.score > 0)
  
  console.log(`[Rapport] ${data.symbol} contexte final:`, {
    newsCount: relevantNews.length,
    topNews: relevantNews.slice(0, 3).map(n => n.headline),
    eventsCount: relevantEvents.length,
    biasSwing: data.bias?.swing?.direction,
    biasDay: data.bias?.day?.direction,
    hasDivergence,
    priceChange: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`
  })

  // Check minimum data quality
  if (relevantNews.length === 0 && relevantEvents.length === 0) {
    console.warn(`[Groq] ${data.symbol} - NO NEWS OR EVENTS found. Using technical data only.`)
  }

  if (relevantNews.length < 3) {
    console.warn(`[Groq] ${data.symbol} - LOW NEWS DATA (${relevantNews.length} articles). Consider broadening keywords.`)
  }

  // Build contextualized prompt with filtered data
  const prompt = buildContextualPrompt({
    symbol: data.symbol,
    price: data.priceData?.current ?? 0,
    priceChange: data.priceData?.changePercent24h ?? 0,
    swingBias: data.bias?.swing ?? { direction: 'Inconnu', confidence: 0, score: 0 },
    dayBias: data.bias?.day ?? { direction: 'Inconnu', confidence: 0, score: 0 },
    rsi: data.technicalAnalysis?.rsi ?? undefined,
    structure: data.technicalAnalysis?.structure,
    economicEvents: relevantEvents,
    news: relevantNews,
    correlations: data.correlations || [],
  })

  // Appel correct a l'API Groq avec SYSTEM PROMPT pour cohérence
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 800,
    system: SYSTEM_PROMPT_ANALYST,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = completion.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Groq returned empty response')
  }

  // Validate report is contextual (not copy-pasted generic report)
  const validation = validateContextualReport(content, data.symbol)
  if (!validation.valid) {
    console.warn(`[Report Validation] ${validation.reason} for ${data.symbol}`)
  }

  return content
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const symbol = body.symbol
    const forceRefresh = body.forceRefresh === true

    // Validation
    if (!symbol || !isValidSymbol(symbol)) {
      return NextResponse.json(
        { error: 'Invalid symbol', availableSymbols: 'Use GET /api/desk-audit for list' },
        { status: 400 }
      )
    }

    // Check cache (skip if forceRefresh)
    const cached = reportCache.get(symbol)
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        symbol,
        report: cached.data.report,
        timestamp: cached.timestamp,
        cached: true,
        cacheExpiresIn: Math.ceil((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000),
      })
    }
    
    // If forceRefresh, clear old cache
    if (forceRefresh) {
      reportCache.delete(symbol)
    }

    // Assemble all data
    const unifiedData = await assembleUnifiedData(symbol)

    // Generate report
    const report = await generateReport(unifiedData)

    // Cache result
    const result = { report }
    reportCache.set(symbol, { data: result, timestamp: Date.now() })

    return NextResponse.json({
      symbol,
      report,
      timestamp: Date.now(),
      cached: false,
      cacheExpiresIn: Math.ceil(CACHE_TTL / 1000),
      dataQuality: {
        completeness: Math.round((1 - unifiedData.missingData.length / 8) * 100),
        missingData: unifiedData.missingData,
      },
    })
  } catch (error) {
    console.error('[UnifiedReport] Error:', error)
    return NextResponse.json(
      { error: 'Report generation failed', details: String(error) },
      { status: 500 }
    )
  }
}
