import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { filterGoldNews, deduplicateNews } from '@/lib/engines/newsFilter'
import { fetchFinnhubNews } from '@/lib/api/finnhub'
import { CACHE_TTL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

async function fetchRSSNews(url: string, source: string): Promise<any[]> {
  try {
    const response = await fetch(url, { next: { revalidate: 300 } })
    if (!response.ok) return []
    const text = await response.text()

    const items: any[] = []
    const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const match of itemMatches) {
      const content = match[1]
      const title = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? content.match(/<title>(.*?)<\/title>/)?.[1]
        ?? ''
      const description = content.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        ?? content.match(/<description>(.*?)<\/description>/)?.[1]
        ?? ''
      const link = content.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''

      if (title) {
        items.push({
          title: title.trim(),
          description: description.replace(/<[^>]*>/g, '').trim().substring(0, 300),
          url: link.trim(),
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source,
        })
      }
    }

    return items
  } catch (error) {
    console.error(`[RSS] ${source} error:`, error)
    return []
  }
}

export async function GET() {
  try {
    const cacheKey = 'gold_news'
    const cached = await redis.get(cacheKey)

    if (cached) {
      return NextResponse.json(cached)
    }

    const [finnhub, kitco, forexlive, zerohedge] = await Promise.all([
      fetchFinnhubNews(),
      fetchRSSNews('https://www.kitco.com/rss/kitco-news.rss', 'Kitco'),
      fetchRSSNews('https://www.forexlive.com/feed/news', 'ForexLive'),
      fetchRSSNews('https://feeds.feedburner.com/zerohedge/feed', 'ZeroHedge'),
    ])

    const allNews = [...finnhub, ...kitco, ...forexlive, ...zerohedge]
    const filtered = filterGoldNews(allNews)
    const deduped = deduplicateNews(filtered)

    console.log(`[NEWS] ${deduped.length} articles filtrés ✅`)

    await redis.set(cacheKey, deduped, { ex: CACHE_TTL.NEWS })

    return NextResponse.json(deduped)
  } catch (error) {
    console.error('[NEWS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}