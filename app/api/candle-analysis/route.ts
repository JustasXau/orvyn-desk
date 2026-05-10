import { NextResponse } from 'next/server'
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

interface CandleEvent {
  time: number
  open: number
  high: number
  low: number
  close: number
  symbol: string
}

interface NewsItem {
  headline: string
  source: string
  url: string
  datetime: number
  sentiment?: 'bullish' | 'bearish' | 'neutral'
}

// Fetch news around a specific timestamp (±2 hours window)
async function fetchNewsAroundTime(symbol: string, timestamp: number): Promise<NewsItem[]> {
  const allNews: NewsItem[] = []
  
  // Time window: 2 hours before and after the candle
  const fromTime = timestamp - (2 * 60 * 60)
  const toTime = timestamp + (2 * 60 * 60)
  
  // Convert symbol for Finnhub
  const finnhubSymbol = symbol.replace('/', '').replace('USD', '')
  
  // Finnhub general news
  if (FINNHUB_API_KEY) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FINNHUB_API_KEY}`,
        { next: { revalidate: 60 } }
      )
      if (res.ok) {
        const data = await res.json()
        const filtered = data.filter((n: any) => n.datetime >= fromTime && n.datetime <= toTime)
        filtered.forEach((n: any) => {
          allNews.push({
            headline: n.headline,
            source: n.source,
            url: n.url,
            datetime: n.datetime,
            sentiment: detectSentiment(n.headline)
          })
        })
      }
    } catch (e) { console.error('[v0] Finnhub news error:', e) }
  }

  // Also fetch from our main news API and filter by time
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/news?limit=50`)
    if (res.ok) {
      const data = await res.json()
      if (data.news) {
        const filtered = data.news.filter((n: any) => {
          const newsTime = n.datetime / 1000 // Convert ms to seconds if needed
          return newsTime >= fromTime && newsTime <= toTime
        })
        filtered.forEach((n: any) => {
          // Avoid duplicates
          if (!allNews.some(existing => existing.headline === n.headline)) {
            allNews.push({
              headline: n.headline,
              source: n.source,
              url: n.url || '#',
              datetime: typeof n.datetime === 'number' && n.datetime > 9999999999 ? n.datetime / 1000 : n.datetime,
              sentiment: detectSentiment(n.headline)
            })
          }
        })
      }
    }
  } catch (e) { console.error('[v0] News API error:', e) }

  // Sort by time descending (most recent first)
  return allNews.sort((a, b) => b.datetime - a.datetime).slice(0, 10)
}

function detectSentiment(headline: string): 'bullish' | 'bearish' | 'neutral' {
  const text = headline.toLowerCase()
  
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'climb', 'jump', 'soar', 'breakout', 'bullish', 'record high', 'support']
  const bearishWords = ['drop', 'fall', 'plunge', 'crash', 'decline', 'sink', 'bearish', 'risk', 'fear', 'tension', 'war', 'conflict', 'sanction']
  
  const bullishScore = bullishWords.filter(w => text.includes(w)).length
  const bearishScore = bearishWords.filter(w => text.includes(w)).length
  
  if (bullishScore > bearishScore) return 'bullish'
  if (bearishScore > bullishScore) return 'bearish'
  return 'neutral'
}

export async function POST(request: Request) {
  try {
    const candle: CandleEvent = await request.json()
    
    if (!candle.time || !candle.symbol) {
      return NextResponse.json({ error: 'Missing candle data' }, { status: 400 })
    }

    // Calculate candle direction and change
    const changePct = ((candle.close - candle.open) / candle.open) * 100
    const direction = changePct > 0.05 ? 'up' : changePct < -0.05 ? 'down' : 'flat'
    
    // Fetch news around this candle's time
    const news = await fetchNewsAroundTime(candle.symbol, candle.time)
    
    // Generate AI summary with Groq
    let summary = "Aucune analyse disponible pour cette bougie."
    
    if (process.env.GROQ_API_KEY && news.length > 0) {
      try {
        const newsContext = news.slice(0, 5).map(n => `- ${n.headline} (${n.source})`).join('\n')
        
        const prompt = `Tu es un analyste trading. Analyse cette bougie et explique ce qui a fait bouger le prix.

Actif: ${candle.symbol}
Bougie: Open=${candle.open.toFixed(2)}, High=${candle.high.toFixed(2)}, Low=${candle.low.toFixed(2)}, Close=${candle.close.toFixed(2)}
Variation: ${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%
Direction: ${direction === 'up' ? 'haussiere' : direction === 'down' ? 'baissiere' : 'neutre'}

News autour de cette bougie:
${newsContext || 'Aucune news specifique trouvee.'}

Ecris un resume concis (2-3 phrases max) en francais expliquant ce qui a probablement fait bouger le prix. Si les news sont liees a la geopolitique, au petrole, aux taux d'interet ou aux tensions commerciales, mentionne l'impact. Sois direct et factuel.`

        const { text } = await generateText({
          model: groq("llama-3.1-8b-instant"),
          prompt,
          maxTokens: 150,
          temperature: 0.3
        })
        
        summary = text
      } catch (e) {
        console.error('[v0] Groq error:', e)
        // Fallback summary
        if (news.length > 0) {
          summary = `Le prix a ${direction === 'up' ? 'monte' : direction === 'down' ? 'baisse' : 'stagne'} de ${Math.abs(changePct).toFixed(2)}%. News principale: ${news[0].headline}`
        }
      }
    } else if (news.length > 0) {
      summary = `Le prix a ${direction === 'up' ? 'monte' : direction === 'down' ? 'baisse' : 'stagne'} de ${Math.abs(changePct).toFixed(2)}%. News principale: ${news[0].headline}`
    }

    // Build technical analysis
    const technicalAnalysis = buildTechnicalAnalysis(candle, direction, changePct)
    
    return NextResponse.json({
      candle,
      news,
      summary,
      direction,
      changePct,
      technicalAnalysis,
      timestamp: new Date(candle.time * 1000).toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    })
  } catch (error) {
    console.error('[v0] Candle analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function buildTechnicalAnalysis(candle: CandleEvent, direction: string, changePct: number): string {
  const range = candle.high - candle.low
  const body = Math.abs(candle.close - candle.open)
  const bodyRatio = (body / range) * 100
  
  let analysis = ''
  
  if (direction === 'up') {
    if (bodyRatio > 70) {
      analysis = `Bougie fortement haussiere avec un corps representant ${bodyRatio.toFixed(0)}% de la range. Pression acheteuse dominante.`
    } else if (bodyRatio > 40) {
      analysis = `Bougie haussiere moderee. La meche superieure indique une resistance rencontree.`
    } else {
      analysis = `Bougie indecise avec cloture positive. Les acheteurs ont repris le controle en fin de session.`
    }
  } else if (direction === 'down') {
    if (bodyRatio > 70) {
      analysis = `Bougie fortement baissiere avec un corps representant ${bodyRatio.toFixed(0)}% de la range. Pression vendeuse dominante.`
    } else if (bodyRatio > 40) {
      analysis = `Bougie baissiere moderee. La meche inferieure suggere un support teste.`
    } else {
      analysis = `Bougie indecise avec cloture negative. Les vendeurs ont pris le dessus en fin de session.`
    }
  } else {
    analysis = `Bougie doji ou neutre. Equilibre entre acheteurs et vendeurs. Attendre confirmation de direction.`
  }
  
  return analysis
}
