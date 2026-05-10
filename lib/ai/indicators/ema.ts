// Calcul des Moyennes Mobiles Exponentielles (EMA)

export function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return []
  const k = 2 / (period + 1)
  const result: number[] = []
  // Premiere EMA = SMA des 'period' premieres valeurs
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(ema)
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    result.push(ema)
  }
  return result
}

export function getLatestEMA(closes: number[], period: number): number | null {
  const emas = calcEMA(closes, period)
  return emas.length > 0 ? emas[emas.length - 1] : null
}

export interface EMABundle {
  ema20: number | null
  ema50: number | null
  ema200: number | null
  trend: 'bullish' | 'bearish' | 'mixed'
  description: string
}

export function calcEMABundle(closes: number[]): EMABundle {
  const ema20 = getLatestEMA(closes, 20)
  const ema50 = getLatestEMA(closes, 50)
  const ema200 = getLatestEMA(closes, 200)
  const price = closes[closes.length - 1]

  let trend: 'bullish' | 'bearish' | 'mixed' = 'mixed'
  let description = ''

  if (ema20 && ema50 && ema200) {
    if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
      trend = 'bullish'
      description = `Prix(${price.toFixed(2)}) > EMA20(${ema20.toFixed(2)}) > EMA50(${ema50.toFixed(2)}) > EMA200(${ema200.toFixed(2)}) — alignement haussier parfait`
    } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
      trend = 'bearish'
      description = `Prix(${price.toFixed(2)}) < EMA20(${ema20.toFixed(2)}) < EMA50(${ema50.toFixed(2)}) < EMA200(${ema200.toFixed(2)}) — alignement baissier parfait`
    } else {
      description = `EMA20: ${ema20.toFixed(2)}, EMA50: ${ema50.toFixed(2)}, EMA200: ${ema200.toFixed(2)} — structure mixte`
    }
  } else if (ema20 && ema50) {
    trend = price > ema20 && ema20 > ema50 ? 'bullish' : price < ema20 && ema20 < ema50 ? 'bearish' : 'mixed'
    description = `EMA20: ${ema20?.toFixed(2)}, EMA50: ${ema50?.toFixed(2)} — EMA200 insuffisante`
  } else {
    description = 'Historique insuffisant pour calcul EMA'
  }

  return { ema20, ema50, ema200, trend, description }
}
