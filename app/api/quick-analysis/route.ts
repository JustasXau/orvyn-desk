import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { buildQuickAnalysisPrompt, SYSTEM_PROMPT_ANALYST } from '@/lib/contextual-report'
import { checkRateLimit } from '@/lib/rate-limit'

// Client Groq - initialisation defensive
const GROQ_API_KEY = process.env.GROQ_API_KEY
let groq: Groq | null = null

if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY })
}

// Server-side rate limiting: track last call time per symbol
const SYMBOL_LAST_CALL: Map<string, number> = new Map()
const MIN_INTERVAL_MS = 2000 // Minimum 2 seconds between calls for same symbol
const ANALYSIS_CACHE: Map<string, { analysis: string; timestamp: number }> = new Map()
const CACHE_TTL_MS = 60000 // Cache for 1 minute

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - global
    const rateLimit = checkRateLimit('quick-analysis', 100) // 100 req/min global
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      symbol,
      price,
      priceChange,
      swingBias,
      dayBias,
      news = [],
      technicalContext = '',
    } = body

    console.log('[Quick Analysis] Body reçu:', {
      symbol,
      price,
      priceChange,
      swingBias: swingBias?.direction,
      dayBias: dayBias?.direction,
    })

    // Input validation
    if (!symbol || price === undefined || priceChange === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, price, priceChange' },
        { status: 400 }
      )
    }

    // Check cache first
    const cached = ANALYSIS_CACHE.get(symbol)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[Quick Analysis] ${symbol} returned from cache`)
      return NextResponse.json({
        symbol,
        analysis: cached.analysis,
        source: 'cache',
        timestamp: new Date().toISOString(),
      })
    }

    // Per-symbol rate limiting: prevent same symbol from being called too frequently
    const lastCall = SYMBOL_LAST_CALL.get(symbol) ?? 0
    const timeSinceLastCall = Date.now() - lastCall
    
    if (timeSinceLastCall < MIN_INTERVAL_MS) {
      const waitTime = MIN_INTERVAL_MS - timeSinceLastCall
      console.log(`[Quick Analysis] ${symbol} rate limited - must wait ${waitTime}ms`)
      
      // Return cached result if available instead of error
      if (cached) {
        return NextResponse.json({
          symbol,
          analysis: cached.analysis,
          source: 'cache-rate-limited',
          timestamp: new Date().toISOString(),
        })
      }
      
      // If no cache, wait and try again
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Verify Groq is configured
    if (!groq) {
      console.warn('[Quick Analysis] GROQ_API_KEY not configured - using fallback')
      const fallback = `${symbol} - Analyse AI indisponible. Bias swing ${swingBias?.direction || 'Neutre'}`
      ANALYSIS_CACHE.set(symbol, { analysis: fallback, timestamp: Date.now() })
      return NextResponse.json(
        { 
          analysis: fallback,
          dataUsed: { relevantNews: 0, hasNews: false },
          source: 'fallback-groq-unavailable'
        }
      )
    }

    // Build the quick analysis prompt (top 5 filtered news)
    const prompt = buildQuickAnalysisPrompt({
      symbol,
      price,
      priceChange,
      swingBias: swingBias || { direction: 'Neutre', confidence: 0, score: 0 },
      dayBias: dayBias || { direction: 'Neutre', confidence: 0, score: 0 },
      news,
      technicalContext,
    })

    console.log(`[Quick Analysis] Generating for ${symbol}`)

    // Call Groq with system prompt enforcing coherence
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150, // Short analysis only
      system: SYSTEM_PROMPT_ANALYST,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = completion.choices?.[0]?.message?.content

    if (!analysis) {
      throw new Error('Groq returned empty response')
    }

    // Update call time
    SYMBOL_LAST_CALL.set(symbol, Date.now())
    
    // Cache the result
    ANALYSIS_CACHE.set(symbol, { analysis, timestamp: Date.now() })

    console.log(`[Quick Analysis] ✓ Generated for ${symbol}: ${analysis.substring(0, 50)}...`)

    return NextResponse.json({
      symbol,
      analysis,
      timestamp: new Date().toISOString(),
      dataUsed: {
        relevantNews: news.length,
        hasNews: news.length > 0,
      },
      source: 'groq',
    })
  } catch (error) {
    console.error('[Quick Analysis] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
