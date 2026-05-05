import { GOLD_KEYWORDS } from '@/lib/constants'
import { GoldNews } from '@/lib/types'

function createNewsId(article: any): string {
  const source = article.source ?? 'unknown'
  const time = new Date(article.publishedAt ?? Date.now()).getTime()
  const title = (article.title ?? '').substring(0, 20).replace(/\s+/g, '')
  return `${source}-${time}-${title}`
}

function tagImpact(title: string, description: string): 'bullish' | 'bearish' | 'neutral' {
  const text = (title + ' ' + description).toLowerCase()

  const bullish = [
    'gold rises', 'gold gains', 'gold surges', 'gold jumps', 'gold rallies',
    'safe haven', 'haven buying', 'flight to safety', 'risk aversion',
    'dollar weakness', 'dollar falls', 'dollar drops',
    'fed dovish', 'rate cut', 'lower rates',
    'geopolitical tensions', 'war fears', 'conflict escalates',
    'central bank buying', 'gold reserves increase',
    'etf inflows', 'gold etf buying',
  ]

  const bearish = [
    'gold falls', 'gold drops', 'gold declines', 'gold slumps',
    'gold sells off', 'profit taking',
    'dollar strength', 'dollar rises', 'dollar surges',
    'fed hawkish', 'rate hike', 'higher rates',
    'risk appetite', 'risk on', 'stocks rally',
    'etf outflows', 'gold etf selling',
  ]

  for (const trigger of bullish) {
    if (text.includes(trigger)) return 'bullish'
  }
  for (const trigger of bearish) {
    if (text.includes(trigger)) return 'bearish'
  }
  return 'neutral'
}

function calculateRelevanceScore(title: string, description: string, matches: string[]): number {
  let score = matches.length * 2

  const critical = ['gold', 'xau', 'fed', 'dollar', 'inflation', 'war', 'sanctions']
  critical.forEach(kw => {
    if (title.toLowerCase().includes(kw)) score += 3
  })

  if (title.toLowerCase().includes('gold') && title.toLowerCase().includes('fed')) score += 5
  if (title.toLowerCase().includes('gold') && title.toLowerCase().includes('war')) score += 5

  return Math.min(score, 20)
}

export function filterGoldNews(articles: any[]): GoldNews[] {
  return articles
    .map(article => {
      const titleLower = (article.title ?? '').toLowerCase()
      const descLower = (article.description ?? '').toLowerCase()

      const matches = GOLD_KEYWORDS.filter(kw =>
        titleLower.includes(kw.toLowerCase()) ||
        descLower.includes(kw.toLowerCase())
      )

      const relevanceScore = calculateRelevanceScore(titleLower, descLower, matches)
      const goldImpact = tagImpact(article.title ?? '', article.description ?? '')

      return {
        id: createNewsId(article),
        title: article.title ?? '',
        summary: article.description ?? '',
        source: article.source ?? 'unknown',
        publishedAt: article.publishedAt ?? new Date().toISOString(),
        url: article.url ?? '',
        relevanceScore,
        goldImpact,
        keywords: matches,
      }
    })
    .filter(n => n.relevanceScore > 0)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
}

export function deduplicateNews(news: GoldNews[]): GoldNews[] {
  const seen = new Set<string>()
  return news.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}