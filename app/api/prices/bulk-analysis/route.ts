import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import Groq from 'groq-sdk'
import { CACHE_TTL } from '@/lib/constants'
import { getBiasLabel } from '@/lib/engines/biasEngine'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const dynamic = 'force-dynamic'

function fallbackAnalysis(gold: any, bias: any): string {
  const swingDir = getBiasLabel(bias?.swing?.score ?? 0)
  const dayDir   = getBiasLabel(bias?.day?.score ?? 0)
  const change   = gold?.changePct ?? 0
  const dir      = change >= 0 ? 'hausse' : 'baisse'
  return `Gold en ${dir} de ${Math.abs(change).toFixed(2)}% à ${gold?.price ?? 0}. Bias swing ${swingDir}, day ${dayDir} — analyse IA temporairement indisponible.`
}

export async function POST(request: Request) {
  try {
    const cacheKey = 'gold_bulk_analysis'
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const { prices, bias, news } = await request.json()
    const gold = prices?.XAUUSD

    if (!gold || !bias) {
      return NextResponse.json(
        { analysis: fallbackAnalysis(gold, bias) }
      )
    }

    const topNews = (news ?? [])
      .slice(0, 3)
      .map((n: any) => n.title)
      .join(' | ')

    const prompt = `
Tu es un analyste gold senior spécialisé XAU/USD. Réponds en français en 2 phrases maximum.

Données actuelles :
- Prix : ${gold.price} USD (${gold.changePct >= 0 ? '+' : ''}${gold.changePct?.toFixed(2)}%)
- Bias Swing : ${getBiasLabel(bias.swing?.score ?? 0)}
- Bias Day : ${getBiasLabel(bias.day?.score ?? 0)}
- DXY : ${prices?.DXY?.changePct?.toFixed(2)}%
- US10Y : ${prices?.US10Y?.price}
- News : ${topNews || 'Aucune news récente'}

Règles :
1. Mentionne le catalyseur principal
2. Conclus par l'implication pour le trader
3. 2 phrases max, factuel et direct
`

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 120,
      })

      const analysis = completion.choices[0].message.content ?? fallbackAnalysis(gold, bias)
      const result = { analysis }

      await redis.set(cacheKey, result, { ex: CACHE_TTL.ANALYSIS })
      return NextResponse.json(result)

    } catch (groqError) {
      console.error('[BULK-ANALYSIS] Groq error:', groqError)
      return NextResponse.json({ analysis: fallbackAnalysis(gold, bias) })
    }

  } catch (error) {
    console.error('[BULK-ANALYSIS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}