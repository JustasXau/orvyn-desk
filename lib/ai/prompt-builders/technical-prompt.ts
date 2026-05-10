// Prompt pour l'agent "Technical Analyst" (Etape 1 du chain-of-thought)
// Reçoit les donnees techniques brutes et produit un verdict W/D/H4

import type { CollectedData } from '../data-collector'

function formatTimeframe(label: string, tf: CollectedData['weekly'], price: number | null): string {
  if (!tf) return `\n### ${label}\nDonnees insuffisantes pour ce timeframe.\n`

  const p = price ?? tf.bars[tf.bars.length - 1]?.close ?? 0

  return `
### ${label}
**Prix**: ${p.toFixed(2)}
**EMA**: ${tf.ema.description}
**RSI**: ${tf.rsiDescription}
**MACD**: ${tf.macd?.description ?? 'Non disponible'}
**ADX**: ${tf.adx?.description ?? 'Non disponible'}
**Bollinger**: ${tf.bollinger?.description ?? 'Non disponible'}
**Pivots**: ${tf.pivots?.description ?? 'Non disponible'}
**Structure**: ${tf.structure.description}
**ATR**: ${tf.atr ?? 'N/A'} (volatilite absolue)
**Volume ratio**: ${tf.volumeRatio != null ? `${tf.volumeRatio}x la moyenne (${tf.volumeRatio > 1.5 ? 'volume eleve' : tf.volumeRatio < 0.7 ? 'volume faible' : 'volume normal'})` : 'N/A'}
`
}

export function buildTechnicalPrompt(data: CollectedData): string {
  const price = data.currentPrice

  return `Tu es un analyste technique senior specialise en trading institutionnel.
Tu dois analyser les signaux techniques pour ${data.fullName} (${data.symbol}) et produire un verdict structure.

PRIX ACTUEL: ${price ?? 'N/A'} USD
Variation 24h: ${data.priceChangePct24h != null ? `${data.priceChangePct24h > 0 ? '+' : ''}${data.priceChangePct24h.toFixed(2)}%` : 'N/A'}
High 24h: ${data.high24h ?? 'N/A'} | Low 24h: ${data.low24h ?? 'N/A'}
Range 24h: ${data.high24h && data.low24h ? (data.high24h - data.low24h).toFixed(2) : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DONNEES TECHNIQUES PAR TIMEFRAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formatTimeframe('WEEKLY (Swing)', data.weekly, price)}
${formatTimeframe('DAILY (Trend)', data.daily, price)}
${formatTimeframe('H4 (Timing)', data.h4, price)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLES STRICTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. JAMAIS inventer un chiffre non present dans le contexte
2. TOUJOURS citer les valeurs exactes (RSI 62, EMA50 a 3142, etc.)
3. DIFFERENCIER clairement les 3 timeframes — ils peuvent diverger
4. Si les EMAs sont alignees haussier ET RSI momentum fort → conviction >= 7
5. Si les signaux divergent → conviction <= 5 et expliquer le conflit
6. Les niveaux de prix doivent etre COHERENTS avec le prix actuel (${price ?? 'N/A'})
7. R/R minimum 1.5 dans le plan

Reponds UNIQUEMENT avec ce JSON valide, sans texte avant ou apres:
{
  "weekly": {
    "verdict": "Bullish"|"Bearish"|"Neutral",
    "conviction": <0-10>,
    "trend": "<description de la tendance>",
    "keyLevels": {
      "pivot": <nombre>,
      "nearestSupport": <nombre>,
      "nearestResistance": <nombre>,
      "invalidation": <nombre>,
      "target": <nombre>
    },
    "reasoning": ["<raison 1 avec chiffres>", "<raison 2>", "<raison 3>"],
    "technicalSignals": {
      "momentum": "<RSI X, MACD direction>",
      "structure": "<HH/HL ou LH/LL>",
      "volume": "<description volume>"
    }
  },
  "daily": { <meme structure> },
  "h4": { <meme structure> },
  "rawIndicators": {
    "weeklyRSI": <nombre|null>,
    "dailyRSI": <nombre|null>,
    "h4RSI": <nombre|null>,
    "weeklyTrend": "<bullish|bearish|mixed>",
    "dailyTrend": "<bullish|bearish|mixed>",
    "dominantTrend": "<bullish|bearish|mixed>",
    "keySupport": <nombre>,
    "keyResistance": <nombre>
  }
}`
}
