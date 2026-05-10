import { NextRequest, NextResponse } from 'next/server'
import { newsApiLimiter, checkRateLimit } from '@/lib/rate-limit'

// News API aggregator - fetches from multiple sources
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const NEWS_API_KEY = process.env.NEWS_API_KEY
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY
const POLYGON_API_KEY = process.env.POLYGON_API_KEY
const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY
const GNEWS_API_KEY = process.env.GNEWS_API_KEY
const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY
const WORLD_NEWS_API_KEY = process.env.WORLD_NEWS_API_KEY

interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  datetime: number
  url: string
  category: 'breaking' | 'high-impact' | 'economic' | 'geopolitical' | 'general'
  relatedAssets: { symbol: string; impact: 'up' | 'down' | 'neutral' }[]
  isBreaking: boolean
  importance: number // 1-5 scale
}

// Extended keywords for asset detection
const ASSET_KEYWORDS: Record<string, { keywords: string[]; bullishContext: string[]; bearishContext: string[] }> = {
  'XAU/USD': {
    keywords: ['gold', 'xau', 'precious metal', 'bullion', 'safe-haven', 'safe haven', 'or ', 'lingot', 'gold price', 'gold futures'],
    bullishContext: ['geopolitical', 'tension', 'war', 'crisis', 'uncertainty', 'inflation', 'rate cut', 'weak dollar', 'demand'],
    bearishContext: ['rate hike', 'strong dollar', 'risk-on', 'stock rally', 'yields rise', 'hawkish']
  },
  'XAG/USD': {
    keywords: ['silver', 'xag', 'argent', 'silver price'],
    bullishContext: ['industrial demand', 'solar', 'inflation', 'precious metals rally'],
    bearishContext: ['strong dollar', 'rate hike', 'industrial slowdown']
  },
  'DXY': {
    keywords: ['dollar', 'usd', 'dxy', 'greenback', 'fed ', 'federal reserve', 'fomc', 'powell', 'treasury', 'dollar index', 'us dollar'],
    bullishContext: ['rate hike', 'hawkish', 'strong data', 'risk-off', 'inflation high'],
    bearishContext: ['rate cut', 'dovish', 'weak data', 'risk-on', 'inflation low']
  },
  'US30': {
    keywords: ['dow', 'djia', 'us30', 'industrial average', 'blue chip', 'wall street', 'dow jones'],
    bullishContext: ['earnings beat', 'rate cut', 'stimulus', 'recovery', 'jobs growth'],
    bearishContext: ['recession', 'rate hike', 'tariff', 'trade war', 'earnings miss']
  },
  'US100': {
    keywords: ['nasdaq', 'us100', 'tech stock', 'technology', 'apple', 'microsoft', 'nvidia', 'ai ', 'artificial intelligence', 'tech sector', 'tech rally'],
    bullishContext: ['ai growth', 'earnings beat', 'innovation', 'cloud growth', 'semiconductor'],
    bearishContext: ['regulation', 'antitrust', 'rate hike', 'valuation concern']
  },
  'US500': {
    keywords: ['s&p', 'sp500', 'us500', 's&p 500', 'spx', 's&p500'],
    bullishContext: ['earnings growth', 'economic growth', 'rate cut', 'consumer spending'],
    bearishContext: ['recession fear', 'rate hike', 'inflation', 'geopolitical risk']
  },
  'WTI': {
    keywords: ['oil', 'crude', 'wti', 'brent', 'opec', 'petrole', 'petroleum', 'energy', 'crude oil', 'oil price', 'barrel'],
    bullishContext: ['opec cut', 'supply disruption', 'demand growth', 'iran', 'hormuz', 'middle east', 'geopolitical', 'sanctions'],
    bearishContext: ['opec increase', 'oversupply', 'demand weak', 'recession', 'inventory build']
  },
  'BRENT': {
    keywords: ['brent', 'north sea', 'brent crude'],
    bullishContext: ['opec cut', 'supply disruption', 'middle east'],
    bearishContext: ['oversupply', 'demand weak']
  },
  'NGAS': {
    keywords: ['natural gas', 'lng', 'gas prices', 'gaz naturel', 'nat gas', 'henry hub'],
    bullishContext: ['cold weather', 'supply disruption', 'export demand', 'winter'],
    bearishContext: ['warm weather', 'oversupply', 'storage build']
  },
  'EUR/USD': {
    keywords: ['euro', 'eur/usd', 'ecb', 'lagarde', 'eurozone', 'europe', 'european central', 'eurusd'],
    bullishContext: ['ecb hawkish', 'strong data', 'german growth', 'euro strength'],
    bearishContext: ['ecb dovish', 'weak data', 'energy crisis', 'recession']
  },
  'GBP/USD': {
    keywords: ['pound', 'sterling', 'gbp', 'bank of england', 'boe', 'uk ', 'britain', 'brexit', 'cable'],
    bullishContext: ['boe hawkish', 'inflation high', 'strong data'],
    bearishContext: ['boe dovish', 'political crisis', 'recession', 'brexit']
  },
  'USD/JPY': {
    keywords: ['yen', 'jpy', 'boj', 'bank of japan', 'japan', 'ueda', 'kuroda', 'usdjpy'],
    bullishContext: ['boj dovish', 'yield gap', 'fed hawkish', 'carry trade'],
    bearishContext: ['boj intervention', 'boj hawkish', 'risk-off', 'yen strength']
  },
  'AUD/USD': {
    keywords: ['aussie', 'aud', 'australia', 'rba', 'reserve bank australia', 'audusd'],
    bullishContext: ['rba hawkish', 'china demand', 'commodity rally', 'iron ore'],
    bearishContext: ['rba dovish', 'china slowdown', 'commodity weakness']
  },
  'USD/CAD': {
    keywords: ['loonie', 'cad', 'canada', 'boc', 'bank of canada', 'usdcad'],
    bullishContext: ['boc dovish', 'oil drop', 'fed hawkish'],
    bearishContext: ['boc hawkish', 'oil rally', 'fed dovish']
  },
  'NZD/USD': {
    keywords: ['kiwi', 'nzd', 'new zealand', 'rbnz', 'nzdusd'],
    bullishContext: ['rbnz hawkish', 'dairy prices', 'china demand'],
    bearishContext: ['rbnz dovish', 'china slowdown']
  },
  'USD/CHF': {
    keywords: ['swissie', 'chf', 'swiss', 'snb', 'switzerland', 'usdchf'],
    bullishContext: ['risk-on', 'snb dovish'],
    bearishContext: ['risk-off', 'safe haven', 'snb hawkish']
  },
  'BTC/USD': {
    keywords: ['bitcoin', 'btc', 'crypto', 'cryptocurrency', 'satoshi', 'btcusd'],
    bullishContext: ['etf approval', 'institutional', 'adoption', 'halving', 'spot etf'],
    bearishContext: ['regulation', 'sec', 'ban', 'hack', 'exchange collapse']
  },
  'ETH/USD': {
    keywords: ['ethereum', 'eth', 'ether', 'ethusd', 'defi'],
    bullishContext: ['upgrade', 'adoption', 'defi growth', 'etf'],
    bearishContext: ['regulation', 'sec', 'network issue']
  },
  'VIX': {
    keywords: ['vix', 'volatility', 'fear index', 'cboe', 'volatility index'],
    bullishContext: ['uncertainty', 'crisis', 'sell-off', 'panic', 'geopolitical'],
    bearishContext: ['calm', 'rally', 'stability', 'low volatility']
  },
  'GER40': {
    keywords: ['dax', 'germany', 'german', 'ger40', 'allemagne', 'deutsche'],
    bullishContext: ['manufacturing growth', 'export', 'stimulus'],
    bearishContext: ['recession', 'energy crisis', 'china slowdown']
  },
  'UK100': {
    keywords: ['ftse', 'uk100', 'london stock', 'ftse 100'],
    bullishContext: ['commodity rally', 'weak pound', 'dividend'],
    bearishContext: ['brexit', 'recession', 'political crisis']
  },
  'JPN225': {
    keywords: ['nikkei', 'japan stock', 'jpn225', 'tokyo', 'topix'],
    bullishContext: ['weak yen', 'export growth', 'boj dovish'],
    bearishContext: ['strong yen', 'boj hawkish', 'global risk-off']
  }
}

// Geopolitical keywords that affect markets
const GEOPOLITICAL_KEYWORDS = [
  'trump', 'biden', 'harris', 'putin', 'xi jinping', 'zelensky',
  'war', 'military', 'attack', 'strike', 'missile', 'bomb', 'invasion', 'troops',
  'sanctions', 'embargo', 'tariff', 'trade war', 'trade deal',
  'iran', 'israel', 'gaza', 'ukraine', 'russia', 'china', 'taiwan', 'north korea',
  'hormuz', 'suez', 'red sea', 'houthi', 'hezbollah', 'hamas',
  'nuclear', 'nato', 'g7', 'g20', 'summit', 'treaty',
  'election', 'vote', 'referendum', 'coup', 'protest', 'riot'
]

// Central bank and economic keywords
const ECONOMIC_KEYWORDS = [
  'fed ', 'fomc', 'ecb', 'boj', 'boe', 'rba', 'boc', 'snb', 'rbnz', 'pboc',
  'rate decision', 'rate hike', 'rate cut', 'interest rate', 'monetary policy',
  'inflation', 'cpi', 'ppi', 'pce', 'deflation',
  'nfp', 'non-farm', 'employment', 'unemployment', 'jobless', 'jobs report',
  'gdp', 'growth', 'recession', 'expansion', 'contraction',
  'pmi', 'ism', 'manufacturing', 'services',
  'retail sales', 'consumer', 'spending', 'confidence',
  'housing', 'home sales', 'mortgage',
  'trade balance', 'current account', 'deficit', 'surplus',
  'quantitative', 'stimulus', 'bailout', 'intervention'
]

const BREAKING_KEYWORDS = ['breaking', 'alert', 'flash', 'urgent', 'just in', 'developing', 'live:', 'now:', 'update:', 'exclusive', 'just now']

function detectCategory(headline: string, summary: string): NewsItem['category'] {
  const text = `${headline} ${summary}`.toLowerCase()
  
  if (BREAKING_KEYWORDS.some(kw => text.includes(kw))) return 'breaking'
  if (GEOPOLITICAL_KEYWORDS.some(kw => text.includes(kw))) return 'geopolitical'
  if (ECONOMIC_KEYWORDS.some(kw => text.includes(kw))) return 'high-impact'
  if (text.includes('economic') || text.includes('data') || text.includes('report')) return 'economic'
  return 'general'
}

function detectRelatedAssets(headline: string, summary: string): NewsItem['relatedAssets'] {
  const text = `${headline} ${summary}`.toLowerCase()
  const assets: NewsItem['relatedAssets'] = []

  for (const [symbol, config] of Object.entries(ASSET_KEYWORDS)) {
    if (config.keywords.some(kw => text.includes(kw))) {
      // Smart sentiment detection based on context
      let impact: 'up' | 'down' | 'neutral' = 'neutral'
      
      const hasBullishContext = config.bullishContext.some(w => text.includes(w))
      const hasBearishContext = config.bearishContext.some(w => text.includes(w))
      
      // General sentiment words
      const positiveWords = ['surge', 'rally', 'gain', 'rise', 'jump', 'soar', 'bullish', 'strong', 'support', 'boost', 'up ', 'higher', 'advance', 'climb', 'record high']
      const negativeWords = ['fall', 'drop', 'decline', 'plunge', 'sink', 'bearish', 'weak', 'pressure', 'concern', 'down ', 'lower', 'tumble', 'crash', 'collapse', 'record low']
      
      const hasPositive = positiveWords.some(w => text.includes(w))
      const hasNegative = negativeWords.some(w => text.includes(w))
      
      if (hasBullishContext || hasPositive) impact = 'up'
      else if (hasBearishContext || hasNegative) impact = 'down'
      
      assets.push({ symbol, impact })
    }
  }

  // Special case: Geopolitical tension affects multiple assets
  if (GEOPOLITICAL_KEYWORDS.some(kw => text.includes(kw))) {
    // Add safe havens if not already present
    if (!assets.find(a => a.symbol === 'XAU/USD')) {
      assets.push({ symbol: 'XAU/USD', impact: 'up' })
    }
    if (!assets.find(a => a.symbol === 'VIX')) {
      assets.push({ symbol: 'VIX', impact: 'up' })
    }
    // Oil on Middle East news
    if (text.includes('iran') || text.includes('hormuz') || text.includes('middle east') || text.includes('opec') || text.includes('saudi')) {
      if (!assets.find(a => a.symbol === 'WTI')) {
        assets.push({ symbol: 'WTI', impact: 'up' })
      }
    }
    // Risk-off: stocks down
    if (!assets.find(a => a.symbol === 'US500')) {
      assets.push({ symbol: 'US500', impact: 'down' })
    }
  }

  return assets
}

function calculateImportance(headline: string, summary: string, relatedAssets: NewsItem['relatedAssets']): number {
  const text = `${headline} ${summary}`.toLowerCase()
  let score = 1

  if (BREAKING_KEYWORDS.some(kw => text.includes(kw))) score += 2
  if (GEOPOLITICAL_KEYWORDS.some(kw => text.includes(kw))) score += 1
  if (ECONOMIC_KEYWORDS.some(kw => text.includes(kw))) score += 1
  if (relatedAssets.length > 3) score += 1
  
  return Math.min(score, 5)
}

// Source 1: Finnhub General News
async function fetchFinnhubGeneral(): Promise<NewsItem[]> {
  if (!FINNHUB_API_KEY) return []
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    
    return data.slice(0, 25).map((item: any) => {
      const category = detectCategory(item.headline || '', item.summary || '')
      const relatedAssets = detectRelatedAssets(item.headline || '', item.summary || '')
      return {
        id: `finnhub-${item.id}`,
        headline: item.headline || 'No headline',
        summary: item.summary || '',
        source: item.source || 'Finnhub',
        datetime: item.datetime * 1000,
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: category === 'breaking',
        importance: calculateImportance(item.headline || '', item.summary || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 2: Finnhub Forex News
async function fetchFinnhubForex(): Promise<NewsItem[]> {
  if (!FINNHUB_API_KEY) return []
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=forex&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    
    return data.slice(0, 15).map((item: any) => {
      const category = detectCategory(item.headline || '', item.summary || '')
      const relatedAssets = detectRelatedAssets(item.headline || '', item.summary || '')
      return {
        id: `finnhub-fx-${item.id}`,
        headline: item.headline || 'No headline',
        summary: item.summary || '',
        source: item.source || 'Finnhub Forex',
        datetime: item.datetime * 1000,
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: category === 'breaking',
        importance: calculateImportance(item.headline || '', item.summary || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 3: Finnhub Crypto News
async function fetchFinnhubCrypto(): Promise<NewsItem[]> {
  if (!FINNHUB_API_KEY) return []
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=crypto&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    
    return data.slice(0, 10).map((item: any) => {
      const category = detectCategory(item.headline || '', item.summary || '')
      const relatedAssets = detectRelatedAssets(item.headline || '', item.summary || '')
      return {
        id: `finnhub-crypto-${item.id}`,
        headline: item.headline || 'No headline',
        summary: item.summary || '',
        source: item.source || 'Finnhub Crypto',
        datetime: item.datetime * 1000,
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: category === 'breaking',
        importance: calculateImportance(item.headline || '', item.summary || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 4: Finnhub Merger News
async function fetchFinnhubMerger(): Promise<NewsItem[]> {
  if (!FINNHUB_API_KEY) return []
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=merger&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    
    return data.slice(0, 10).map((item: any) => {
      const category = detectCategory(item.headline || '', item.summary || '')
      const relatedAssets = detectRelatedAssets(item.headline || '', item.summary || '')
      return {
        id: `finnhub-merger-${item.id}`,
        headline: item.headline || 'No headline',
        summary: item.summary || '',
        source: item.source || 'Finnhub M&A',
        datetime: item.datetime * 1000,
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: category === 'breaking',
        importance: calculateImportance(item.headline || '', item.summary || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 5: NewsAPI - Top Business Headlines (newsapi.org - 100 req/day free)
async function fetchNewsAPIHeadlines(): Promise<NewsItem[]> {
  if (!NEWS_API_KEY) return []
  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) {
      console.log(`[News API] NewsAPI Headlines error: ${res.status}`)
      return []
    }
    const data = await res.json()
    if (!data.articles) return []

    return data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .map((item: any, index: number) => {
        const category = detectCategory(item.title || '', item.description || '')
        const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
        return {
          id: `newsapi-hl-${index}-${Date.now()}`,
          headline: item.title,
          summary: item.description || '',
          source: item.source?.name || 'NewsAPI',
          datetime: new Date(item.publishedAt).getTime(),
          url: item.url || '#',
          category,
          relatedAssets,
          isBreaking: BREAKING_KEYWORDS.some(kw => item.title.toLowerCase().includes(kw)),
          importance: calculateImportance(item.title, item.description || '', relatedAssets)
        }
      })
  } catch { return [] }
}

// Source 6: NewsAPI - Everything Finance & Markets
async function fetchNewsAPIFinance(): Promise<NewsItem[]> {
  if (!NEWS_API_KEY) return []
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=forex+OR+"stock market"+OR+"federal reserve"+OR+"interest rate"+OR+gold+OR+oil+OR+bitcoin&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.articles) return []

    return data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .map((item: any, index: number) => {
        const category = detectCategory(item.title || '', item.description || '')
        const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
        return {
          id: `newsapi-fin-${index}-${Date.now()}`,
          headline: item.title,
          summary: item.description || '',
          source: item.source?.name || 'NewsAPI',
          datetime: new Date(item.publishedAt).getTime(),
          url: item.url || '#',
          category,
          relatedAssets,
          isBreaking: BREAKING_KEYWORDS.some(kw => item.title.toLowerCase().includes(kw)),
          importance: calculateImportance(item.title, item.description || '', relatedAssets)
        }
      })
  } catch { return [] }
}

// Source 7: NewsAPI - Geopolitics & Breaking World News
async function fetchNewsAPIGeopolitics(): Promise<NewsItem[]> {
  if (!NEWS_API_KEY) return []
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=Iran+OR+Russia+OR+China+OR+war+OR+sanctions+OR+tariff+OR+OPEC+OR+ceasefire&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`,
      { next: { revalidate: 120 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.articles) return []

    return data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .map((item: any, index: number) => {
        const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
        return {
          id: `newsapi-geo-${index}-${Date.now()}`,
          headline: item.title,
          summary: item.description || '',
          source: item.source?.name || 'NewsAPI',
          datetime: new Date(item.publishedAt).getTime(),
          url: item.url || '#',
          category: 'geopolitical' as const,
          relatedAssets,
          isBreaking: BREAKING_KEYWORDS.some(kw => item.title.toLowerCase().includes(kw)),
          importance: Math.min(5, calculateImportance(item.title, item.description || '', relatedAssets) + 1)
        }
      })
  } catch { return [] }
}

// Source 8: Alpha Vantage News Sentiment
async function fetchAlphaVantageNews(): Promise<NewsItem[]> {
  if (!ALPHA_VANTAGE_KEY) return []
  
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=FOREX:EUR,FOREX:GBP,CRYPTO:BTC,COMMODITY:GOLD&apikey=${ALPHA_VANTAGE_KEY}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.feed) return []
    
    return data.feed.slice(0, 15).map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.summary || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.summary || '')
      
      // Alpha Vantage provides sentiment scores
      if (item.ticker_sentiment) {
        item.ticker_sentiment.forEach((ts: any) => {
          const score = parseFloat(ts.ticker_sentiment_score) || 0
          const symbol = ts.ticker.replace('FOREX:', '').replace('CRYPTO:', '') + '/USD'
          if (!relatedAssets.find(a => a.symbol === symbol)) {
            relatedAssets.push({
              symbol,
              impact: score > 0.2 ? 'up' : score < -0.2 ? 'down' : 'neutral'
            })
          }
        })
      }
      
      return {
        id: `alphav-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.summary || '',
        source: item.source || 'Alpha Vantage',
        datetime: new Date(item.time_published?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).getTime() || Date.now(),
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: false,
        importance: calculateImportance(item.title || '', item.summary || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 9: Polygon.io News
async function fetchPolygonNews(): Promise<NewsItem[]> {
  if (!POLYGON_API_KEY) return []
  
  try {
    const res = await fetch(
      `https://api.polygon.io/v2/reference/news?limit=20&apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.results) return []
    
    return data.results.map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.description || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
      
      // Polygon provides tickers
      if (item.tickers) {
        item.tickers.forEach((ticker: string) => {
          if (!relatedAssets.find(a => a.symbol === ticker)) {
            relatedAssets.push({ symbol: ticker, impact: 'neutral' })
          }
        })
      }
      
      return {
        id: `polygon-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.description || '',
        source: item.publisher?.name || 'Polygon',
        datetime: new Date(item.published_utc).getTime(),
        url: item.article_url || '#',
        category,
        relatedAssets,
        isBreaking: false,
        importance: calculateImportance(item.title || '', item.description || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 10: Marketaux News - DISABLED (401 auth error)
async function fetchMarketauxNews(): Promise<NewsItem[]> {
  return []
}

// Source 11: NewsData.io - DISABLED (429 rate limit exceeded)
async function fetchNewsDataBusiness(): Promise<NewsItem[]> {
  return []
}

// Source 12: NewsData.io - DISABLED (429 rate limit exceeded)
async function fetchNewsDataWorld(): Promise<NewsItem[]> {
  return []
}

// Source 13: GNews API - Breaking News & Geopolitics (FREE - 100 req/day)
async function fetchGNewsWorld(): Promise<NewsItem[]> {
  const key = process.env.GNEWS_API_KEY // Always read fresh from env
  if (!key) return []
  console.log(`[News API] GNews World - fetching with key: ${key.slice(0, 8)}...`)
  
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/top-headlines?category=world&lang=en&max=15&apikey=${key}`,
      { cache: 'no-store' } // Force fresh - env var may have changed
    )
    if (!res.ok) {
      console.log(`[News API] GNews World error: ${res.status}`)
      return []
    }
    const data = await res.json()
    if (!data.articles) return []
    
    return data.articles.map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.description || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
      
      return {
        id: `gnews-world-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.description || '',
        source: item.source?.name || 'GNews',
        datetime: new Date(item.publishedAt).getTime(),
        url: item.url || '#',
        category: GEOPOLITICAL_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw)) ? 'geopolitical' : category,
        relatedAssets,
        isBreaking: BREAKING_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw)),
        importance: calculateImportance(item.title || '', item.description || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 14: GNews API - Business & Markets
async function fetchGNewsBusiness(): Promise<NewsItem[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key) return []
  
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/top-headlines?category=business&lang=en&max=15&apikey=${key}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.articles) return []
    
    return data.articles.map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.description || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
      
      return {
        id: `gnews-biz-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.description || '',
        source: item.source?.name || 'GNews',
        datetime: new Date(item.publishedAt).getTime(),
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: BREAKING_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw)),
        importance: calculateImportance(item.title || '', item.description || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 15: Currents API - Breaking News (FREE - 600 req/day)
async function fetchCurrentsNews(): Promise<NewsItem[]> {
  const key = process.env.CURRENTS_API_KEY
  if (!key) return []
  
  try {
    const res = await fetch(
      `https://api.currentsapi.services/v1/latest-news?apikey=${key}&language=en&category=business`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.news) return []
    
    return data.news.slice(0, 15).map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.description || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
      
      return {
        id: `currents-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.description || '',
        source: item.source || 'Currents',
        datetime: new Date(item.published).getTime(),
        url: item.url || '#',
        category,
        relatedAssets,
        isBreaking: BREAKING_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw)),
        importance: calculateImportance(item.title || '', item.description || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 16: World News API - Breaking Global News (FREE - 500 req/day)
async function fetchWorldNewsAPI(): Promise<NewsItem[]> {
  const key = process.env.WORLD_NEWS_API_KEY
  if (!key) return []
  
  try {
    const res = await fetch(
      `https://api.worldnewsapi.com/search-news?api_key=${key}&text=financial&number=15&language=en`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.news) return []
    
    return data.news.slice(0, 15).map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.text || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.text || '')
      const isGeo = GEOPOLITICAL_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw))
      
      return {
        id: `worldnews-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.text || '',
        source: item.source_country?.join(', ') || 'World News',
        datetime: new Date(item.publish_date).getTime(),
        url: item.url || '#',
        category: isGeo ? 'geopolitical' : category,
        relatedAssets,
        isBreaking: BREAKING_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw)),
        importance: calculateImportance(item.title || '', item.text || '', relatedAssets)
      }
    })
  } catch { return [] }
}

// Source 17: GNews API - Geopolitical & World Events
async function fetchGNewsGeopolitical(): Promise<NewsItem[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key) return []
  
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=Iran OR Russia OR "oil price" OR gold OR Trump OR tariff&lang=en&max=10&sortby=publishedAt&apikey=${key}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.articles) return []
    
    return data.articles.map((item: any, index: number) => {
      const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
      
      return {
        id: `gnews-geo-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: item.description || '',
        source: item.source?.name || 'GNews',
        datetime: new Date(item.publishedAt).getTime(),
        url: item.url || '#',
        category: 'geopolitical' as const,
        relatedAssets,
        isBreaking: BREAKING_KEYWORDS.some(kw => (item.title || '').toLowerCase().includes(kw)),
        importance: Math.min(5, calculateImportance(item.title || '', item.description || '', relatedAssets) + 1)
      }
    })
  } catch { return [] }
}

// RSS Feed parser for additional sources
async function fetchRSSFeed(feedUrl: string, sourceName: string): Promise<NewsItem[]> {
  try {
    // Using a CORS proxy for RSS feeds
    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      { next: { revalidate: 120 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.status !== 'ok' || !data.items) return []
    
    return data.items.slice(0, 10).map((item: any, index: number) => {
      const category = detectCategory(item.title || '', item.description || '')
      const relatedAssets = detectRelatedAssets(item.title || '', item.description || '')
      
      return {
        id: `rss-${sourceName}-${index}-${Date.now()}`,
        headline: item.title || 'No headline',
        summary: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
        source: sourceName,
        datetime: new Date(item.pubDate).getTime(),
        url: item.link || '#',
        category,
        relatedAssets,
        isBreaking: category === 'breaking',
        importance: calculateImportance(item.title || '', item.description || '', relatedAssets)
      }
    })
  } catch { return [] }
}

export async function GET(request: NextRequest) {
  // Rate limiting - 30 requetes/min par utilisateur
  const rateLimitCheck = await checkRateLimit(request, newsApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }

  const { searchParams } = new URL(request.url)
  const filterSymbol = searchParams.get('symbol') || null
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  
  // Fetch from ALL sources in parallel
  const [
    finnhubGeneral,
    finnhubForex,
    finnhubCrypto,
    finnhubMerger,
    newsApiHeadlines,
    newsApiFinance,
    newsApiGeopolitics,
    alphaVantage,
    polygon,
    marketaux,
    newsDataBusiness,
    newsDataWorld,
    gnewsWorld,
    gnewsBusiness,
    gnewsGeopolitical,
    currentsNews,
    worldNews,
    // RSS Feeds - Gratuites, pas de cle necessaire
    rssInvesting,
    rssForexLive,
    rssCNBC,
    rssBloomberg,
    rssMarketWatch,
    rssCointelegraph,
    rssZeroHedge,
    rssFXStreet,
    rssReuters,
    rssFinancialTimes,
    rssYahooFinance,
    rssTheStreet,
    rssTradingEconomics
  ] = await Promise.all([
    fetchFinnhubGeneral(),
    fetchFinnhubForex(),
    fetchFinnhubCrypto(),
    fetchFinnhubMerger(),
    fetchNewsAPIHeadlines(),
    fetchNewsAPIFinance(),
    fetchNewsAPIGeopolitics(),
    fetchAlphaVantageNews(),
    fetchPolygonNews(),
    fetchMarketauxNews(),
    fetchNewsDataBusiness(),
    fetchNewsDataWorld(),
    fetchGNewsWorld(),
    fetchGNewsBusiness(),
    fetchGNewsGeopolitical(),
    fetchCurrentsNews(),
    fetchWorldNewsAPI(),
    // RSS Feeds - Gratuites
    fetchRSSFeed('https://www.investing.com/rss/news.rss', 'Investing.com'),
    fetchRSSFeed('https://www.forexlive.com/feed/news', 'ForexLive'),
    fetchRSSFeed('https://www.cnbc.com/id/100003114/device/rss/rss.html', 'CNBC'),
    fetchRSSFeed('https://feeds.bloomberg.com/markets/news.rss', 'Bloomberg'),
    fetchRSSFeed('https://feeds.content.dowjones.io/public/rss/mw_topstories', 'MarketWatch'),
    fetchRSSFeed('https://cointelegraph.com/rss', 'Cointelegraph'),
    fetchRSSFeed('https://feeds.feedburner.com/zerohedge/feed', 'ZeroHedge'),
    fetchRSSFeed('https://www.fxstreet.com/rss/news', 'FXStreet'),
    fetchRSSFeed('https://feeds.reuters.com/finance/markets', 'Reuters'),
    fetchRSSFeed('https://feeds.ft.com/markets', 'Financial Times'),
    fetchRSSFeed('https://feeds.finance.yahoo.com/rss/markets.rss', 'Yahoo Finance'),
    fetchRSSFeed('https://www.thestreet.com/.rss/full/', 'TheStreet'),
    fetchRSSFeed('https://tradingeconomics.com/feeds/updates.rss', 'Trading Economics')
  ])

  // Combine all sources
  const allNews = [
    ...finnhubGeneral,
    ...finnhubForex,
    ...finnhubCrypto,
    ...finnhubMerger,
    ...newsApiHeadlines,
    ...newsApiFinance,
    ...newsApiGeopolitics,
    ...alphaVantage,
    ...polygon,
    ...marketaux,
    ...newsDataBusiness,
    ...newsDataWorld,
    ...gnewsWorld,
    ...gnewsBusiness,
    ...gnewsGeopolitical,
    ...currentsNews,
    ...worldNews,
    // RSS Feeds
    ...rssInvesting,
    ...rssForexLive,
    ...rssCNBC,
    ...rssBloomberg,
    ...rssMarketWatch,
    ...rssCointelegraph,
    ...rssZeroHedge,
    ...rssFXStreet,
    ...rssReuters,
    ...rssFinancialTimes,
    ...rssYahooFinance,
    ...rssTheStreet,
    ...rssTradingEconomics
  ]

  // Remove duplicates based on similar headlines
  const seen = new Set<string>()
  const uniqueNews = allNews.filter(item => {
    const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by importance then by datetime
  uniqueNews.sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    return b.datetime - a.datetime
  })

  // Get breaking/high-impact news first
  const breakingNews = uniqueNews.filter(n => n.isBreaking || n.category === 'geopolitical' || n.importance >= 4)
  const regularNews = uniqueNews.filter(n => !n.isBreaking && n.category !== 'geopolitical' && n.importance < 4)
  
  const finalNews = [...breakingNews, ...regularNews].slice(0, 100)

  // Calculate source statistics
  const rssTotal = rssInvesting.length + rssForexLive.length + rssCNBC.length + 
                   rssBloomberg.length + rssMarketWatch.length + rssCointelegraph.length + 
                   rssZeroHedge.length + rssFXStreet.length + rssReuters.length + 
                   rssFinancialTimes.length + rssYahooFinance.length + rssTheStreet.length + 
                   rssTradingEconomics.length
  
  const sourceStats = {
    finnhub: finnhubGeneral.length + finnhubForex.length + finnhubCrypto.length + finnhubMerger.length,
    newsapi: newsApiHeadlines.length + newsApiFinance.length + newsApiGeopolitics.length,
    alphavantage: alphaVantage.length,
    polygon: polygon.length,
    marketaux: marketaux.length,
    newsdata: newsDataBusiness.length + newsDataWorld.length,
    gnews: gnewsWorld.length + gnewsBusiness.length + gnewsGeopolitical.length,
    rss: rssTotal
  }

  console.log(`[News API] Sources breakdown:`, {
    ...sourceStats,
    rssDetail: {
      investing: rssInvesting.length,
      forexlive: rssForexLive.length,
      cnbc: rssCNBC.length,
      bloomberg: rssBloomberg.length,
      marketwatch: rssMarketWatch.length,
      cointelegraph: rssCointelegraph.length,
      zerohedge: rssZeroHedge.length,
      fxstreet: rssFXStreet.length,
    },
    total: allNews.length,
    afterDedup: uniqueNews.length,
    final: finalNews.length
  })

  // If a symbol filter is provided, return only news relevant to that symbol
  if (filterSymbol) {
    const symbolNews = finalNews.filter(item =>
      item.relatedAssets?.some(a => a.symbol === filterSymbol)
    ).slice(0, limit)

    return NextResponse.json({
      items: symbolNews,
      symbol: filterSymbol,
      total: symbolNews.length,
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({
    news: finalNews,
    breaking: breakingNews.slice(0, 5),
    totalSources: Object.values(sourceStats).reduce((a, b) => a + b, 0),
    sourceStats,
    timestamp: new Date().toISOString()
  })
}

