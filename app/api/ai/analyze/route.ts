import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { aiApiLimiter, checkRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Fetch real market data for context
async function fetchMarketContext(symbol: string) {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const [priceRes, newsRes] = await Promise.all([
      fetch(`${baseUrl}/api/pair-data?symbol=${encodeURIComponent(symbol)}`).catch(() => null),
      fetch(`${baseUrl}/api/news?symbol=${encodeURIComponent(symbol)}&limit=5`).catch(() => null),
    ])
    
    const priceData = priceRes?.ok ? await priceRes.json() : null
    const newsData = newsRes?.ok ? await newsRes.json() : null
    
    return { priceData, newsData }
  } catch {
    return { priceData: null, newsData: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifier l'authentification
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }
    
    // Verifier le rate limit (10 requetes/min pour l'IA)
    const rateLimitCheck = await checkRateLimit(request, aiApiLimiter, user.id)
    if (!rateLimitCheck.success) {
      return rateLimitCheck.response
    }
    
    const { symbol, type } = await request.json()
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol requis' },
        { status: 400 }
      )
    }
    
    // Recuperer le contexte de marche reel
    const { priceData, newsData } = await fetchMarketContext(symbol)
    
    // Construire le contexte avec les donnees reelles
    let marketContext = ''
    
    if (priceData) {
      marketContext += `
DONNEES DE MARCHE ACTUELLES:
- Prix actuel: ${priceData.price}
- Variation: ${priceData.changePercent?.toFixed(2)}%
- Biais Swing: ${priceData.swingBias?.label || priceData.swingBias?.bias} (${priceData.swingBias?.confidence}% confiance)
- Biais Intraday: ${priceData.dayBias?.label || priceData.dayBias?.bias} (${priceData.dayBias?.confidence}% confiance)
- RSI: ${priceData.rsi || 'N/A'}
- Volatilite: ${priceData.volatility || 'N/A'}
`
    }
    
    if (newsData?.articles?.length > 0) {
      marketContext += `
NEWS RECENTES:
${newsData.articles.slice(0, 5).map((n: { title: string; sentiment?: string }) => 
  `- ${n.title} (${n.sentiment || 'neutral'})`
).join('\n')}
`
    }

    // Determine system bias for consistency
    const swingBias = priceData?.swingBias?.bias || 'neu'
    const swingConfidence = priceData?.swingBias?.confidence || 50
    const dayBias = priceData?.dayBias?.bias || 'neu'
    const dayConfidence = priceData?.dayBias?.confidence || 50
    
    // Map bias to French labels
    const biasToFrench = (b: string) => b === 'bull' ? 'HAUSSIER' : b === 'bear' ? 'BAISSIER' : 'NEUTRE'
    const systemSwingBias = biasToFrench(swingBias)
    const systemDayBias = biasToFrench(dayBias)
    
    // Determine overall verdict (swing dominates)
    const overallBias = swingConfidence < 30 && dayConfidence < 30 ? 'NEUTRE' : systemSwingBias
    const overallConfidence = Math.max(swingConfidence, dayConfidence)
    const convictionLevel = Math.round(overallConfidence / 10) // 0-10 scale

    // Determine action based on confidence
    const action = swingConfidence >= 65 
      ? (swingBias === 'bull' ? 'BUY' : swingBias === 'bear' ? 'SELL' : 'HOLD')
      : 'HOLD'

    // System prompt professionnel style Goldman Sachs - FORCE consistency with system bias
    const systemPrompt = `Tu es un analyste macro + quant senior chez Goldman Sachs.
Analyse l'actif ${symbol}.

═══════════════════════════════════════════════════════════════
BIAIS DU SYSTEME (A RESPECTER ABSOLUMENT - NE PAS CONTREDIRE)
═══════════════════════════════════════════════════════════════

SWING TRADING (horizon 2 semaines - 1 mois):
- Biais: ${systemSwingBias}
- Confiance: ${swingConfidence}%
- C'est la tendance structurelle dominante

DAY TRADING (horizon max 24h):
- Biais: ${systemDayBias}  
- Confiance: ${dayConfidence}%
- Focus momentum actuel et news du jour

VERDICT GLOBAL: ${overallBias}
CONVICTION: ${convictionLevel}/10
ACTION: ${action}

═══════════════════════════════════════════════════════════════

REGLES:
1. Tu NE PEUX PAS contredire ces biais - ton role est de les JUSTIFIER
2. Si la confiance est faible (<50%), explique pourquoi le marche manque de direction claire
3. Si Swing et Day divergent, c'est un PULLBACK - swing reste prioritaire
4. Sois pragmatique et prudent dans tes recommandations

Langue: Francais. Style: Direct, actionnable, professionnel.`
    
    let userPrompt = ''
    
    switch (type) {
      case 'technical':
        userPrompt = `ANALYSE TECHNIQUE MULTI-TIMEFRAME pour ${symbol}

${marketContext}

Structure ta reponse:

1. TENDANCE
- Daily/H4/H1: direction et force
- Structure de marche (HH/HL ou LH/LL)

2. NIVEAUX CLES
- Resistances majeures (prix exact)
- Supports majeurs (prix exact)
- Zone de valeur / POC si pertinent

3. INDICATEURS
- RSI: niveau et divergences
- MACD: signal et histogramme
- EMA 20/50/200: position du prix

4. SETUP DE TRADING
- Biais: LONG / SHORT / NEUTRE
- Zone d'entree optimale
- Stop Loss (prix et pips)
- Take Profit 1 & 2 (prix et R:R)
- Confiance: 1-10

5. INVALIDATION
- Scenario qui annule l'analyse`
        break
        
      case 'fundamental':
        userPrompt = `ANALYSE FONDAMENTALE pour ${symbol}

${marketContext}

Structure ta reponse:

1. CONTEXTE MACRO
- Politique monetaire (Fed, BCE, BoE...)
- Inflation et emploi
- Croissance economique

2. DRIVERS ACTUELS
- Facteurs haussiers
- Facteurs baissiers
- Catalyseurs a venir (dates)

3. POSITIONNEMENT INSTITUTIONNEL
- COT report (si dispo)
- Flux et sentiment
- Saisonnalite

4. EVENEMENTS A SURVEILLER
- Cette semaine
- Ce mois

5. BIAIS FONDAMENTAL
- Court terme (1-5 jours)
- Moyen terme (1-4 semaines)
- Risques majeurs`
        break
        
      case 'sentiment':
        userPrompt = `ANALYSE DU SENTIMENT pour ${symbol}

${marketContext}

Structure ta reponse:

1. SENTIMENT GENERAL
- Fear & Greed actuel
- Positionnement retail vs institutionnel
- Extremes a noter

2. FLOW ANALYSIS
- Volumes anormaux
- Options flow (si pertinent)
- Dark pool activity

3. NEWS IMPACT
- Headlines majeures
- Narratif dominant
- Risques de headline

4. SCORE SENTIMENT
- Score: -100 (extreme fear) a +100 (extreme greed)
- Justification

5. CONTRARIAN VIEW
- Le marche se trompe-t-il?
- Opportunite contrariante?`
        break
        
      default:
        userPrompt = `ANALYSE COMPLETE pour ${symbol}

${marketContext}

VERDICT DU SYSTEME (A RESPECTER ABSOLUMENT):
- Biais: ${overallBias}
- Conviction: ${convictionLevel}/10
- Swing: ${systemSwingBias} (${swingConfidence}%)
- Day: ${systemDayBias} (${dayConfidence}%)

Fournis une analyse Goldman-style qui JUSTIFIE ce verdict:

1. VERDICT (doit correspondre au systeme)
- Biais: ${overallBias}
- Conviction: ${convictionLevel}/10
- Horizon: ${swingConfidence > dayConfidence ? 'swing (quelques jours)' : 'intraday'}

2. TECHNIQUE
- Pourquoi le systeme detecte ce biais
- Niveaux cles (support/resistance)
- Signal actuel

3. FONDAMENTAL
- Driver principal qui soutient le biais ${overallBias}
- Risque macro

4. TRADE IDEA (seulement si conviction >= 5/10)
${convictionLevel >= 5 ? `- Entry zone
- Stop loss
- Target(s)
- R:R ratio` : '- Pas de trade recommande avec une conviction de ' + convictionLevel + '/10\n- Attendre un signal plus clair'}

5. RISQUES
- Ce qui peut invalider le biais ${overallBias}
- Niveau d'invalidation`
    }
    
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1500,
      temperature: 0.7,
    })
    
    return NextResponse.json({
      symbol,
      type: type || 'general',
      analysis: text,
      marketData: priceData ? {
        price: priceData.price,
        change: priceData.changePercent,
        swingBias: priceData.swingBias,
        dayBias: priceData.dayBias,
      } : null,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Erreur analyse IA:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse' },
      { status: 500 }
    )
  }
}
