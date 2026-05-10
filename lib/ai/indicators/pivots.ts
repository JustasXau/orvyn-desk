// Calcul des niveaux pivots standard (PP, S1-S3, R1-R3)
// Base sur le High, Low, Close de la derniere periode

export interface PivotLevels {
  pp: number    // Pivot Point
  r1: number    // Resistance 1
  r2: number    // Resistance 2
  r3: number    // Resistance 3
  s1: number    // Support 1
  s2: number    // Support 2
  s3: number    // Support 3
  nearestSupport: number
  nearestResistance: number
  description: string
}

export function calcPivots(
  high: number,
  low: number,
  close: number,
  currentPrice: number
): PivotLevels {
  const pp = (high + low + close) / 3
  const r1 = 2 * pp - low
  const r2 = pp + (high - low)
  const r3 = high + 2 * (pp - low)
  const s1 = 2 * pp - high
  const s2 = pp - (high - low)
  const s3 = low - 2 * (high - pp)

  // Trouver le support et resistance les plus proches du prix actuel
  const supports = [s1, s2, s3].filter(s => s < currentPrice).sort((a, b) => b - a)
  const resistances = [r1, r2, r3].filter(r => r > currentPrice).sort((a, b) => a - b)

  const nearestSupport = supports[0] ?? s3
  const nearestResistance = resistances[0] ?? r3

  const description = `Pivots: PP ${pp.toFixed(2)}, S1 ${s1.toFixed(2)}, R1 ${r1.toFixed(2)} — support immediat: ${nearestSupport.toFixed(2)}, resistance: ${nearestResistance.toFixed(2)}`

  return {
    pp: Math.round(pp * 100) / 100,
    r1: Math.round(r1 * 100) / 100,
    r2: Math.round(r2 * 100) / 100,
    r3: Math.round(r3 * 100) / 100,
    s1: Math.round(s1 * 100) / 100,
    s2: Math.round(s2 * 100) / 100,
    s3: Math.round(s3 * 100) / 100,
    nearestSupport,
    nearestResistance,
    description,
  }
}

// Detecte la structure de prix (Higher Highs / Lower Lows)
export function detectStructure(closes: number[], period = 20): {
  trend: 'uptrend' | 'downtrend' | 'sideways'
  description: string
} {
  if (closes.length < period) {
    return { trend: 'sideways', description: 'Historique insuffisant' }
  }

  const recent = closes.slice(-period)
  const highs: number[] = []
  const lows: number[] = []

  // Trouver les points pivots locaux
  for (let i = 2; i < recent.length - 2; i++) {
    if (recent[i] > recent[i-1] && recent[i] > recent[i+1] &&
        recent[i] > recent[i-2] && recent[i] > recent[i+2]) {
      highs.push(recent[i])
    }
    if (recent[i] < recent[i-1] && recent[i] < recent[i+1] &&
        recent[i] < recent[i-2] && recent[i] < recent[i+2]) {
      lows.push(recent[i])
    }
  }

  if (highs.length >= 2 && lows.length >= 2) {
    const higherHighs = highs[highs.length - 1] > highs[highs.length - 2]
    const higherLows = lows[lows.length - 1] > lows[lows.length - 2]
    const lowerHighs = highs[highs.length - 1] < highs[highs.length - 2]
    const lowerLows = lows[lows.length - 1] < lows[lows.length - 2]

    if (higherHighs && higherLows) {
      return { trend: 'uptrend', description: 'Structure haussiere: Higher Highs + Higher Lows confirmee' }
    }
    if (lowerHighs && lowerLows) {
      return { trend: 'downtrend', description: 'Structure baissiere: Lower Highs + Lower Lows confirmee' }
    }
  }

  return { trend: 'sideways', description: 'Structure laterale — pas de tendance claire' }
}
