// Calcul des Bandes de Bollinger (BB)
// Parametres standards: periode 20, ecart-type 2

export interface BollingerResult {
  upper: number
  middle: number
  lower: number
  bandwidth: number       // (upper - lower) / middle * 100
  percentB: number        // Position du prix dans les bandes (0-100)
  position: 'above_upper' | 'near_upper' | 'middle' | 'near_lower' | 'below_lower'
  squeeze: boolean        // Compression des bandes (breakout imminent)
  description: string
}

export function calcBollinger(closes: number[], period = 20, stdDev = 2): BollingerResult | null {
  if (closes.length < period) return null

  const slice = closes.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / period
  const std = Math.sqrt(variance)

  const upper = mean + stdDev * std
  const lower = mean - stdDev * std
  const price = closes[closes.length - 1]

  const bandwidth = ((upper - lower) / mean) * 100
  const percentB = ((price - lower) / (upper - lower)) * 100

  let position: BollingerResult['position']
  if (price > upper) position = 'above_upper'
  else if (price > mean + std) position = 'near_upper'
  else if (price < lower) position = 'below_lower'
  else if (price < mean - std) position = 'near_lower'
  else position = 'middle'

  // Compression = bandwidth < 5% (contextes de breakout potentiel)
  const squeeze = bandwidth < 5

  const posDesc = {
    above_upper: 'au-dessus de la bande superieure (surachat extreme)',
    near_upper: 'proche bande superieure',
    middle: 'milieu des bandes (equilibre)',
    near_lower: 'proche bande inferieure',
    below_lower: 'en-dessous de la bande inferieure (survente extreme)',
  }[position]

  const description = `BB(${period}): Upper ${upper.toFixed(2)}, Middle ${mean.toFixed(2)}, Lower ${lower.toFixed(2)} — prix ${posDesc}${squeeze ? ' — SQUEEZE detecte' : ''}`

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(mean * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    percentB: Math.round(percentB * 10) / 10,
    position,
    squeeze,
    description,
  }
}
