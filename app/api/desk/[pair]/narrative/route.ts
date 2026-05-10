import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

// Lazy Groq initialization
function getGroq() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured')
  }
  return new Groq({ apiKey })
}

// Pair configurations for narrative generation
const PAIR_CONFIGS: Record<string, {
  fullName: string
  category: string
  drivers: string[]
  inverseCorrelations: string[]
}> = {
  XAUUSD: {
    fullName: 'Gold (XAU/USD)',
    category: 'precious_metal',
    drivers: ['real rates', 'dollar strength', 'geopolitical risk', 'inflation expectations', 'central bank policy', 'risk sentiment'],
    inverseCorrelations: ['DXY', 'US10Y real yields']
  },
  DXY: {
    fullName: 'US Dollar Index',
    category: 'currency',
    drivers: ['Fed policy', 'US economic data', 'risk sentiment', 'yield differentials', 'trade balance'],
    inverseCorrelations: ['EUR/USD', 'Gold']
  },
  XAGUSD: {
    fullName: 'Silver (XAG/USD)',
    category: 'precious_metal',
    drivers: ['industrial demand', 'gold correlation', 'solar/EV demand', 'inflation', 'dollar strength'],
    inverseCorrelations: ['DXY']
  },
  US500: {
    fullName: 'S&P 500',
    category: 'equity_index',
    drivers: ['earnings growth', 'Fed policy', 'economic data', 'risk appetite', 'tech sector'],
    inverseCorrelations: ['VIX']
  },
  US100: {
    fullName: 'Nasdaq 100',
    category: 'equity_index',
    drivers: ['tech earnings', 'AI momentum', 'rates sensitivity', 'growth expectations'],
    inverseCorrelations: ['US10Y', 'VIX']
  },
  US30: {
    fullName: 'Dow Jones',
    category: 'equity_index',
    drivers: ['industrial production', 'value rotation', 'economic cycle', 'trade policy'],
    inverseCorrelations: ['VIX']
  },
  VIX: {
    fullName: 'Volatility Index',
    category: 'volatility',
    drivers: ['market fear', 'options activity', 'event risk', 'correlation breakdown'],
    inverseCorrelations: ['US500', 'US100']
  },
  US10Y: {
    fullName: '10-Year Treasury Yield',
    category: 'bond',
    drivers: ['Fed policy', 'inflation expectations', 'economic growth', 'term premium', 'foreign demand'],
    inverseCorrelations: ['Bond prices', 'Gold']
  },
  US02Y: {
    fullName: '2-Year Treasury Yield',
    category: 'bond',
    drivers: ['Fed rate expectations', 'short-term policy', 'inflation data'],
    inverseCorrelations: ['Rate cut expectations']
  },
  WTI: {
    fullName: 'Crude Oil WTI',
    category: 'commodity',
    drivers: ['OPEC policy', 'US production', 'global demand', 'geopolitics', 'inventories', 'China demand'],
    inverseCorrelations: ['DXY']
  },
  USDJPY: {
    fullName: 'USD/JPY',
    category: 'currency',
    drivers: ['BoJ policy', 'yield differential', 'risk sentiment', 'carry trade', 'intervention risk'],
    inverseCorrelations: ['JPY strength']
  },
  EURUSD: {
    fullName: 'EUR/USD',
    category: 'currency',
    drivers: ['ECB policy', 'eurozone data', 'rate differentials', 'political risk'],
    inverseCorrelations: ['DXY']
  },
  GBPUSD: {
    fullName: 'GBP/USD',
    category: 'currency',
    drivers: ['BoE policy', 'UK economic data', 'political stability', 'rate expectations'],
    inverseCorrelations: ['DXY']
  },
  BTCUSD: {
    fullName: 'Bitcoin',
    category: 'crypto',
    drivers: ['risk appetite', 'institutional flows', 'halving cycle', 'regulatory news', 'ETF flows'],
    inverseCorrelations: ['DXY']
  },
  GOLDSILVER: {
    fullName: 'Gold/Silver Ratio',
    category: 'ratio',
    drivers: ['relative value', 'industrial vs monetary demand', 'risk sentiment'],
    inverseCorrelations: []
  }
}

// Fetch real-time market context
async function fetchMarketContext(): Promise<{
  vix: number
  dxy: number
  us10y: number
  sentiment: string
}> {
  try {
    const [vixRes, dxyRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    ])
    
    let vix = 18, dxy = 104
    
    if (vixRes.ok) {
      const vixData = await vixRes.json()
      vix = vixData?.chart?.result?.[0]?.meta?.regularMarketPrice || 18
    }
    
    if (dxyRes.ok) {
      const dxyData = await dxyRes.json()
      dxy = dxyData?.chart?.result?.[0]?.meta?.regularMarketPrice || 104
    }
    
    const sentiment = vix > 25 ? 'risk-off' : vix < 15 ? 'risk-on' : 'neutral'
    
    return { vix, dxy, us10y: 4.5, sentiment }
  } catch {
    return { vix: 18, dxy: 104, us10y: 4.5, sentiment: 'neutral' }
  }
}

// Fetch latest news headlines
async function fetchLatestNews(keywords: string[]): Promise<string[]> {
  try {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY
    if (!FINNHUB_KEY) return []
    
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`)
    if (!res.ok) return []
    
    const news = await res.json()
    const relevantNews = (news || [])
      .filter((n: any) => {
        const text = `${n.headline || ''} ${n.summary || ''}`.toLowerCase()
        return keywords.some(kw => text.includes(kw.toLowerCase()))
      })
      .slice(0, 5)
      .map((n: any) => n.headline || '')
    
    return relevantNews
  } catch {
    return []
  }
}

// Build the narrative prompt
function buildNarrativePrompt(
  symbol: string,
  config: typeof PAIR_CONFIGS[string],
  marketContext: { vix: number; dxy: number; us10y: number; sentiment: string },
  headlines: string[]
): string {
  const newsSection = headlines.length > 0 
    ? `Recent headlines:\n${headlines.map(h => `- ${h}`).join('\n')}`
    : 'No recent specific news available.'
    
  return `Tu es un analyste macro senior. Genere une analyse narrative pour ${config.fullName} (${symbol}).

CONTEXTE MARCHE ACTUEL:
- VIX: ${marketContext.vix.toFixed(1)} (${marketContext.sentiment})
- DXY: ${marketContext.dxy.toFixed(2)}
- US10Y: ${marketContext.us10y.toFixed(2)}%

${newsSection}

DRIVERS PRINCIPAUX DE ${symbol}: ${config.drivers.join(', ')}
CORRELATIONS INVERSES: ${config.inverseCorrelations.join(', ') || 'Aucune'}

INSTRUCTIONS STRICTES:
1. NE JAMAIS mentionner RSI, MACD, EMA, bandes de Bollinger ou autres indicateurs techniques
2. Parle UNIQUEMENT de: politique monetaire, geopolitique, flux de capitaux, donnees economiques, sentiment
3. Sois CONCRET et ACTIONNABLE - donne des raisons specifiques
4. Chaque timeframe doit avoir une perspective differente

Reponds en JSON STRICT (pas de markdown):
{
  "weekly": {
    "bias": "bullish" | "bearish" | "neutral",
    "confidence": 1-10,
    "text": "2-3 phrases sur la tendance de fond cette semaine. Contexte macro, politique monetaire, flux institutionnels."
  },
  "daily": {
    "bias": "bullish" | "bearish" | "neutral", 
    "confidence": 1-10,
    "text": "2-3 phrases sur la dynamique du jour. News recentes, catalyseurs immediats, sentiment intraday."
  },
  "h4": {
    "bias": "bullish" | "bearish" | "neutral",
    "confidence": 1-10,
    "text": "2-3 phrases sur le momentum court terme. Price action recente, niveaux cles, risques immediats."
  },
  "bullishDrivers": ["3 raisons concretes de hausse"],
  "bearishDrivers": ["3 raisons concretes de baisse"],
  "keyEvents": ["2-3 evenements a surveiller cette semaine"],
  "invalidation": "Quel scenario invaliderait cette analyse"
}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  const symbol = pair.toUpperCase().replace('-', '').replace('/', '')
  
  const config = PAIR_CONFIGS[symbol] || {
    fullName: symbol,
    category: 'unknown',
    drivers: ['market sentiment', 'macro conditions'],
    inverseCorrelations: []
  }
  
  // Fetch data in parallel
  const [marketContext, headlines] = await Promise.all([
    fetchMarketContext(),
    fetchLatestNews([symbol, ...config.drivers.slice(0, 2)])
  ])
  
  // Build prompt
  const prompt = buildNarrativePrompt(symbol, config, marketContext, headlines)
  
  try {
    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un analyste macro senior. Tu fournis des analyses narratives sans jargon technique. Reponds uniquement en JSON valide.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
    
    const responseText = completion.choices[0]?.message?.content || '{}'
    
    // Parse JSON response
    let result
    try {
      // Clean up potential markdown formatting
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      result = JSON.parse(cleanJson)
    } catch {
      // Fallback response
      result = {
        weekly: { bias: 'neutral', confidence: 5, text: 'Analyse en cours de generation...' },
        daily: { bias: 'neutral', confidence: 5, text: 'Donnees insuffisantes pour une analyse precise.' },
        h4: { bias: 'neutral', confidence: 5, text: 'Surveillez les niveaux cles.' },
        bullishDrivers: ['Amelioration du sentiment', 'Support technique', 'Flux positifs'],
        bearishDrivers: ['Risque macro', 'Pression vendeuse', 'Incertitude politique'],
        keyEvents: ['Donnees economiques', 'Discours Fed'],
        invalidation: 'Cassure des niveaux cles'
      }
    }
    
    return NextResponse.json({
      symbol,
      ...result,
      generatedAt: new Date().toISOString(),
      cached: false
    })
    
  } catch (error) {
    console.error('[Narrative] Groq error:', error)
    return NextResponse.json({
      error: 'Failed to generate analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
