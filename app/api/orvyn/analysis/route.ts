// ORVYN Analysis API - Fixed duplicate variable issue 2024
import { NextRequest, NextResponse } from 'next/server'
import { calculateBias } from '@/lib/bias-engine-universal'
import { analysisApiLimiter, checkRateLimit } from '@/lib/rate-limit'
import { getAllSymbols, isValidSymbol } from '@/lib/assets'
import { getAllPairs } from '@/lib/pairs/config'
import { calculateGoldVerdict, type GoldVerdict, type CrossAssetSignal } from '@/lib/pairs/orchestrator'

// ═══════════════════════════════════════════════════════════════════════════════
// ORVYN DESK - UNIFIED ANALYSIS API v3.0
// ═══════════════════════════════════════════════════════════════════════════════
// 
// PRINCIPE FONDAMENTAL:
// 1. Collecter TOUTES les donnees (technique, macro, news, correlations)
// 2. Calculer les biais en CROISANT ces donnees (SOURCE DE VERITE)
// 3. Generer le rapport qui JUSTIFIE ces biais
// 4. COHERENCE ABSOLUE entre dashboard et rapport
//
// TIMEFRAMES:
// - SWING TRADING: 2 semaines a 1 mois (biais structurel moyen terme)
// - DAY TRADING: Maximum 24h (biais court terme H1/H4)
//
// RAPPORT STRUCTURE (style MRKT.IA):
// - Verdict clair en premier
// - Contexte Actualite
// - Analyse Technique + Fondamentale
// - Correlations Cles
// - Ce qui pourrait faire monter/baisser
// - Risques & Invalidation
// - PAS de Trade Idea (entry, stop, target)
// ═══════════════════════════════════════════════════════════════════════════════

// Lazy init Groq only when needed (runtime, not compile time)
let groq: any = null;

function getGroqClient() {
  if (!groq) {
    const Groq = require('groq-sdk').default
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groq
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  datetime: number
  category: 'breaking' | 'high-impact' | 'economic' | 'geopolitical' | 'general'
  relatedAssets: { symbol: string; impact: 'up' | 'down' | 'neutral' }[]
  importance: number
}

interface EconomicEvent {
  event: string
  date: string
  time: string
  country: string
  currency: string
  impact: 'high' | 'medium' | 'low' | 'none'
  actual: string | null
  forecast: string | null
  previous: string | null
  isImminent: boolean
  isLive: boolean
}

interface CalendarContext {
  upcomingHighImpact: EconomicEvent[]
  todayEvents: EconomicEvent[]
  thisWeekHighImpact: EconomicEvent[]
  imminentCount: number
  liveCount: number
  summary: string
}

interface MacroContext {
  dxyTrend: 'up' | 'down' | 'flat'
  dxyChange: number
  vixLevel: 'low' | 'normal' | 'high' | 'extreme'
  vixPrice: number
  marketSentiment: 'risk_on' | 'risk_off' | 'neutral'
  yields10Y: number | null
}

interface CorrelationData {
  symbol: string
  correlation: number
  strength: 'strong' | 'moderate' | 'weak'
  direction: 'positive' | 'negative'
  impact: string
}

interface NewsImpact {
  bullishNews: NewsItem[]
  bearishNews: NewsItem[]
  neutralNews: NewsItem[]
  netSentiment: number
  topNews: NewsItem[]
  newsContext: string
}

interface UnifiedBias {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: number
  score: number
  horizon: string
  keyDrivers: string[]
  newsAdjustment: number
}

interface AnalysisResult {
  symbol: string
  timestamp: string
  price: number
  change24h: number
  
  swingBias: UnifiedBias
  dayBias: UnifiedBias
  
  verdict: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    conviction: number
    action: 'BUY' | 'SELL' | 'HOLD'
    context: 'TREND' | 'PULLBACK' | 'RANGE'
  }
  
  macro: MacroContext
  newsImpact: NewsImpact
  correlations: CorrelationData[]
  
  report: {
    summary: string
    newsContext: string
    technical: string
    fundamental: string
    correlationsAnalysis: string
    bullishDrivers: string[]
    bearishDrivers: string[]
    risks: string
    invalidation: string
  }
  
  sources: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH CORRELATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Direct correlation data - no external API call needed (was causing localhost:3000 bug in production)
function fetchCorrelations(symbol: string): CorrelationData[] {
  return getDefaultCorrelations(symbol)
}

function getDefaultCorrelations(symbol: string): CorrelationData[] {
  const defaults: Record<string, CorrelationData[]> = {
    'XAU/USD': [
      { symbol: 'DXY', correlation: -78, strength: 'strong', direction: 'negative', impact: 'Dollar fort = or faible' },
      { symbol: 'US10Y', correlation: -62, strength: 'moderate', direction: 'negative', impact: 'Rendements pesent' },
      { symbol: 'VIX', correlation: 45, strength: 'moderate', direction: 'positive', impact: 'Or = valeur refuge' },
    ],
    'US30': [
      { symbol: 'US100', correlation: 92, strength: 'strong', direction: 'positive', impact: 'Indices correles' },
      { symbol: 'VIX', correlation: -85, strength: 'strong', direction: 'negative', impact: 'VIX inverse indices' },
      { symbol: 'DXY', correlation: -35, strength: 'weak', direction: 'negative', impact: 'Dollar modere' },
    ],
    'US100': [
      { symbol: 'US30', correlation: 92, strength: 'strong', direction: 'positive', impact: 'Indices correles' },
      { symbol: 'VIX', correlation: -88, strength: 'strong', direction: 'negative', impact: 'Tech sensible VIX' },
      { symbol: 'BTC/USD', correlation: 65, strength: 'moderate', direction: 'positive', impact: 'Tech-crypto lie' },
    ],
    'DXY': [
      { symbol: 'EUR/USD', correlation: -95, strength: 'strong', direction: 'negative', impact: 'Inverse mecanique' },
      { symbol: 'XAU/USD', correlation: -78, strength: 'strong', direction: 'negative', impact: 'Or inverse dollar' },
      { symbol: 'US10Y', correlation: 55, strength: 'moderate', direction: 'positive', impact: 'Rendements soutiennent' },
    ],
  }
  
  return defaults[symbol] || [
    { symbol: 'DXY', correlation: -50, strength: 'moderate', direction: 'negative', impact: 'Impact dollar' },
    { symbol: 'US500', correlation: 40, strength: 'moderate', direction: 'positive', impact: 'Correle indices' },
  ]
}

// ═════════════════════════════════════════════════════════════════���������═════════════
// FETCH ECONOMIC CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

// Direct calendar context - uses Finnhub economic calendar directly instead of localhost API  
async function fetchEconomicCalendar(symbol: string): Promise<CalendarContext> {
  try {
    // Fetch directly from Finnhub instead of localhost API
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY
    if (!FINNHUB_KEY) return getDefaultCalendarContext()
    
    const startDate = new Date()
    const weekLater = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const from = startDate.toISOString().split('T')[0]
    const to = weekLater.toISOString().split('T')[0]
    
    const response = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 600 } }
    )
    
    if (!response.ok) return getDefaultCalendarContext()
    
    const data = await response.json()
    const rawEvents = data.economicCalendar || []
    
    // Transform Finnhub format to our format
    const events: EconomicEvent[] = rawEvents.map((e: any) => ({
      id: `finnhub-${e.event}-${e.time}`,
      date: e.time?.split(' ')[0] || from,
      time: e.time?.split(' ')[1] || '00:00',
      currency: e.country === 'US' ? 'USD' : e.country === 'EU' ? 'EUR' : e.country || 'USD',
      event: e.event || 'Economic Event',
      impact: e.impact === 3 ? 'high' : e.impact === 2 ? 'medium' : 'low',
      actual: e.actual?.toString() || null,
      forecast: e.estimate?.toString() || null,
      previous: e.prev?.toString() || null
    }))

    // Filter by currency relevance
    const symbolBase = symbol.split('/')[0].toUpperCase()
    const relevantCurrencies = getRelevantCurrencies(symbolBase)
    const relevantEvents = events.filter(e => 
      relevantCurrencies.includes(e.currency) || e.impact === 'high'
    )
    
    // Filter today's and upcoming events using 'from' date (today's date string)
    const todayEvents = relevantEvents.filter(e => e.date === from)
    const currentDate = new Date()
    const upcomingHighImpact = relevantEvents
      .filter(e => e.impact === 'high' && new Date(e.date) >= currentDate)
      .slice(0, 5)
    const thisWeekHighImpact = relevantEvents
      .filter(e => e.impact === 'high')
      .slice(0, 10)
    
    // Build summary
    const imminentEvents = events.filter(e => e.isImminent)
    const liveEvents = events.filter(e => e.isLive)
    
    let summary = ''
    if (liveEvents.length > 0) {
      summary = `EN COURS: ${liveEvents.map(e => e.event).join(', ')}. `
    }
    if (imminentEvents.length > 0) {
      summary += `IMMINENT (<30min): ${imminentEvents.map(e => e.event).join(', ')}. `
    }
    if (upcomingHighImpact.length > 0) {
      summary += `A VENIR: ${upcomingHighImpact.slice(0, 3).map(e => `${e.event} (${e.date})`).join(', ')}.`
    }
    if (!summary) {
      summary = 'Pas d\'events economiques majeurs imminents.'
    }
    
    return {
      upcomingHighImpact,
      todayEvents,
      thisWeekHighImpact,
      imminentCount: imminentEvents.length,
      liveCount: liveEvents.length,
      summary,
    }
  } catch (error) {
    console.error('[Orvyn] Calendar fetch error:', error)
    return getDefaultCalendarContext()
  }
}

function getRelevantCurrencies(symbolBase: string): string[] {
  const currencyMap: Record<string, string[]> = {
    'XAU': ['USD', 'EUR', 'CHF', 'JPY'], // Gold affected by USD, safe havens
    'XAG': ['USD', 'EUR'],
    'EUR': ['EUR', 'USD'],
    'GBP': ['GBP', 'USD', 'EUR'],
    'JPY': ['JPY', 'USD'],
    'CHF': ['CHF', 'USD', 'EUR'],
    'AUD': ['AUD', 'USD', 'CNY'],
    'CAD': ['CAD', 'USD'],
    'NZD': ['NZD', 'USD', 'AUD'],
    'US30': ['USD'],
    'US100': ['USD'],
    'US500': ['USD'],
    'DXY': ['USD', 'EUR', 'JPY', 'GBP'],
    'USDJPY': ['USD', 'JPY'],
    'US10Y': ['USD'],
    'US02Y': ['USD'],
    'VIX': ['USD'],
    'WTI': ['USD'],
    'GOLDSILVER': ['USD'],
  }
  return currencyMap[symbolBase] || ['USD']
}

function getDefaultCalendarContext(): CalendarContext {
  return {
    upcomingHighImpact: [],
    todayEvents: [],
    thisWeekHighImpact: [],
    imminentCount: 0,
    liveCount: 0,
    summary: 'Calendrier economique non disponible.',
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH NEWS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchLiveNews(symbol: string): Promise<NewsImpact> {
  try {
    // Fetch directly from Finnhub instead of localhost API (production-safe)
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY
    let allNews: NewsItem[] = []
    
    if (FINNHUB_KEY) {
      const response = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`,
        { next: { revalidate: 60 } }
      )
      if (response.ok) {
        const finnhubNews = await response.json()
        allNews = (finnhubNews || []).slice(0, 50).map((n: any) => ({
          id: n.id?.toString() || `fh-${n.datetime}`,
          headline: n.headline || n.title || '',
          summary: n.summary || '',
          source: n.source || 'Finnhub',
          datetime: (n.datetime || 0) * 1000,
          url: n.url || '',
          sentiment: n.sentiment || 0,
          relatedAssets: []
        }))
      }
    }
    
    if (allNews.length === 0) return getDefaultNewsImpact()
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const symbolBase = symbol.split('/')[0].toLowerCase()
    
    // Keywords for each asset type to match news
    const assetKeywords: Record<string, string[]> = {
      'XAU': ['gold', 'or', 'xau', 'bullion', 'safe haven', 'valeur refuge', 'precious metal'],
      'XAG': ['silver', 'argent', 'xag'],
      'US30': ['dow', 'djia', 'us30', 'dow jones', 'wall street', 'stock market', 'indices'],
      'US100': ['nasdaq', 'tech', 'us100', 'technology', 'tech stocks', 'nvda', 'apple', 'microsoft'],
      'US500': ['s&p', 'sp500', 'us500', 's&p 500'],
      'DXY': ['dollar', 'dxy', 'usd', 'greenback', 'fed', 'federal reserve', 'rate', 'taux'],
      'EUR': ['euro', 'eur', 'ecb', 'bce', 'europe', 'eurozone'],
      'GBP': ['pound', 'sterling', 'gbp', 'boe', 'bank of england', 'uk'],
      'JPY': ['yen', 'jpy', 'boj', 'japan', 'japon'],
      'BTC': ['bitcoin', 'btc', 'crypto', 'cryptocurrency'],
      'ETH': ['ethereum', 'eth', 'crypto'],
    }
    
    const keywords = assetKeywords[symbolBase] || [symbolBase.toLowerCase()]
    // Add geopolitical keywords for gold and safe havens
    if (['XAU', 'JPY', 'CHF'].includes(symbolBase)) {
      keywords.push('iran', 'russia', 'war', 'conflict', 'tension', 'geopolitical', 'oil', 'crude', 'brent', 'sanctions', 'tariff', 'trump')
    }
    
    const relevantNews = allNews.filter(news => {
      if (news.datetime < oneDayAgo) return false
      
      // Check if news explicitly mentions the asset
      if (news.relatedAssets?.some(asset => 
        asset?.symbol === symbol || 
        (asset?.symbol && asset.symbol.includes(symbolBase)) ||
        (asset?.symbol && symbol.includes(asset.symbol))
      )) return true
      
      // Check keywords in headline and summary
      const text = ((news.headline || '') + ' ' + (news.summary || '')).toLowerCase()
      return keywords.some(kw => text.includes(kw))
    })
    
    const bullishNews: NewsItem[] = []
    const bearishNews: NewsItem[] = []
    const neutralNews: NewsItem[] = []
    
    for (const news of relevantNews) {
      const assetImpact = news.relatedAssets?.find(a => 
        a?.symbol === symbol || 
        (a?.symbol && a.symbol.includes(symbol.split('/')[0])) ||
        (a?.symbol && symbol.includes(a.symbol))
      )
      
      if (assetImpact?.impact === 'up') bullishNews.push(news)
      else if (assetImpact?.impact === 'down') bearishNews.push(news)
      else neutralNews.push(news)
    }
    
    const bullishWeight = bullishNews.reduce((sum, n) => sum + n.importance, 0)
    const bearishWeight = bearishNews.reduce((sum, n) => sum + n.importance, 0)
    const totalWeight = bullishWeight + bearishWeight + neutralNews.length
    
    const netSentiment = totalWeight > 0 
      ? Math.round(((bullishWeight - bearishWeight) / totalWeight) * 100)
      : 0
    
    const topNews = [...relevantNews]
      .sort((a, b) => (b.importance * 10 + b.datetime / 1e10) - (a.importance * 10 + a.datetime / 1e10))
      .slice(0, 5)
    
    const newsContext = topNews.length === 0
      ? 'Pas de news significatives dans les dernieres 24h.'
      : `Sentiment ${netSentiment > 20 ? 'positif' : netSentiment < -20 ? 'negatif' : 'neutre'} (${bullishNews.length} bullish, ${bearishNews.length} bearish).`
    
    return { bullishNews, bearishNews, neutralNews, netSentiment, topNews, newsContext }
  } catch {
    return getDefaultNewsImpact()
  }
}

function getDefaultNewsImpact(): NewsImpact {
  return {
    bullishNews: [],
    bearishNews: [],
    neutralNews: [],
    netSentiment: 0,
    topNews: [],
    newsContext: 'News indisponibles'
  }
}

// ═════════════════════════��═════════════════════════════════════════════════════
// FETCH MACRO
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchMacroContext(): Promise<MacroContext> {
  try {
    const [dxyRes, vixRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=5d', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 }
      }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 }
      })
    ])
    
    const dxyData = await dxyRes.json()
    const dxyCloses = dxyData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
    const dxyChange = dxyCloses.length >= 2 
      ? ((dxyCloses[dxyCloses.length - 1] - dxyCloses[0]) / dxyCloses[0]) * 100 
      : 0
    const dxyTrend: 'up' | 'down' | 'flat' = dxyChange > 0.3 ? 'up' : dxyChange < -0.3 ? 'down' : 'flat'
    
    const vixData = await vixRes.json()
    const vixPrice = vixData?.chart?.result?.[0]?.meta?.regularMarketPrice || 20
    const vixLevel: MacroContext['vixLevel'] = vixPrice < 15 ? 'low' : vixPrice < 25 ? 'normal' : vixPrice < 35 ? 'high' : 'extreme'
    
    const marketSentiment: MacroContext['marketSentiment'] = 
      vixLevel === 'high' || vixLevel === 'extreme' ? 'risk_off' :
      vixLevel === 'low' && dxyTrend === 'down' ? 'risk_on' : 'neutral'
    
    return {
      dxyTrend,
      dxyChange: Math.round(dxyChange * 100) / 100,
      vixLevel,
      vixPrice: Math.round(vixPrice * 100) / 100,
      marketSentiment,
      yields10Y: null
    }
  } catch {
    return { dxyTrend: 'flat', dxyChange: 0, vixLevel: 'normal', vixPrice: 20, marketSentiment: 'neutral', yields10Y: null }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERT BIAS
// ═══════════════════════════════════════════════════════════════════════════════

function convertBiasWithNews(
  result: BiasResult | null, 
  type: 'swing' | 'day',
  newsImpact: NewsImpact
): UnifiedBias {
  const horizon = type === 'swing' ? '2 semaines - 1 mois' : 'Max 24h'
  
  if (!result || !result.bias) {
    return { direction: 'NEUTRAL', confidence: 50, score: 0, horizon, keyDrivers: ['Donnees insuffisantes'], newsAdjustment: 0 }
  }
  
  const biasStr = result.bias || ''
  let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 
    biasStr.includes('Haussier') ? 'BULLISH' : 
    biasStr.includes('Baissier') ? 'BEARISH' : 'NEUTRAL'
  
  let score = result.score
  let confidence = result.confidence
  
  const newsWeight = type === 'swing' ? 0.15 : 0.25
  const newsAdjustment = Math.round(newsImpact.netSentiment * newsWeight)
  
  score += newsAdjustment
  
  if (Math.abs(newsAdjustment) > 10) {
    if (score > 25 && direction !== 'BULLISH') { direction = 'BULLISH'; confidence = Math.max(confidence, 55) }
    else if (score < -25 && direction !== 'BEARISH') { direction = 'BEARISH'; confidence = Math.max(confidence, 55) }
  }
  
  if ((direction === 'BULLISH' && newsImpact.netSentiment > 20) ||
      (direction === 'BEARISH' && newsImpact.netSentiment < -20)) {
    confidence = Math.min(95, confidence + 5)
  }
  
  if ((direction === 'BULLISH' && newsImpact.netSentiment < -20) ||
      (direction === 'BEARISH' && newsImpact.netSentiment > 20)) {
    confidence = Math.max(50, confidence - 10)
  }
  
  const keyDrivers = (result.components || [])
    .filter(c => c && Math.abs(c.contribution || 0) > 5)
    .sort((a, b) => Math.abs(b.contribution || 0) - Math.abs(a.contribution || 0))
    .slice(0, 3)
    .map(c => `${c.name || 'Signal'}: ${c.signal || 'N/A'}`)
  
  if (newsImpact.topNews.length > 0 && Math.abs(newsImpact.netSentiment) > 15) {
    keyDrivers.push(newsImpact.netSentiment > 0 ? `News positives` : `News negatives`)
  }
  
  return { direction, confidence, score, horizon, keyDrivers: keyDrivers.length > 0 ? keyDrivers : ['Signal faible'], newsAdjustment }
}

// ═════════════��═════════════════════════════════════════════════════════════════
// GENERATE REPORT (NEW STRUCTURE - NO TRADE IDEA)
// ═══════════════════════════════════════════════════════════════════════════════

async function generateReport(
  symbol: string,
  price: number,
  swingBias: UnifiedBias,
  dayBias: UnifiedBias,
  verdict: AnalysisResult['verdict'],
  macro: MacroContext,
  newsImpact: NewsImpact,
  correlations: CorrelationData[],
  goldVerdict?: GoldVerdict,
  allBiases?: Record<string, { swing: { direction: string; confidence: number }; day: { direction: string; confidence: number } }>,
  calendarContext?: CalendarContext
): Promise<AnalysisResult['report']> {
  // Format news with sentiment
  const bullishHeadlines = newsImpact.bullishNews.slice(0, 3).map(n => `[HAUSSIER] ${n.headline}`).join('\n')
  const bearishHeadlines = newsImpact.bearishNews.slice(0, 3).map(n => `[BAISSIER] ${n.headline}`).join('\n')
  const topHeadlines = newsImpact.topNews.slice(0, 5).map((n, i) => `${i + 1}. [${n.source}] ${n.headline}`).join('\n')
  
  const newsHeadlines = topHeadlines || 'Pas de news significatives'
  const newsDetails = `
NEWS HAUSSIERES:
${bullishHeadlines || 'Aucune'}

NEWS BAISSIERES:
${bearishHeadlines || 'Aucune'}`
  
  const correlationsText = correlations.map(c => 
    `${c.symbol}: ${c.correlation > 0 ? '+' : ''}${c.correlation}% (${c.impact})`
  ).join('\n')

  // Format cross-asset data
  const crossAssetText = allBiases ? Object.entries(allBiases)
    .filter(([id]) => id !== symbol)
    .map(([id, b]) => `${id}: Swing ${b.swing.direction} (${b.swing.confidence}%), Day ${b.day.direction} (${b.day.confidence}%)`)
    .join('\n') : 'Non disponible'
  
  const goldVerdictText = goldVerdict ? `
VERDICT CROSS-ASSET GOLD: ${goldVerdict.direction} (Score: ${goldVerdict.crossAssetScore}, Accord: ${goldVerdict.agreement}%)
Signaux Bullish Gold: ${goldVerdict.signals.filter(s => s.impactOnGold === 'bullish').map(s => s.pairId).join(', ') || 'Aucun'}
Signaux Bearish Gold: ${goldVerdict.signals.filter(s => s.impactOnGold === 'bearish').map(s => s.pairId).join(', ') || 'Aucun'}
${goldVerdict.warning ? `WARNING: ${goldVerdict.warning}` : ''}` : ''

  // Format calendar events
  const calendarText = calendarContext ? `
CALENDRIER: ${calendarContext.summary}
${calendarContext.liveCount > 0 ? `[EN COURS] ${calendarContext.liveCount} events` : ''}
${calendarContext.imminentCount > 0 ? `[IMMINENT] ${calendarContext.imminentCount} events dans < 30min` : ''}

EVENTS HIGH IMPACT CETTE SEMAINE:
${calendarContext.thisWeekHighImpact.slice(0, 5).map(e => `- ${e.date} ${e.time}: ${e.event} (${e.currency}) ${e.actual ? `Actual: ${e.actual}` : e.forecast ? `Prev: ${e.forecast}` : ''}`).join('\n') || 'Aucun event majeur'}

EVENTS AUJOURD'HUI:
${calendarContext.todayEvents.slice(0, 5).map(e => `- ${e.time}: ${e.event} (${e.currency}) ${e.impact.toUpperCase()}`).join('\n') || 'Aucun event aujourd\'hui'}` : 'Calendrier non disponible'
  
  const prompt = `Tu es un analyste senior Goldman Sachs. Genere un rapport COMPLET et PROFESSIONNEL pour ${symbol} a ${price}.

═══════════════════════════════════════════════════════════════════════════════
BIAIS PRE-CALCULES (SOURCE DE VERITE - NE PAS CONTREDIRE)
══════════════════════���═════════════════��═════════���════════��═══════════════════

SWING TRADING (${swingBias.horizon}):
- Direction: ${swingBias.direction}
- Confiance: ${swingBias.confidence}%
- Drivers: ${swingBias.keyDrivers.join(', ')}

DAY TRADING (${dayBias.horizon}):
- Direction: ${dayBias.direction}
- Confiance: ${dayBias.confidence}%
- Drivers: ${dayBias.keyDrivers.join(', ')}

VERDICT GLOBAL: ${verdict.bias} | Conviction: ${verdict.conviction}/10 | Contexte: ${verdict.context}

═══════════════════════════════════════════════════════════════════════════════
CONTEXTE MACRO ACTUEL
═══════════════════════════════════════════════════════════════════════════════
- DXY (Dollar): ${macro.dxyTrend === 'up' ? 'HAUSSIER' : macro.dxyTrend === 'down' ? 'BAISSIER' : 'NEUTRE'} (${macro.dxyChange > 0 ? '+' : ''}${macro.dxyChange}%)
- VIX (Volatilite): ${macro.vixPrice} (${macro.vixLevel})
- Sentiment Global: ${macro.marketSentiment === 'risk_on' ? 'RISK-ON (appetit pour le risque)' : macro.marketSentiment === 'risk_off' ? 'RISK-OFF (aversion au risque)' : 'NEUTRE'}

═══════════════════════════════════��═══════════════════════════════════════════
CALENDRIER ECONOMIQUE (CRITIQUE POUR LE TIMING)
═══════════════════════════════════════════════════════════════════════════════
${calendarText}

═══════════════════════════════════════════════════════════════════════════════
ANALYSE CROSS-ASSET (TOUTES LES PAIRES DU DESK)
═══════════════════════════════════════════════════════════════════════════════
${crossAssetText}
${goldVerdictText}

═══════════════════════════════════════════════════════════════════════════════
CORRELATIONS DYNAMIQUES
═══════════════════════════════════════════════════════════════════════════════
${correlationsText}

═══════════════════════════════════════════════════════════════════════════════
NEWS EN TEMPS REEL (24H)
═══════════════════════════════════════════════════════════════════════════════
Sentiment global: ${newsImpact.netSentiment > 0 ? '+' : ''}${newsImpact.netSentiment}
${newsHeadlines}
${newsDetails}

═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS POUR L'ANALYSE
═══════════════════════════════════════════════════════════════════════════════
1. NE PAS contredire les biais pre-calcules - ils sont la source de verite
2. CROISE toutes les donnees: macro, cross-asset, news, calendrier
3. ANALYSE PAR TIMEFRAME: Weekly (tendance de fond), Daily (court terme), H4 (intraday)
4. RISQUES: identifie les events du calendrier qui pourraient inverser le biais
5. PAS de Trade Idea (pas d'entry, stop, target)
6. Utilise les NEWS REELLES pour les bullishDrivers/bearishDrivers

JSON STRICT (respecte exactement cette structure):
{
  "summary": "Verdict global en 2-3 phrases: direction principale, conviction, et horizon temporel recommande",
  "timeframeAnalysis": {
    "weekly": {
      "bias": "BULLISH/BEARISH/NEUTRAL",
      "description": "Analyse de la tendance de fond (2-4 semaines). Structure du marche, niveaux cles, momentum long terme.",
      "confidence": 75
    },
    "daily": {
      "bias": "BULLISH/BEARISH/NEUTRAL", 
      "description": "Analyse court terme (1-5 jours). Tendance immediate, catalyseurs, niveaux intraday importants.",
      "confidence": 70
    },
    "h4": {
      "bias": "BULLISH/BEARISH/NEUTRAL",
      "description": "Analyse intraday. Setup actuel, zones de reaction, timing optimal pour entrer.",
      "confidence": 65
    }
  },
  "crossAssetVerdict": "Comment les autres actifs (DXY, VIX, taux, indices) confirment ou infirment ce biais - sois specifique sur chaque actif",
  "calendarRisk": "Events economiques a surveiller et leur impact potentiel sur le biais actuel",
  "newsContext": "Resume de l'impact des news des dernieres 24h sur le prix",
  "technical": "Niveaux techniques cles: supports, resistances, zones de liquidite, patterns identifies",
  "fundamental": "Drivers fondamentaux: macro, flux institutionnels, sentiment, positionnement",
  "bullishDrivers": ["Driver haussier 1 base sur news/macro", "Driver 2", "Driver 3"],
  "bearishDrivers": ["Driver baissier 1 base sur news/macro", "Driver 2", "Driver 3"],
  "risks": {
    "primary": "Risque principal qui pourrait invalider l'analyse",
    "secondary": "Risque secondaire a surveiller",
    "calendarEvents": "Events du calendrier qui pourraient creer de la volatilite"
  },
  "invalidation": "Niveau de prix precis qui invaliderait completement le biais actuel"
}

JSON uniquement. Pas de texte avant ou apres.`

  try {
    const response = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Tu es un analyste quantitatif senior specialise dans les marches financiers. Reponds UNIQUEMENT en JSON strict valide. Tu ne DOIS JAMAIS contredire les biais pre-calcules fournis - ils sont le resultat d\'un modele technique valide. Croise TOUTES les donnees fournies (macro, cross-asset, news, calendrier) pour une analyse complete.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.15,
      max_tokens: 2500, // More tokens for detailed analysis
    })
    
    const content = response.choices[0]?.message?.content || '{}'
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const report = JSON.parse(jsonStr)
    
    // Build timeframe analysis with fallbacks
    const timeframeAnalysis = report.timeframeAnalysis || {
      weekly: { bias: swingBias.direction, description: swingBias.keyDrivers.join(', '), confidence: swingBias.confidence },
      daily: { bias: dayBias.direction, description: dayBias.keyDrivers.join(', '), confidence: dayBias.confidence },
      h4: { bias: dayBias.direction, description: 'Alignement avec Daily', confidence: Math.round(dayBias.confidence * 0.9) }
    }
    
    // Build risks object with fallbacks
    const risksObj = typeof report.risks === 'object' ? report.risks : {
      primary: report.risks || 'Risques non evalues',
      secondary: 'Non defini',
      calendarEvents: calendarContext?.summary || 'Pas d\'events majeurs'
    }
    
    return {
      summary: report.summary || `${verdict.bias} avec ${verdict.conviction}/10 de conviction`,
      timeframeAnalysis,
      crossAssetVerdict: report.crossAssetVerdict || report.crossAssetAnalysis || (goldVerdict ? `Cross-asset ${goldVerdict.direction} avec ${goldVerdict.agreement}% d'accord` : 'Non disponible'),
      calendarRisk: report.calendarRisk || calendarContext?.summary || 'Pas d\'events majeurs a surveiller',
      newsContext: report.newsContext || newsImpact.newsContext,
      technical: report.technical || 'Analyse technique non disponible',
      fundamental: report.fundamental || 'Analyse fondamentale non disponible',
      bullishDrivers: report.bullishDrivers || ['Non defini'],
      bearishDrivers: report.bearishDrivers || ['Non defini'],
      risks: risksObj,
      invalidation: report.invalidation || 'Non defini'
    }
  } catch (error) {
    console.error('[Orvyn] Groq error:', error)
    return {
      summary: `${symbol}: ${verdict.bias} (${verdict.conviction}/10)`,
      timeframeAnalysis: {
        weekly: { bias: swingBias.direction, description: swingBias.keyDrivers.join(', '), confidence: swingBias.confidence },
        daily: { bias: dayBias.direction, description: dayBias.keyDrivers.join(', '), confidence: dayBias.confidence },
        h4: { bias: dayBias.direction, description: 'Non disponible', confidence: 50 }
      },
      crossAssetVerdict: goldVerdict ? `Cross-asset ${goldVerdict.direction}` : 'Non disponible',
      calendarRisk: calendarContext?.summary || 'Non disponible',
      newsContext: newsImpact.newsContext,
      technical: 'Rapport indisponible',
      fundamental: 'Rapport indisponible',
      bullishDrivers: ['Non disponible'],
      bearishDrivers: ['Non disponible'],
      risks: { primary: 'Non evalue', secondary: 'Non defini', calendarEvents: 'Non disponible' },
      invalidation: 'Non defini'
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

// Normalize symbol to XAU/USD format for API compatibility
function normalizeSymbol(symbol: string): string {
  const mappings: Record<string, string> = {
    'XAUUSD': 'XAU/USD',
    'XAGUSD': 'XAG/USD',
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD',
    'NZDUSD': 'NZD/USD',
  }
  return mappings[symbol] || symbol
}

export async function POST(req: NextRequest) {
  try {
    const { symbol: rawSymbol } = await req.json()
    
    if (!rawSymbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }
    
    // Normalize the symbol
    const symbol = normalizeSymbol(rawSymbol)
    console.log(`[Orvyn] Starting analysis for ${symbol} (raw: ${rawSymbol})`)
    
    // Fetch ALL data in parallel (using unified BiasEngine)
    console.log(`[Orvyn] ${symbol} Starting data fetch...`)
    
    let biasResult, macro, newsImpact, correlations, calendarContext
    try {
      // fetchCorrelations is synchronous, wrap in Promise.resolve
      const correlationsData = fetchCorrelations(symbol)
      ;[biasResult, macro, newsImpact, correlations, calendarContext] = await Promise.all([
        calculateBias(symbol).catch(e => { console.error('[Orvyn] calculateBias error:', e); return null }),
        fetchMacroContext().catch(e => { console.error('[Orvyn] fetchMacroContext error:', e); return { dxyTrend: 'neutral', dxyChange: 0, vixPrice: 20, vixLevel: 'normal', marketSentiment: 'neutral' as const } }),
        fetchLiveNews(symbol).catch(e => { console.error('[Orvyn] fetchLiveNews error:', e); return { bullishNews: [], bearishNews: [], topNews: [], netSentiment: 0, newsContext: 'Pas de news' } }),
        Promise.resolve(correlationsData),
        fetchEconomicCalendar(symbol).catch(e => { console.error('[Orvyn] fetchEconomicCalendar error:', e); return getDefaultCalendarContext() })
      ])
      console.log(`[Orvyn] ${symbol} Data fetch complete - biasResult:`, biasResult ? 'OK' : 'NULL')
    } catch (fetchError) {
      console.error('[Orvyn] Data fetch failed:', fetchError)
      throw fetchError
    }
    
    // Fetch biases for ALL pairs to calculate Gold Verdict (cross-asset)
    const allPairs = getAllPairs()
    const allBiasResults = await Promise.all(
      allPairs.map(async (p) => {
        try {
          const bias = await calculateBias(p.id)
          return { id: p.id, bias }
        } catch {
          return { id: p.id, bias: null }
        }
      })
    )
    
    // Build allBiases map for Gold Verdict
    const allBiases: Record<string, { swing: { direction: string; confidence: number }; day: { direction: string; confidence: number } }> = {}
    for (const { id, bias } of allBiasResults) {
      if (bias) {
        allBiases[id] = {
          swing: { direction: bias.swing.direction, confidence: bias.swing.confidence },
          day: { direction: bias.day.direction, confidence: bias.day.confidence },
        }
      }
    }
    
    // Calculate Gold Verdict (cross-asset intelligence)
    const goldVerdict = calculateGoldVerdict(allBiases)
    
    console.log(`[Orvyn] ${symbol} Data collected: ${correlations.length} correlations, ${newsImpact.topNews.length} news, ${Object.keys(allBiases).length} cross-asset pairs, ${calendarContext.thisWeekHighImpact.length} calendar events`)
    
    // Use biases directly from unified engine (with fallbacks)
    const defaultBias = { direction: 'NEUTRAL' as const, confidence: 50, keyDrivers: ['Donnees insuffisantes'], horizon: '1-3 jours' }
    const swingBias = biasResult?.swing ? convertBiasWithNews(biasResult.swing, 'swing', newsImpact) : defaultBias
    const dayBias = biasResult?.day ? convertBiasWithNews(biasResult.day, 'day', newsImpact) : defaultBias
    
    console.log(`[Orvyn] ${symbol} Swing: ${swingBias.direction} (${swingBias.confidence}%)`)
    console.log(`[Orvyn] ${symbol} Day: ${dayBias.direction} (${dayBias.confidence}%)`)
    
    // Determine verdict
    let verdictBias = swingBias.direction
    let verdictConviction = Math.round(swingBias.confidence / 10)
    let context: 'TREND' | 'PULLBACK' | 'RANGE' = 'TREND'
    
    if (swingBias.direction !== dayBias.direction && 
        swingBias.direction !== 'NEUTRAL' && 
        dayBias.direction !== 'NEUTRAL') {
      context = 'PULLBACK'
      verdictConviction = Math.max(1, verdictConviction - 2)
    } else if (swingBias.direction === 'NEUTRAL' && dayBias.direction === 'NEUTRAL') {
      context = 'RANGE'
    }
    
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    if (verdictConviction >= 6) {
      action = verdictBias === 'BULLISH' ? 'BUY' : verdictBias === 'BEARISH' ? 'SELL' : 'HOLD'
    }
    
    const verdict = { bias: verdictBias, conviction: verdictConviction, action, context }
    
    // Generate report (price from biasResult if available)
    const price = biasResult?.price || 0
    const change24h = biasResult?.change || 0
    
    let report
    try {
      console.log(`[Orvyn] ${symbol} Generating AI report...`)
      report = await generateReport(symbol, price, swingBias, dayBias, verdict, macro, newsImpact, correlations, goldVerdict, allBiases, calendarContext)
      console.log(`[Orvyn] ${symbol} AI report generated successfully`)
    } catch (reportError) {
      console.error('[Orvyn] generateReport error:', reportError)
      // Fallback report
      report = {
        summary: `${symbol}: ${verdict.bias} (${verdict.conviction}/10) - Analyse IA temporairement indisponible`,
        timeframeAnalysis: {
          weekly: { bias: swingBias.direction, description: swingBias.keyDrivers.join(', '), confidence: swingBias.confidence },
          daily: { bias: dayBias.direction, description: dayBias.keyDrivers.join(', '), confidence: dayBias.confidence },
          h4: { bias: dayBias.direction, description: 'Alignement avec Daily', confidence: Math.round(dayBias.confidence * 0.9) }
        },
        crossAssetVerdict: goldVerdict ? `Cross-asset ${goldVerdict.direction}` : 'Non disponible',
        calendarRisk: calendarContext?.summary || 'Non disponible',
        newsContext: newsImpact.newsContext || 'Pas de news',
        technical: 'Analyse technique non disponible',
        fundamental: 'Analyse fondamentale non disponible',
        bullishDrivers: (swingBias.keyDrivers || []).filter(d => d && (d.toLowerCase().includes('bull') || d.toLowerCase().includes('support'))),
        bearishDrivers: (swingBias.keyDrivers || []).filter(d => d && (d.toLowerCase().includes('bear') || d.toLowerCase().includes('resist'))),
        risks: { primary: 'Non evalue', secondary: 'Non defini', calendarEvents: calendarContext?.summary || 'Non disponible' },
        invalidation: 'Non defini'
      }
    }
    
    const analysis: AnalysisResult = {
      symbol,
      timestamp: new Date().toISOString(),
      price,
      change24h,
      swingBias,
      dayBias,
      verdict,
      macro,
      newsImpact,
      correlations,
      calendarContext, // Economic calendar
      report,
      goldVerdict, // Cross-asset intelligence
      crossAssetBiases: allBiases, // All pairs biases
      sources: ['Yahoo Finance', 'Indicateurs Techniques', 'Macro (DXY, VIX)', 'Live News', 'Calendrier Economique', 'Correlations Dynamiques', 'Cross-Asset Analysis', 'Groq AI']
    }
    
    console.log(`[Orvyn] ${symbol} Complete: ${verdict.bias} (${verdict.conviction}/10) - ${verdict.action}`)
    
    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('[Orvyn] Error:', error instanceof Error ? error.message : error)
    console.error('[Orvyn] Stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
