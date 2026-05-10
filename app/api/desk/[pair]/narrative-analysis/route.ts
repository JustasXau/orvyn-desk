import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import Groq from 'groq-sdk'

// Use Upstash Redis for caching (lazy init)
function getRedis() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    })
  }
  return null
}

// Lazy Groq initialization to avoid build errors
function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured')
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

// Configuration par paire
const PAIR_CONFIGS: Record<string, { 
  fullName: string
  category: string
  drivers: string[]
  inverseCorrelations: string[]
}> = {
  'XAUUSD': {
    fullName: 'Gold (XAU/USD)',
    category: 'metal',
    drivers: ['taux reels US', 'dollar index', 'inflation', 'geopolitique', 'demande physique Chine/Inde'],
    inverseCorrelations: ['DXY', 'US10Y real rates']
  },
  'XAGUSD': {
    fullName: 'Silver (XAG/USD)',
    category: 'metal',
    drivers: ['demande industrielle', 'energie solaire', 'ratio gold/silver', 'inflation'],
    inverseCorrelations: ['DXY']
  },
  'DXY': {
    fullName: 'Dollar Index (DXY)',
    category: 'forex',
    drivers: ['politique Fed', 'differentiels de taux', 'risk-on/risk-off', 'donnees emploi US'],
    inverseCorrelations: ['EUR/USD', 'Gold']
  },
  'US500': {
    fullName: 'S&P 500 (US500)',
    category: 'index',
    drivers: ['earnings', 'politique Fed', 'sentiment consommateur', 'tech sector'],
    inverseCorrelations: ['VIX']
  },
  'US100': {
    fullName: 'Nasdaq 100 (US100)',
    category: 'index',
    drivers: ['tech earnings', 'taux longs', 'IA/cloud growth', 'FAANG'],
    inverseCorrelations: ['VIX', 'US10Y']
  },
  'US30': {
    fullName: 'Dow Jones (US30)',
    category: 'index',
    drivers: ['industrials', 'economie reelle', 'emploi', 'manufacturing'],
    inverseCorrelations: ['VIX']
  },
  'WTI': {
    fullName: 'Crude Oil WTI',
    category: 'commodity',
    drivers: ['OPEC decisions', 'inventaires EIA', 'demande Chine', 'geopolitique Moyen-Orient'],
    inverseCorrelations: ['recession fears']
  },
  'VIX': {
    fullName: 'VIX Volatility Index',
    category: 'volatility',
    drivers: ['incertitude marche', 'options flow', 'evenements macro'],
    inverseCorrelations: ['US500', 'risk appetite']
  },
  'US10Y': {
    fullName: '10-Year Treasury Yield',
    category: 'rate',
    drivers: ['inflation expectations', 'Fed policy', 'fiscal deficit', 'foreign demand'],
    inverseCorrelations: ['bond prices', 'growth stocks']
  },
  'USDJPY': {
    fullName: 'USD/JPY',
    category: 'forex',
    drivers: ['BoJ policy', 'carry trade', 'US yields', 'risk sentiment'],
    inverseCorrelations: ['JPY strength during risk-off']
  },
  'GOLDSILVER': {
    fullName: 'Gold/Silver Ratio',
    category: 'ratio',
    drivers: ['industrial vs monetary demand', 'risk sentiment', 'inflation'],
    inverseCorrelations: []
  }
}

// Fetch price data from Yahoo
async function fetchPriceData(symbol: string) {
  const yahooSymbols: Record<string, string> = {
    'XAUUSD': 'GC=F', 'XAGUSD': 'SI=F', 'DXY': 'DX-Y.NYB',
    'US500': '^GSPC', 'US100': '^NDX', 'US30': '^DJI',
    'WTI': 'CL=F', 'VIX': '^VIX', 'US10Y': '^TNX',
    'USDJPY': 'JPY=X', 'GOLDSILVER': 'GC=F'
  }
  
  const yahooSymbol = yahooSymbols[symbol] || symbol
  
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=30d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta
    const quotes = result?.indicators?.quote?.[0]
    
    if (!meta || !quotes) return null
    
    const closes = quotes.close?.filter((c: number) => c > 0) || []
    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1]
    const prevClose = meta.previousClose || closes[closes.length - 2]
    
    // Calculate trends
    const weekAgo = closes[closes.length - 5] || currentPrice
    const monthAgo = closes[0] || currentPrice
    
    return {
      current: currentPrice,
      previousClose: prevClose,
      change24h: ((currentPrice - prevClose) / prevClose * 100).toFixed(2),
      weekChange: ((currentPrice - weekAgo) / weekAgo * 100).toFixed(2),
      monthChange: ((currentPrice - monthAgo) / monthAgo * 100).toFixed(2),
      high24h: Math.max(...closes.slice(-2)),
      low24h: Math.min(...closes.slice(-2))
    }
  } catch {
    return null
  }
}

// Fetch latest news from Finnhub
async function fetchLatestNews(keywords: string[]) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY
  if (!FINNHUB_KEY) return []
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    
    const news = await res.json()
    return (news || [])
      .filter((n: any) => keywords.some(kw => 
        (n.headline || '').toLowerCase().includes(kw.toLowerCase())
      ))
      .slice(0, 5)
      .map((n: any) => n.headline)
  } catch {
    return []
  }
}

// Build the narrative prompt
function buildNarrativePrompt(
  symbol: string,
  config: typeof PAIR_CONFIGS[string],
  priceData: any,
  newsHeadlines: string[]
) {
  return `Tu es un analyste macro senior specialise dans ${config.fullName}. 
Tu dois fournir une analyse NARRATIVE et CONTEXTUELLE - PAS d'indicateurs techniques (RSI, MACD, etc.).
Focus sur: le CONTEXTE MACRO, les NEWS POLITIQUES, les DRIVERS FONDAMENTAUX, et le SENTIMENT.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DONNEES ACTUELLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Symbole: ${symbol} (${config.fullName})
Categorie: ${config.category}
Prix actuel: ${priceData?.current ?? 'N/A'}
Variation 24h: ${priceData?.change24h ?? 'N/A'}%
Variation semaine: ${priceData?.weekChange ?? 'N/A'}%
Variation mois: ${priceData?.monthChange ?? 'N/A'}%

Drivers principaux: ${config.drivers.join(', ')}
Correlations inverses: ${config.inverseCorrelations.join(', ') || 'Aucune'}

News recentes:
${newsHeadlines.length > 0 ? newsHeadlines.map(h => `- ${h}`).join('\n') : '- Pas de news specifiques detectees'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Pour chaque timeframe (weekly, daily, h4), ecris un PARAGRAPHE NARRATIF de 3-5 phrases
2. NE MENTIONNE JAMAIS: RSI, MACD, EMA, Bollinger, supports/resistances techniques
3. PARLE DE: contexte politique, decisions banques centrales, geopolitique, flux de capitaux, sentiment, news recentes
4. Sois CONCRET avec des faits et chiffres quand disponibles
5. Explique POURQUOI le prix pourrait monter OU descendre
6. Chaque timeframe doit avoir une perspective differente (long terme vs court terme)

Reponds UNIQUEMENT avec ce JSON:
{
  "globalSummary": "<Resume executif de 2-3 phrases sur la situation actuelle et le biais global>",
  "weekly": {
    "verdict": "Bullish" | "Bearish" | "Neutral",
    "conviction": <1-10>,
    "narrative": "<Paragraphe de 4-6 phrases sur la vision LONG TERME: tendances macro, politique monetaire, cycles economiques, flux institutionnels. Explique pourquoi le prix pourrait evoluer dans cette direction sur les prochaines semaines.>"
  },
  "daily": {
    "verdict": "Bullish" | "Bearish" | "Neutral", 
    "conviction": <1-10>,
    "narrative": "<Paragraphe de 4-6 phrases sur la vision MOYEN TERME: evenements de la semaine, donnees economiques attendues, positionnement des traders, news recentes. Explique les catalyseurs des prochains jours.>"
  },
  "h4": {
    "verdict": "Bullish" | "Bearish" | "Neutral",
    "conviction": <1-10>,
    "narrative": "<Paragraphe de 4-6 phrases sur la vision COURT TERME: sentiment intraday, flux actuels, reactions aux news du jour, comportement des sessions (Asie/Europe/US). Explique ce qui peut bouger le prix aujourd'hui.>"
  },
  "bullishDrivers": ["<3-4 raisons concretes qui pourraient faire MONTER le prix>"],
  "bearishDrivers": ["<3-4 raisons concretes qui pourraient faire BAISSER le prix>"],
  "keyRisks": ["<3 risques principaux a surveiller>"],
  "upcomingCatalysts": [
    { "date": "<date>", "event": "<evenement>", "impact": "high" | "medium" | "low" }
  ],
  "invalidation": {
    "level": <prix qui invaliderait le scenario principal>,
    "reason": "<explication de pourquoi ce niveau est important>"
  },
  "tradeBias": "Bullish" | "Bearish" | "Neutral",
  "confidence": <0-100>
}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  const symbol = pair.toUpperCase().replace('-', '').replace('/', '')
  
  // Check cache first
  const cacheKey = `narrative:${symbol}`
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(typeof cached === 'string' ? JSON.parse(cached) : cached)
      }
    } catch {
      // Cache miss or error, continue
    }
  }
  
  const config = PAIR_CONFIGS[symbol] || {
    fullName: symbol,
    category: 'unknown',
    drivers: ['market sentiment', 'macro conditions'],
    inverseCorrelations: []
  }
  
  // Fetch data in parallel
  const [priceData, newsHeadlines] = await Promise.all([
    fetchPriceData(symbol),
    fetchLatestNews([symbol, ...config.drivers.slice(0, 2)])
  ])
  
  // Build prompt
  const prompt = buildNarrativePrompt(symbol, config, priceData, newsHeadlines)
  
  try {
    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Tu es un analyste macro institutionnel. Tu reponds UNIQUEMENT en JSON valide.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from Groq')
    }
    
    const analysis = JSON.parse(content)
    
    // Add metadata
    const result = {
      symbol,
      generatedAt: Date.now(),
      ...analysis
    }
    
    // Cache for 10 minutes
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 600 })
      } catch {
        // Cache error, continue without caching
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('[Narrative Analysis] Groq error:', error)
    
    // Return fallback data
    return NextResponse.json({
      symbol,
      generatedAt: Date.now(),
      globalSummary: `L'analyse de ${config.fullName} est temporairement indisponible. Les donnees seront mises a jour prochainement.`,
      weekly: {
        verdict: 'Neutral',
        conviction: 5,
        narrative: `Vision weekly en cours de generation pour ${config.fullName}. Les principaux drivers a surveiller sont: ${config.drivers.slice(0, 3).join(', ')}.`
      },
      daily: {
        verdict: 'Neutral',
        conviction: 5,
        narrative: `Vision daily en cours de generation. Le prix actuel est de ${priceData?.current ?? 'N/A'} avec une variation de ${priceData?.change24h ?? '0'}% sur 24h.`
      },
      h4: {
        verdict: 'Neutral',
        conviction: 5,
        narrative: `Vision H4 en cours de generation. Surveillez les sessions de trading et les flux de capitaux pour des opportunites intraday.`
      },
      bullishDrivers: config.drivers.slice(0, 2).map(d => `Potentiel haussier si ${d} favorable`),
      bearishDrivers: ['Deterioration du sentiment', 'Renforcement du dollar'],
      keyRisks: ['Volatilite elevee', 'Evenements macro inattendus', 'Liquidite reduite'],
      upcomingCatalysts: [],
      invalidation: {
        level: priceData?.current ? priceData.current * 0.95 : 0,
        reason: 'Niveau technique et psychologique important'
      },
      tradeBias: 'Neutral',
      confidence: 40
    })
  }
}
