import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { analysisApiLimiter, checkRateLimit } from '@/lib/rate-limit'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = await checkRateLimit(request, analysisApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }

  try {
    const { event } = await request.json()
    
    if (!event) {
      return NextResponse.json({ error: 'Event required' }, { status: 400 })
    }

    const { title, country, currency, actual, forecast, previous, impact, category, date, time } = event

    const systemPrompt = `Tu es un analyste macro senior chez Goldman Sachs, specialise dans l'analyse des evenements economiques et leur impact sur les marches financiers.

Ton role est d'analyser les publications economiques et de fournir:
1. Une interpretation claire du resultat
2. L'impact attendu sur la devise concernee
3. Les implications pour les marches (forex, indices, matieres premieres)
4. Une recommandation directionnelle

Langue: Francais
Style: Professionnel, concis, actionnable`

    const actualNum = actual !== null ? parseFloat(String(actual).replace(/[^0-9.-]/g, '')) : null
    const forecastNum = forecast !== null ? parseFloat(String(forecast).replace(/[^0-9.-]/g, '')) : null
    const surprisePct = actualNum !== null && forecastNum !== null && forecastNum !== 0
      ? ((actualNum - forecastNum) / Math.abs(forecastNum) * 100).toFixed(1)
      : null

    const userPrompt = `Evenement: ${title}
Precedent: ${previous ?? 'N/A'}
Prevision: ${forecast ?? 'N/A'}
Reel: ${actual ?? 'Non publie'}
Devise: ${currency}
${surprisePct ? `Ecart vs prevision: ${Number(surprisePct) > 0 ? '+' : ''}${surprisePct}%` : ''}

Impact attendu sur XAU/USD : explique en 3 phrases pourquoi ce chiffre va faire monter ou baisser le gold.
- Phrase 1 : Interpretation du chiffre (surprenant, conforme, decevant ?)
- Phrase 2 : Mecanisme de transmission vers XAU/USD (via USD, taux reels, risk sentiment)
- Phrase 3 : Biais directionnel clair pour XAU/USD (haussier / baissier / neutre) avec niveau cle a surveiller si pertinent

Reponds en francais, sois direct et actionnable.`

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 300,
      temperature: 0.3,
    })

    return NextResponse.json({ 
      analysis: text,
      model: 'groq/llama-3.3-70b',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Calendar analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
