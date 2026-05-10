// app/api/desk/[pair]/insight/route.ts
// Aperçu IA Groq par paire

import { NextRequest, NextResponse } from 'next/server'
import { getPair } from '@/lib/pairs/config'
import { fetchPairPrice, fetchMacroContext } from '@/lib/pairs/orchestrator'
import Groq from 'groq-sdk'

const cache = new Map<string, { text: string; ts: number }>()
const TTL = 10 * 60 * 1000 // 10 minutes

export async function GET(req: NextRequest, { params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const config = getPair(pair.toUpperCase())
  if (!config) return NextResponse.json({ error: 'Pair not found' }, { status: 404 })

  const hit = cache.get(config.id)
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json({ insight: hit.text, cached: true })
  }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return NextResponse.json({ insight: 'Clé Groq non configurée.', cached: false })
  }

  const [price, macro] = await Promise.all([
    fetchPairPrice(config.id),
    fetchMacroContext(),
  ])

  const priceStr = price
    ? `${price.price.toFixed(config.precision)} (${price.changePercent >= 0 ? '+' : ''}${price.changePercent.toFixed(2)}%)`
    : 'N/A'

  const prompt = `Tu es ORVYN, analyste de marché expert. Fournis une analyse concise en 3-4 phrases pour ${config.displayName} (${config.fullName}).

Données actuelles:
- Prix: ${priceStr}
- Fed Funds Rate: ${macro.fedFundsRate ?? 'N/A'}%
- US 10Y Yield: ${macro.us10y ?? 'N/A'}%
- Real Rates (TIPS 10Y): ${macro.realRate10y ?? 'N/A'}%
- DXY: ${macro.dxy ?? 'N/A'}
- VIX: ${macro.vix ?? 'N/A'}
- CPI: ${macro.cpi ?? 'N/A'}
- Yield Curve 2Y-10Y: ${macro.yieldCurve2y10y ?? 'N/A'}%

Contexte macro clé pour ${config.displayName}:
${config.macroDrivers.map(d => `- ${d.label} (poids ${d.weight > 0 ? '+' : ''}${d.weight})`).join('\n')}

Réponse en français, style professionnel et factuel, 3-4 phrases maximum. Cite les chiffres clés.`

  try {
    const groq = new Groq({ apiKey: groqKey })
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.3,
    })
    const text = completion.choices[0]?.message?.content || 'Analyse indisponible.'
    cache.set(config.id, { text, ts: Date.now() })
    return NextResponse.json({ insight: text, cached: false })
  } catch (err: any) {
    return NextResponse.json({ insight: 'Erreur IA: ' + err.message, cached: false }, { status: 500 })
  }
}
