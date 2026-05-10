import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { SYSTEM_PROMPT_ANALYST } from '@/lib/contextual-report'
import { filterNewsForSymbol } from '@/lib/impact-map'

const GROQ_API_KEY = process.env.GROQ_API_KEY
let groq: Groq | null = null

if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY })
}

// Cache centralisé pour toutes les analyses
const BULK_CACHE: Map<string, { analyses: Record<string, string>; timestamp: number }> = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Bulk Analysis API
 * 
 * Génère une seule analyse Groq pour TOUTES les paires du desk
 * = 1 appel Groq au lieu de 8+ appels individuels
 * 
 * Réduit les requêtes Groq de 8 req/5min à 1 req/10min
 * = 96 req/jour au lieu de 2304 req/jour
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      symbols = [],
      biases = [],
      prices = [],
    } = body

    if (!symbols.length || symbols.length !== biases.length || symbols.length !== prices.length) {
      return NextResponse.json(
        { error: 'symbols, biases, prices arrays must be same length and non-empty' },
        { status: 400 }
      )
    }

    // Cache key = hash des symboles
    const cacheKey = symbols.sort().join(',')
    
    // Vérifier cache
    const cached = BULK_CACHE.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[Bulk Analysis] Returning ${symbols.length} analyses from cache`)
      return NextResponse.json({
        analyses: cached.analyses,
        source: 'cache',
        timestamp: new Date().toISOString(),
      })
    }

    // Si Groq pas configuré → fallback simple
    if (!groq) {
      console.warn('[Bulk Analysis] GROQ_API_KEY not configured - using fallback')
      const fallbackAnalyses: Record<string, string> = {}
      
      symbols.forEach((symbol: string, i: number) => {
        const bias = biases[i]
        const price = prices[i]
        fallbackAnalyses[symbol] = `${symbol} - ${price.change > 0 ? '↑' : '↓'} ${Math.abs(price.change).toFixed(2)}%. Swing ${bias.swing?.direction || 'N/A'}, Day ${bias.day?.direction || 'N/A'}.`
      })

      BULK_CACHE.set(cacheKey, { analyses: fallbackAnalyses, timestamp: Date.now() })
      
      return NextResponse.json({
        analyses: fallbackAnalyses,
        source: 'fallback-groq-unavailable',
        timestamp: new Date().toISOString(),
      })
    }

    // Fetch global news directly from Finnhub (production-safe)
    let globalNews: any[] = []
    try {
      const FINNHUB_KEY = process.env.FINNHUB_API_KEY
      if (FINNHUB_KEY) {
        const newsRes = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`)
        if (newsRes.ok) {
          const newsData = await newsRes.json()
          globalNews = (newsData || []).slice(0, 50).map((n: any) => ({
            headline: n.headline || n.title,
            summary: n.summary,
            source: n.source,
            datetime: n.datetime * 1000,
            sentiment: 0
          }))
          console.log(`[Bulk Analysis] Fetched ${globalNews.length} global news from Finnhub`)
        }
      }
    } catch (e) {
      console.warn('[Bulk Analysis] Failed to fetch news, continuing without:', e)
    }

    // Construire le prompt avec NEWS FILTRÉES PAR PAIRE
    // CRUCIAL: Sans news, toutes les analyses seraient identiques!
    const symbolsWithContext = symbols.map((symbol: string, i: number) => {
      const bias = biases[i]
      const price = prices[i]
      
      // Filtrer les news pour cette paire (passer globalNews en parametre!)
      const filteredNews = filterNewsForSymbol(symbol, globalNews)
      const top3News = filteredNews.slice(0, 3).map((n: any) => n.headline || n.title).join(' | ')
      
      console.log(`[Bulk Analysis] ${symbol} → ${filteredNews.length} news filtrées`)
      
      return `
${symbol}:
- Prix: ${price.price?.toFixed(4) || 'N/A'} (${price.change > 0 ? '+' : ''}${price.change?.toFixed(2) || 'N/A'}%)
- Swing: ${bias.swing?.direction || 'N/A'} (${bias.swing?.confidence || 0}%)
- Day: ${bias.day?.direction || 'N/A'} (${bias.day?.confidence || 0}%)
- News: ${top3News || 'Aucune news récente'}`
    })

    const prompt = `Tu es un analyste de trading professionnel. Génère une analyse TRÈS COURTE (1 seule phrase) pour chaque paire. 
Intègre les news récentes dans ta compréhension du contexte.
Sois objectif et factuel.

${symbolsWithContext.join('\n')}

Retourne UNIQUEMENT un JSON valide, sans texte avant ni après:
{
${symbols.map((s: string) => `  "${s}": "analyse ici"`).join(',\n')}
}
`

    console.log(`[Bulk Analysis] Calling Groq for ${symbols.length} symbols with filtered news`)

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200, // ~150 chars × 8 paires
      temperature: 0.3, // Plus cohérent
      system: SYSTEM_PROMPT_ANALYST,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = completion.choices?.[0]?.message?.content

    if (!responseText) {
      throw new Error('Groq returned empty response')
    }

    console.log('[Bulk Analysis] Groq raw response (first 300 chars):', responseText.substring(0, 300))

    // Parser la réponse JSON avec extraction robuste
    let analyses: Record<string, string> = {}
    try {
      // Chercher le JSON entre { et }
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON object found in response')
      }

      analyses = JSON.parse(jsonMatch[0])
      console.log('[Bulk Analysis] ✓ Parsed JSON successfully:', Object.keys(analyses))
    } catch (parseError) {
      console.error('[Bulk Analysis] Failed to parse JSON:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responseLength: responseText.length,
        response: responseText.substring(0, 300)
      })

      // Fallback robuste: analyse technique simple
      console.log('[Bulk Analysis] Applying fallback analyses for all symbols')
      symbols.forEach(async (symbol: string, i: number) => {
        const price = prices[i]
        const bias = biases[i]
        const direction = price.change > 0 ? 'hausse' : price.change < 0 ? 'baisse' : 'stable'
        const changeAbs = Math.abs(price.change).toFixed(2)
        
        // Incluez les news même en fallback
        const news = await filterNewsForSymbol(symbol)
        const newsContext = news.length > 0 ? ` (${news.length} news)` : ''
        
        analyses[symbol] = `${symbol} en ${direction} de ${changeAbs}%. Swing ${bias.swing?.direction || 'N/A'}, Day ${bias.day?.direction || 'N/A'}${newsContext}.`
      })
    }

    // Cache les résultats
    BULK_CACHE.set(cacheKey, { analyses, timestamp: Date.now() })

    console.log(`[Bulk Analysis] ✓ Generated analyses for ${symbols.length} symbols`)

    return NextResponse.json({
      analyses,
      source: 'groq',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Bulk Analysis] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
