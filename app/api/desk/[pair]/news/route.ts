// app/api/desk/[pair]/news/route.ts
// News filtrées par mots-clés spécifiques à la paire

import { NextRequest, NextResponse } from 'next/server'
import { getPair } from '@/lib/pairs/config'

export async function GET(req: NextRequest, { params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const config = getPair(pair.toUpperCase())
  if (!config) return NextResponse.json({ error: 'Pair not found' }, { status: 404 })

  const keywords = config.newsKeywords.slice(0, 4).join(' OR ')
  const news: any[] = []

  // Finnhub news
  try {
    const finnhubKey = process.env.FINNHUB_API_KEY
    if (finnhubKey) {
      const to = new Date()
      const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const res = await fetch(
        `https://finnhub.io/api/v1/news?category=forex&token=${finnhubKey}`,
        { next: { revalidate: 300 } }
      )
      if (res.ok) {
        const data = await res.json()
        const kw = config.newsKeywords.map(k => k.toLowerCase())
        const filtered = (data || [])
          .filter((n: any) => {
            const text = `${n.headline} ${n.summary}`.toLowerCase()
            return kw.some(k => text.includes(k))
          })
          .slice(0, 5)
          .map((n: any) => ({
            uuid: String(n.id),
            title: n.headline,
            description: n.summary,
            url: n.url,
            source: n.source,
            sourceCategory: 'MARKET' as const,
            publishedAt: new Date(n.datetime * 1000).toISOString(),
            publishedAgo: timeAgo(n.datetime * 1000),
            impact: 'medium' as const,
            relevanceScore: 0.8,
          }))
        news.push(...filtered)
      }
    }
  } catch {}

  // MarketAux news
  try {
    const mKey = process.env.MARKETAUX_API_KEY
    if (mKey && news.length < 8) {
      const res = await fetch(
        `https://api.marketaux.com/v1/news/all?search=${encodeURIComponent(config.newsKeywords[0])}&language=en&api_token=${mKey}&limit=5`,
        { next: { revalidate: 300 } }
      )
      if (res.ok) {
        const data = await res.json()
        const items = (data.data || []).map((n: any) => ({
          uuid: n.uuid,
          title: n.title,
          description: n.description,
          url: n.url,
          source: n.source,
          sourceCategory: 'GENERAL' as const,
          publishedAt: n.published_at,
          publishedAgo: timeAgo(new Date(n.published_at).getTime()),
          impact: 'medium' as const,
          relevanceScore: n.relevance_score || 0.6,
        }))
        news.push(...items)
      }
    }
  } catch {}

  // Deduplicate and sort by date
  const seen = new Set<string>()
  const unique = news
    .filter(n => { if (seen.has(n.uuid)) return false; seen.add(n.uuid); return true })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10)

  return NextResponse.json({ pair: config.id, keywords: config.newsKeywords, news: unique })
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d ago`
  if (h >= 1) return `${h}h ago`
  return `${m}m ago`
}
