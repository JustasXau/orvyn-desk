import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { analysisApiLimiter, checkRateLimit } from '@/lib/rate-limit'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const ORVYN_SYSTEM_PROMPT = `You are Orvyn Desk AI, a professional trading assistant and system integrity monitor.

Your role is to ensure that the platform works reliably for users, especially:
* Watchlists
* Favorite pairs
* Market data consistency
* Basic trading assistance

## TASKS

### 1. WATCHLIST & FAVORITES VALIDATION
* Check that all symbols are valid and properly formatted (e.g. BTCUSDT, XAUUSD, XAU/USD)
* Detect duplicates
* Detect empty watchlist
* Detect if favorites are missing or not saved correctly

### 2. DATA CONSISTENCY
* Verify that market data exists for each symbol
* Detect missing prices
* Detect stale data (timestamps too old - more than 5 minutes for active markets)
* Detect inconsistencies between symbols and data

### 3. USER EXPERIENCE CHECK
* If watchlist is empty → suggest adding major pairs
* If user has very few favorites → suggest popular assets
* If inactive → suggest checking market opportunities

### 4. TRADING CONTEXT
* Provide a simple bias based on the data: BULLISH / BEARISH / NEUTRAL
* Do NOT invent signals
* Do NOT override system decisions

## OUTPUT FORMAT (STRICT JSON ONLY - NO MARKDOWN)
{
  "status": "OK" | "WARNING" | "ERROR",
  "checks": {
    "watchlist": "OK" | "ISSUE",
    "favorites": "OK" | "ISSUE",
    "market_data": "OK" | "ISSUE"
  },
  "issues": ["clear explanation of detected problems"],
  "suggestions": ["specific actionable fixes"],
  "summary": "short message for UI (1 sentence max)",
  "trading_hint": {
    "bias": "BULLISH" | "BEARISH" | "NEUTRAL" | "NONE",
    "confidence": 0-100
  }
}

## HARD RULES
* Never guess missing data
* If critical data is missing → status = ERROR
* Keep explanations short and actionable
* Maximum 5 issues and 5 suggestions
* If everything is correct → status = OK and issues = []
* RESPOND ONLY WITH VALID JSON - NO MARKDOWN, NO CODE BLOCKS`

// Valid trading symbols
const VALID_SYMBOLS = [
  'XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/CHF',
  'US30', 'US100', 'US500', 'DE40', 'UK100', 'JP225', 'FR40',
  'DXY', 'VIX',
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD',
  'WTI', 'BRENT', 'NATGAS',
  'BTCUSDT', 'ETHUSDT', 'XAUUSD', 'EURUSD', 'GBPUSD'
]

interface OrvynInput {
  userWatchlist?: string[]
  userFavorites?: string[]
  marketData?: Record<string, { price: number; timestamp: number; change?: number }>
  userActivity?: {
    lastActive?: string
    tradesCount?: number
  }
}

interface OrvynResponse {
  status: 'OK' | 'WARNING' | 'ERROR'
  checks: {
    watchlist: 'OK' | 'ISSUE'
    favorites: 'OK' | 'ISSUE'
    market_data: 'OK' | 'ISSUE'
  }
  issues: string[]
  suggestions: string[]
  summary: string
  trading_hint: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'NONE'
    confidence: number
  }
}

// Pre-validation before AI
function preValidate(input: OrvynInput): { issues: string[]; suggestions: string[] } {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Check watchlist
  if (!input.userWatchlist || input.userWatchlist.length === 0) {
    issues.push('Watchlist vide')
    suggestions.push('Ajoutez des paires comme XAU/USD, EUR/USD, US100')
  } else {
    // Check for duplicates
    const duplicates = input.userWatchlist.filter((item, index) => 
      input.userWatchlist!.indexOf(item) !== index
    )
    if (duplicates.length > 0) {
      issues.push(`Doublons detectes: ${duplicates.join(', ')}`)
      suggestions.push('Supprimez les doublons de votre watchlist')
    }
    
    // Check for invalid symbols
    const invalidSymbols = input.userWatchlist.filter(s => 
      !VALID_SYMBOLS.includes(s) && !VALID_SYMBOLS.includes(s.replace('/', ''))
    )
    if (invalidSymbols.length > 0) {
      issues.push(`Symboles non reconnus: ${invalidSymbols.join(', ')}`)
      suggestions.push('Verifiez le format des symboles (ex: XAU/USD, EURUSD)')
    }
  }
  
  // Check favorites
  if (!input.userFavorites || input.userFavorites.length === 0) {
    suggestions.push('Ajoutez vos paires favorites pour un acces rapide')
  }
  
  // Check market data freshness
  if (input.marketData) {
    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes
    
    for (const [symbol, data] of Object.entries(input.marketData)) {
      if (!data.price || data.price === 0) {
        issues.push(`Donnees manquantes pour ${symbol}`)
      } else if (now - data.timestamp > staleThreshold) {
        const minutesOld = Math.floor((now - data.timestamp) / 60000)
        issues.push(`Donnees obsoletes pour ${symbol} (${minutesOld} min)`)
      }
    }
  }
  
  return { issues: issues.slice(0, 5), suggestions: suggestions.slice(0, 5) }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = await checkRateLimit(request, analysisApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }
  
  try {
    const input: OrvynInput = await request.json()
    
    // Pre-validation
    const preValidation = preValidate(input)
    
    // If no Groq API key or simple validation is enough
    if (!process.env.GROQ_API_KEY || (preValidation.issues.length === 0 && (!input.marketData || Object.keys(input.marketData).length === 0))) {
      const response: OrvynResponse = {
        status: preValidation.issues.length > 0 ? 'WARNING' : 'OK',
        checks: {
          watchlist: (!input.userWatchlist || input.userWatchlist.length === 0) ? 'ISSUE' : 'OK',
          favorites: (!input.userFavorites || input.userFavorites.length === 0) ? 'ISSUE' : 'OK',
          market_data: 'OK'
        },
        issues: preValidation.issues,
        suggestions: preValidation.suggestions,
        summary: preValidation.issues.length > 0 
          ? 'Quelques ajustements recommandes pour optimiser votre experience'
          : 'Systeme operationnel - Tout fonctionne correctement',
        trading_hint: {
          bias: 'NONE',
          confidence: 0
        }
      }
      
      return NextResponse.json(response)
    }
    
    // Call Groq for advanced analysis
    const userPrompt = `Analyse les donnees suivantes et retourne UNIQUEMENT un JSON valide (pas de markdown):

WATCHLIST: ${JSON.stringify(input.userWatchlist || [])}
FAVORITES: ${JSON.stringify(input.userFavorites || [])}
MARKET DATA: ${JSON.stringify(input.marketData || {})}
USER ACTIVITY: ${JSON.stringify(input.userActivity || {})}

PRE-VALIDATION ISSUES: ${JSON.stringify(preValidation.issues)}
PRE-VALIDATION SUGGESTIONS: ${JSON.stringify(preValidation.suggestions)}

Reponds en francais. Retourne UNIQUEMENT le JSON, sans \`\`\` ni autre formatage.`

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: ORVYN_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
      maxTokens: 1000,
    })
    
    // Parse AI response
    let response: OrvynResponse
    try {
      // Clean the response (remove any markdown if present)
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      response = JSON.parse(cleanedText)
    } catch {
      // Fallback if AI response is not valid JSON
      response = {
        status: preValidation.issues.length > 0 ? 'WARNING' : 'OK',
        checks: {
          watchlist: (!input.userWatchlist || input.userWatchlist.length === 0) ? 'ISSUE' : 'OK',
          favorites: (!input.userFavorites || input.userFavorites.length === 0) ? 'ISSUE' : 'OK',
          market_data: input.marketData ? 'OK' : 'ISSUE'
        },
        issues: preValidation.issues,
        suggestions: preValidation.suggestions,
        summary: 'Analyse terminee',
        trading_hint: {
          bias: 'NEUTRAL',
          confidence: 50
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[Orvyn] Error:', error)
    return NextResponse.json({
      status: 'ERROR',
      checks: {
        watchlist: 'ISSUE',
        favorites: 'ISSUE',
        market_data: 'ISSUE'
      },
      issues: ['Erreur systeme - Impossible de completer l\'analyse'],
      suggestions: ['Rafraichissez la page et reessayez'],
      summary: 'Erreur systeme detectee',
      trading_hint: {
        bias: 'NONE',
        confidence: 0
      }
    }, { status: 500 })
  }
}

// GET endpoint for quick status check
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'Orvyn Desk AI',
    version: '1.0.0',
    capabilities: ['watchlist_validation', 'favorites_check', 'market_data_integrity', 'trading_hints']
  })
}
