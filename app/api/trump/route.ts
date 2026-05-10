import { NextResponse } from 'next/server'

// Trump Tracker API - Multi-source aggregation
// Sources: RSS feeds (no API key), Finnhub, NewsAPI

interface TrumpStatement {
  id: string
  time: string
  timestamp: number
  statement: string
  source: string
  sourceUrl: string
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  affectedInstruments: { symbol: string; direction: 'up' | 'down' | 'mixed' }[]
  category: 'tariff' | 'fed' | 'trade' | 'geopolitical' | 'economic' | 'general'
}

interface TrumpData {
  riskScore: number
  riskLevel: string
  description: string
  generatedAt: string
  statements: TrumpStatement[]
  upcomingEvents: { time: string; title: string; riskLevel: 'high' | 'medium' | 'low' }[]
  lastUpdate: string
}

// Keywords for detecting Trump-related news and impact
const TRUMP_KEYWORDS = [
  'trump', 'tariff', 'tariffs', 'executive order', 'truth social',
  'white house', 'mar-a-lago', 'potus', 'trade deal', 'sanctions',
  'federal reserve', 'powell', 'interest rates', 'trade war',
  'china tariff', 'mexico border', 'nato', 'ukraine', 'opec'
]

const HIGH_IMPACT_KEYWORDS = ['tariff', 'sanction', 'executive order', 'trade war', 'emergency', 'military']
const MEDIUM_IMPACT_KEYWORDS = ['deal', 'negotiation', 'meeting', 'summit', 'announcement']

// Instrument impact mapping
const IMPACT_MAP: Record<string, { symbols: string[]; defaultDirection: 'up' | 'down' | 'mixed' }> = {
  'tariff china': { symbols: ['USD/CNH', 'US30', 'US100', 'USOIL'], defaultDirection: 'down' },
  'tariff': { symbols: ['DXY', 'US30', 'US100'], defaultDirection: 'mixed' },
  'rate': { symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD'], defaultDirection: 'mixed' },
  'fed': { symbols: ['DXY', 'XAU/USD', 'US30'], defaultDirection: 'mixed' },
  'powell': { symbols: ['DXY', 'XAU/USD', 'US30', 'US100'], defaultDirection: 'mixed' },
  'oil': { symbols: ['USOIL', 'UKOIL', 'USD/CAD'], defaultDirection: 'up' },
  'iran': { symbols: ['USOIL', 'XAU/USD', 'USD/JPY'], defaultDirection: 'up' },
  'gold': { symbols: ['XAU/USD', 'XAG/USD'], defaultDirection: 'up' },
  'nato': { symbols: ['EUR/USD', 'GBP/USD', 'GER40'], defaultDirection: 'down' },
  'ukraine': { symbols: ['EUR/USD', 'XAU/USD', 'NGAS'], defaultDirection: 'mixed' },
  'russia': { symbols: ['EUR/USD', 'XAU/USD', 'NGAS', 'USOIL'], defaultDirection: 'up' },
  'mexico': { symbols: ['USD/MXN', 'US30'], defaultDirection: 'mixed' },
  'canada': { symbols: ['USD/CAD', 'USOIL'], defaultDirection: 'mixed' },
  'china': { symbols: ['USD/CNH', 'US100', 'AUD/USD'], defaultDirection: 'down' },
  'crypto': { symbols: ['BTC/USD', 'ETH/USD'], defaultDirection: 'mixed' },
  'bitcoin': { symbols: ['BTC/USD', 'ETH/USD'], defaultDirection: 'mixed' },
}

function classifyImpact(text: string): { 
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  instruments: { symbol: string; direction: 'up' | 'down' | 'mixed' }[]
  category: TrumpStatement['category']
} {
  const lower = text.toLowerCase()
  const instruments: { symbol: string; direction: 'up' | 'down' | 'mixed' }[] = []
  
  // Determine impact level
  let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
  if (HIGH_IMPACT_KEYWORDS.some(kw => lower.includes(kw))) level = 'HIGH'
  else if (MEDIUM_IMPACT_KEYWORDS.some(kw => lower.includes(kw))) level = 'MEDIUM'
  
  // Detect affected instruments
  for (const [keyword, config] of Object.entries(IMPACT_MAP)) {
    if (lower.includes(keyword)) {
      for (const symbol of config.symbols) {
        if (!instruments.find(i => i.symbol === symbol)) {
          instruments.push({ symbol, direction: config.defaultDirection })
        }
      }
    }
  }
  
  // Determine category
  let category: TrumpStatement['category'] = 'general'
  if (lower.includes('tariff') || lower.includes('trade war')) category = 'tariff'
  else if (lower.includes('fed') || lower.includes('powell') || lower.includes('rate')) category = 'fed'
  else if (lower.includes('deal') || lower.includes('trade')) category = 'trade'
  else if (lower.includes('iran') || lower.includes('russia') || lower.includes('nato') || lower.includes('ukraine')) category = 'geopolitical'
  else if (lower.includes('economy') || lower.includes('gdp') || lower.includes('job')) category = 'economic'
  
  return { level, instruments, category }
}

// Fetch RSS feed and parse XML
async function fetchRSS(url: string, sourceName: string): Promise<TrumpStatement[]> {
  try {
    const res = await fetch(url, { 
      next: { revalidate: 120 },
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
    })
    if (!res.ok) return []
    
    const text = await res.text()
    const statements: TrumpStatement[] = []
    
    // Simple XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/
    const linkRegex = /<link>(.*?)<\/link>/
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/
    const descRegex = /<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/
    
    let match
    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1]
      const title = titleRegex.exec(item)?.[1] || ''
      const link = linkRegex.exec(item)?.[1] || ''
      const pubDate = pubDateRegex.exec(item)?.[1] || ''
      const desc = descRegex.exec(item)?.[1] || ''
      
      const combined = `${title} ${desc}`.toLowerCase()
      
      // Filter for Trump-related content
      if (TRUMP_KEYWORDS.some(kw => combined.includes(kw))) {
        const timestamp = new Date(pubDate).getTime()
        const { level, instruments, category } = classifyImpact(combined)
        
        statements.push({
          id: `rss-${sourceName}-${timestamp}`,
          time: new Date(timestamp).toLocaleString('fr-FR', { 
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
          }),
          timestamp,
          statement: title.replace(/<[^>]*>/g, '').substring(0, 200),
          source: sourceName,
          sourceUrl: link,
          impactLevel: level,
          affectedInstruments: instruments,
          category
        })
      }
    }
    
    return statements
  } catch (e) {
    console.error(`RSS fetch error (${sourceName}):`, e)
    return []
  }
}

// Fetch from Finnhub
async function fetchFinnhub(): Promise<TrumpStatement[]> {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY
  if (!FINNHUB_KEY) return []
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    
    const news = await res.json()
    const statements: TrumpStatement[] = []
    
    for (const item of news) {
      const combined = `${item.headline || ''} ${item.summary || ''}`.toLowerCase()
      
      if (TRUMP_KEYWORDS.some(kw => combined.includes(kw))) {
        const timestamp = (item.datetime || 0) * 1000
        const { level, instruments, category } = classifyImpact(combined)
        
        statements.push({
          id: `finnhub-${item.id}`,
          time: new Date(timestamp).toLocaleString('fr-FR', { 
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
          }),
          timestamp,
          statement: (item.headline || '').substring(0, 200),
          source: item.source || 'Finnhub',
          sourceUrl: item.url || '#',
          impactLevel: level,
          affectedInstruments: instruments,
          category
        })
      }
    }
    
    return statements.slice(0, 15)
  } catch (e) {
    console.error('Finnhub Trump fetch error:', e)
    return []
  }
}

// Fetch from NewsAPI
async function fetchNewsAPI(): Promise<TrumpStatement[]> {
  const NEWS_API_KEY = process.env.NEWS_API_KEY
  if (!NEWS_API_KEY) return []
  
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=Trump+AND+(tariff+OR+trade+OR+economy+OR+executive+order+OR+sanctions)&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    
    const data = await res.json()
    const statements: TrumpStatement[] = []
    
    for (const article of data.articles || []) {
      if (!article.title || article.title.includes('[Removed]')) continue
      
      const combined = `${article.title} ${article.description || ''}`.toLowerCase()
      const timestamp = new Date(article.publishedAt).getTime()
      const { level, instruments, category } = classifyImpact(combined)
      
      statements.push({
        id: `newsapi-${timestamp}`,
        time: new Date(timestamp).toLocaleString('fr-FR', { 
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
        }),
        timestamp,
        statement: article.title.substring(0, 200),
        source: article.source?.name || 'NewsAPI',
        sourceUrl: article.url || '#',
        impactLevel: level,
        affectedInstruments: instruments,
        category
      })
    }
    
    return statements.slice(0, 15)
  } catch (e) {
    console.error('NewsAPI Trump fetch error:', e)
    return []
  }
}

export async function GET() {
  try {
    // Fetch from all sources in parallel
    const [
      reutersStatements,
      bbcStatements,
      finnhubStatements,
      newsapiStatements
    ] = await Promise.all([
      fetchRSS('https://feeds.reuters.com/reuters/politicsNews', 'Reuters'),
      fetchRSS('https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', 'BBC'),
      fetchFinnhub(),
      fetchNewsAPI()
    ])
    
    // Combine and deduplicate
    const allStatements = [
      ...reutersStatements,
      ...bbcStatements,
      ...finnhubStatements,
      ...newsapiStatements
    ]
    
    // Deduplicate by similar headline
    const seen = new Set<string>()
    const uniqueStatements = allStatements.filter(s => {
      const key = s.statement.toLowerCase().substring(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    
    // Sort by timestamp (newest first)
    uniqueStatements.sort((a, b) => b.timestamp - a.timestamp)
    
    // Calculate risk score
    const highCount = uniqueStatements.filter(s => s.impactLevel === 'HIGH').length
    const medCount = uniqueStatements.filter(s => s.impactLevel === 'MEDIUM').length
    const recentHighImpact = uniqueStatements.filter(s => 
      s.impactLevel === 'HIGH' && s.timestamp > Date.now() - 3600000
    ).length
    
    let riskScore = 20 + (highCount * 15) + (medCount * 5) + (recentHighImpact * 20)
    riskScore = Math.min(100, riskScore)
    
    let riskLevel = 'Risque faible'
    if (riskScore > 60) riskLevel = 'Risque eleve'
    else if (riskScore > 30) riskLevel = 'Risque modere'
    
    // Generate description
    let description = 'Activite normale. Pas de declarations majeures detectees.'
    if (highCount > 0) {
      const topics = [...new Set(uniqueStatements
        .filter(s => s.impactLevel === 'HIGH')
        .map(s => s.category)
      )].slice(0, 3)
      description = `${highCount} declaration(s) a fort impact detectee(s). Sujets: ${topics.join(', ')}. Surveillez la volatilite.`
    } else if (medCount > 0) {
      description = `${medCount} declaration(s) a impact modere. Marches potentiellement affectes.`
    }
    
    const data: TrumpData = {
      riskScore,
      riskLevel,
      description,
      generatedAt: new Date().toLocaleString('fr-FR', { 
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
      }),
      statements: uniqueStatements.slice(0, 20),
      upcomingEvents: [],
      lastUpdate: new Date().toISOString()
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Trump API error:', error)
    
    return NextResponse.json({
      riskScore: 25,
      riskLevel: 'Risque faible',
      description: 'Donnees temporairement indisponibles.',
      generatedAt: new Date().toLocaleString('fr-FR'),
      statements: [],
      upcomingEvents: [],
      lastUpdate: new Date().toISOString()
    })
  }
}
