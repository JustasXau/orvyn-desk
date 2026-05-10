import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

// Symbol descriptions for context
const SYMBOL_CONTEXT: Record<string, string> = {
  'XAU/USD': 'Gold - safe haven asset',
  'XAG/USD': 'Silver - precious metal',
  'DXY': 'US Dollar Index',
  'US30': 'Dow Jones Industrial Average',
  'US100': 'Nasdaq 100 - tech heavy',
  'US500': 'S&P 500 Index',
  'WTI': 'West Texas Intermediate Crude Oil',
  'VIX': 'Volatility Index',
  'EUR/USD': 'Euro vs Dollar',
  'GBP/USD': 'British Pound vs Dollar',
  'BTC/USD': 'Bitcoin - crypto benchmark',
}

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, language = 'en' } = await request.json()
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const langName = LANGUAGE_NAMES[language] || 'English'

    // Get the host for internal API calls
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`

    // Fetch data in parallel with error handling
    const [priceData, newsData, deepDiveData] = await Promise.all([
      fetch(`${baseUrl}/api/pair-data?symbol=${encodeURIComponent(symbol)}`).then(r => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/news?symbol=${encodeURIComponent(symbol)}&limit=5`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${baseUrl}/api/deep-dive?symbol=${encodeURIComponent(symbol)}`).then(r => r.json()).catch(() => ({ indicators: {} }))
    ])

    const symbolContext = SYMBOL_CONTEXT[symbol] || symbol
    const newsHeadlines = (newsData.items || [])
      .slice(0, 3)
      .map((n: any) => n.headline)
      .join(' | ') || 'No recent news'

    const indicators = deepDiveData.indicators || {}
    const change = priceData.changePercent || 0
    const technicalContext = `
${symbol} (${symbolContext}): ${priceData.price ?? 'N/A'} (${change >= 0 ? '+' : ''}${change.toFixed ? change.toFixed(2) : change}%)
Edge Factor: ${indicators.edgeFactor?.bias || 'Neutral'} — score ${indicators.edgeFactor?.score || 50}/100
Market Mood: ${indicators.marketMood?.sentiment || 'Neutral'}
Trend/Bearing: ${indicators.bearing?.direction || 'Ranging'}
Volatility/Pulse: ${indicators.pulse?.level || 'Tradeable'}
Flow: ${indicators.flow?.level || 'Healthy'}`

    const prompt = `You are a professional financial analyst. Write a concise 2-3 sentence market analysis for ${symbol} in ${langName}.

MARKET DATA:
${technicalContext}

TODAY'S NEWS FOR ${symbol}:
${newsHeadlines}

Requirements:
- Write ONLY in ${langName}
- Explain specifically why ${symbol} moved today based on the news and data above
- Mention the key driver (macro, news event, technical level, sentiment)
- End with a brief outlook or what to watch next
- No bullet points, no generic statements, be specific to this asset`

    try {
      const groq = createGroq({
        apiKey: process.env.GROQ_API_KEY || '',
      })

      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt,
        maxTokens: 180,
      })

      return NextResponse.json({
        analysis: text.trim(),
        symbol,
        language,
        timestamp: new Date().toISOString(),
      })
    } catch (groqError: any) {
      console.error('[AI-ANALYSIS] Groq failed:', groqError.message)
      
      // Language-aware fallback
      const direction = change > 0 ? (language === 'fr' ? 'en hausse' : language === 'es' ? 'al alza' : language === 'pt' ? 'em alta' : 'up') 
                                   : change < 0 ? (language === 'fr' ? 'en baisse' : language === 'es' ? 'a la baja' : language === 'pt' ? 'em baixa' : 'down') 
                                   : (language === 'fr' ? 'stable' : 'stable')
      const sentiment = indicators.marketMood?.sentiment || 'Neutral'
      const topNews = newsHeadlines.split(' | ')[0]
      
      const fallbacks: Record<string, string> = {
        fr: `${symbol} évolue ${direction} aujourd'hui. Sentiment de marché: ${sentiment}. ${topNews ? 'Actualité clé: ' + topNews : 'En attente de signaux directionnels.'}`,
        en: `${symbol} is moving ${direction} today. Market sentiment: ${sentiment}. ${topNews ? 'Key driver: ' + topNews : 'Watching for directional signals.'}`,
        es: `${symbol} se mueve ${direction} hoy. Sentimiento del mercado: ${sentiment}. ${topNews ? 'Factor clave: ' + topNews : 'Esperando señales direccionales.'}`,
        pt: `${symbol} está ${direction} hoje. Sentimento do mercado: ${sentiment}. ${topNews ? 'Driver principal: ' + topNews : 'Aguardando sinais direcionais.'}`,
      }

      return NextResponse.json({
        analysis: fallbacks[language] || fallbacks.en,
        symbol,
        language,
        timestamp: new Date().toISOString(),
        source: 'fallback',
      })
    }

  } catch (error) {
    console.error('[AI-ANALYSIS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
