// Sentiment Reddit — r/forex, r/wallstreetbets, r/Gold
// API JSON publique sans cle

import { TIMEOUTS } from '@/lib/ai/config'

export interface RedditPost {
  title: string
  score: number
  numComments: number
  subreddit: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  url: string
}

export interface RedditSentimentData {
  posts: RedditPost[]
  bullishCount: number
  bearishCount: number
  neutralCount: number
  sentimentScore: number    // -1 a +1
  retailBias: 'bullish' | 'bearish' | 'neutral'
  summary: string
  error?: string
}

const SUBREDDIT_MAP: Record<string, string[]> = {
  'XAU/USD': ['Gold', 'investing', 'wallstreetbets'],
  'XAUUSD':  ['Gold', 'investing', 'wallstreetbets'],
  'XAG/USD': ['Gold', 'investing'],
  'WTI':     ['investing', 'wallstreetbets', 'energy'],
  'US500':   ['wallstreetbets', 'stocks', 'investing'],
  'US100':   ['wallstreetbets', 'stocks', 'investing'],
  'DXY':     ['forex', 'investing'],
  'EUR/USD': ['forex', 'investing'],
  'BTC/USD': ['CryptoCurrency', 'Bitcoin', 'wallstreetbets'],
  'default': ['forex', 'investing', 'wallstreetbets'],
}

const BULLISH_WORDS = ['buy', 'bull', 'long', 'moon', 'support', 'breakout', 'upside', 'higher', 'strong', 'pump']
const BEARISH_WORDS = ['sell', 'bear', 'short', 'drop', 'crash', 'resistance', 'downside', 'lower', 'weak', 'dump']

function analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const t = text.toLowerCase()
  let bullish = 0
  let bearish = 0

  for (const w of BULLISH_WORDS) if (t.includes(w)) bullish++
  for (const w of BEARISH_WORDS) if (t.includes(w)) bearish++

  if (bullish > bearish) return 'bullish'
  if (bearish > bullish) return 'bearish'
  return 'neutral'
}

async function fetchSubreddit(subreddit: string): Promise<RedditPost[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=15&t=day`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OrvynDesk/1.0 (financial data aggregator)',
          'Accept': 'application/json',
        },
      }
    )
    clearTimeout(timeout)

    if (!res.ok) return []

    const data = await res.json()
    const posts = data?.data?.children || []

    return posts.map((p: { data: { title: string; score: number; num_comments: number; permalink: string } }) => ({
      title: p.data.title,
      score: p.data.score,
      numComments: p.data.num_comments,
      subreddit,
      sentiment: analyzeSentiment(p.data.title),
      url: `https://reddit.com${p.data.permalink}`,
    }))
  } catch {
    return []
  }
}

export async function fetchRedditSentiment(symbol: string): Promise<RedditSentimentData> {
  const subreddits = SUBREDDIT_MAP[symbol] || SUBREDDIT_MAP.default

  const results = await Promise.all(subreddits.map(s => fetchSubreddit(s)))
  const allPosts = results.flat()

  if (allPosts.length === 0) {
    return {
      posts: [],
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      sentimentScore: 0,
      retailBias: 'neutral',
      summary: 'Sentiment Reddit non disponible',
      error: 'Aucune donnee Reddit',
    }
  }

  // Ponderer par score Reddit
  let weightedBullish = 0
  let weightedBearish = 0
  let bullishCount = 0
  let bearishCount = 0
  let neutralCount = 0

  for (const post of allPosts) {
    const weight = Math.log(post.score + 1)
    if (post.sentiment === 'bullish') { weightedBullish += weight; bullishCount++ }
    else if (post.sentiment === 'bearish') { weightedBearish += weight; bearishCount++ }
    else neutralCount++
  }

  const total = weightedBullish + weightedBearish || 1
  const sentimentScore = Math.round(((weightedBullish - weightedBearish) / total) * 100) / 100
  const retailBias = sentimentScore > 0.2 ? 'bullish' : sentimentScore < -0.2 ? 'bearish' : 'neutral'

  // Note: quand le retail est extremement bullish, c'est souvent un signal contrarian
  const contrarianNote = retailBias === 'bullish' && sentimentScore > 0.7
    ? ' — ATTENTION: retail tres bullish = signal contrarian potentiel'
    : retailBias === 'bearish' && sentimentScore < -0.7
    ? ' — ATTENTION: retail tres bearish = opportunite contrarian possible'
    : ''

  const summary = `Sentiment retail Reddit: ${bullishCount} haussiers / ${bearishCount} baissiers (score: ${sentimentScore > 0 ? '+' : ''}${sentimentScore})${contrarianNote}`

  return {
    posts: allPosts.slice(0, 10),
    bullishCount,
    bearishCount,
    neutralCount,
    sentimentScore,
    retailBias,
    summary,
  }
}
