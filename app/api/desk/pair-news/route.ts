import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Upstash Redis for caching news
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

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
  importance: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pairId = searchParams.get('pair')

    if (!pairId) {
      return NextResponse.json({ error: 'Missing pair parameter' }, { status: 400 })
    }

    // Try cache first
    const cacheKey = `pair_news:${pairId}`
    try {
      const cached = await redis.get<NewsItem[]>(cacheKey)
      if (cached && cached.length > 0) {
        return NextResponse.json({ news: cached, source: 'cache' })
      }
    } catch {
      // Cache miss, fetch fresh
    }

    // Fetch news directly from Finnhub (production-safe)
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY
    if (!FINNHUB_KEY) {
      return NextResponse.json({ news: [], error: 'News API not configured' }, { status: 200 })
    }
    
    const newsRes = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`, {
      next: { revalidate: 60 }
    })
    
    if (!newsRes.ok) {
      return NextResponse.json({ news: [], error: 'Failed to fetch news' }, { status: 200 })
    }

    const rawNews = await newsRes.json()
    const articles = (rawNews || []).map((n: any) => ({
      id: n.id?.toString() || `fh-${n.datetime}`,
      headline: n.headline || n.title || '',
      summary: n.summary || '',
      source: n.source || 'Finnhub',
      datetime: (n.datetime || 0) * 1000,
      importance: 5,
      relatedAssets: [{ symbol: pairId }]
    }))
    
    if (!articles || !Array.isArray(articles)) {
      return NextResponse.json({ news: [] }, { status: 200 })
    }

    // Filter news for this pair - match against related assets
    const pairNews = articles.filter((news: NewsItem) => 
      news.relatedAssets.some(asset => asset.symbol === pairId)
    )

    // Sort by importance and date
    const sortedNews = pairNews.sort((a: NewsItem, b: NewsItem) => {
      const importanceDiff = b.importance - a.importance
      if (importanceDiff !== 0) return importanceDiff
      return b.datetime - a.datetime
    })

    // Return top 10 most relevant
    const topNews = sortedNews.slice(0, 10)

    // Cache result (5 minutes)
    try {
      await redis.set(cacheKey, topNews, { ex: 300 })
    } catch {
      // Cache write failed, continue
    }

    return NextResponse.json({ 
      news: topNews,
      pairId,
      count: topNews.length,
      source: 'fresh'
    })
  } catch (error) {
    console.error('[PairNews] Error:', error)
    return NextResponse.json({ news: [], error: 'Internal error' }, { status: 500 })
  }
}
