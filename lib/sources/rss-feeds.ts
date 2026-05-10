// Agregateur RSS gratuit — Reuters, CNBC, Investing.com
// Aucune cle API requise

import { TIMEOUTS } from '@/lib/ai/config'

export interface RSSItem {
  title: string
  description: string
  link: string
  pubDate: string
  source: string
}

const RSS_SOURCES = [
  {
    name: 'Reuters Markets',
    url: 'https://feeds.reuters.com/reuters/businessNews',
  },
  {
    name: 'CNBC Markets',
    url: 'https://www.cnbc.com/id/15839069/device/rss/rss.html',
  },
  {
    name: 'Investing.com',
    url: 'https://www.investing.com/rss/news.rss',
  },
  {
    name: 'MarketWatch',
    url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
  },
]

// Parse XML RSS simplement (sans librairie externe)
function parseRSSXML(xml: string, source: string): RSSItem[] {
  const items: RSSItem[] = []

  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)

  for (const match of itemMatches) {
    const content = match[1]

    const getTag = (tag: string): string => {
      const m = content.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
        || content.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))
      return m?.[1]?.trim() ?? ''
    }

    const title = getTag('title')
    if (!title) continue

    items.push({
      title,
      description: getTag('description').slice(0, 300),
      link: getTag('link'),
      pubDate: getTag('pubDate'),
      source,
    })
  }

  return items.slice(0, 10)
}

async function fetchRSSFeed(url: string, sourceName: string): Promise<RSSItem[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; OrvynDesk/1.0)',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return []

    const text = await res.text()
    return parseRSSXML(text, sourceName)
  } catch {
    return []
  }
}

// Score de pertinence d'un titre par rapport a un symbole
const KEYWORD_MAP: Record<string, string[]> = {
  'XAU/USD': ['gold', 'xau', 'bullion', 'precious metal', 'aurum'],
  'XAUUSD':  ['gold', 'xau', 'bullion', 'precious metal', 'aurum'],
  'XAG/USD': ['silver', 'xag', 'precious metal'],
  'WTI':     ['oil', 'crude', 'wti', 'opec', 'barrel', 'petroleum'],
  'DXY':     ['dollar', 'dxy', 'greenback', 'usd', 'federal reserve', 'fed'],
  'US500':   ['s&p', 'sp500', 'stocks', 'equities', 'nasdaq', 'dow'],
  'US100':   ['nasdaq', 'tech stocks', 'qqqq', 'us100'],
  'USDJPY':  ['yen', 'jpyjpy', 'usdjpy', 'bank of japan', 'boj'],
  'EUR/USD': ['euro', 'eur', 'ecb', 'eurozone'],
  'BTC/USD': ['bitcoin', 'btc', 'crypto', 'digital asset'],
}

const GLOBAL_KEYWORDS = [
  'fed', 'federal reserve', 'inflation', 'rate', 'interest',
  'tariff', 'trade', 'trump', 'china', 'geopolitical', 'war',
  'recession', 'growth', 'gdp', 'jobs', 'employment',
]

function scoreRelevance(item: RSSItem, symbol: string): number {
  const text = (item.title + ' ' + item.description).toLowerCase()
  let score = 0

  const keywords = KEYWORD_MAP[symbol] || []
  for (const kw of keywords) {
    if (text.includes(kw)) score += 3
  }

  for (const kw of GLOBAL_KEYWORDS) {
    if (text.includes(kw)) score += 1
  }

  return score
}

export interface AggregatedNews {
  items: (RSSItem & { relevanceScore: number })[]
  sourcesAvailable: string[]
  sourcesFailed: string[]
  totalFetched: number
}

// Agregation de toutes les sources RSS
export async function fetchAllRSSFeeds(symbol: string): Promise<AggregatedNews> {
  const results = await Promise.all(
    RSS_SOURCES.map(src =>
      fetchRSSFeed(src.url, src.name).then(items => ({ name: src.name, items, ok: true }))
        .catch(() => ({ name: src.name, items: [] as RSSItem[], ok: false }))
    )
  )

  const sourcesAvailable: string[] = []
  const sourcesFailed: string[] = []
  const allItems: (RSSItem & { relevanceScore: number })[] = []

  for (const { name, items, ok } of results) {
    if (ok && items.length > 0) {
      sourcesAvailable.push(name)
      for (const item of items) {
        allItems.push({ ...item, relevanceScore: scoreRelevance(item, symbol) })
      }
    } else {
      sourcesFailed.push(name)
    }
  }

  // Trier par score de pertinence puis par date
  allItems.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return {
    items: allItems.slice(0, 20),
    sourcesAvailable,
    sourcesFailed,
    totalFetched: allItems.length,
  }
}
