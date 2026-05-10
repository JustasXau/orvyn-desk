/**
 * Pearson Correlation Calculator for market correlations
 * Calculates real-time correlations between XAU/USD and other assets
 */

export interface CorrelationPair {
  symbol: string
  correlation: number // 0-100 score
  color: 'green' | 'orange' | 'red'
  relationship: 'direct' | 'inverse'
}

/**
 * Calculate Pearson correlation coefficient
 * Returns -1 to 1, where:
 * 1 = perfect positive correlation
 * -1 = perfect negative correlation
 * 0 = no correlation
 */
function calculatePearson(series1: number[], series2: number[]): number {
  if (series1.length < 2 || series2.length < 2 || series1.length !== series2.length) {
    return 0
  }

  const n = series1.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0

  for (let i = 0; i < n; i++) {
    sumX += series1[i]
    sumY += series2[i]
    sumXY += series1[i] * series2[i]
    sumX2 += series1[i] ** 2
    sumY2 += series2[i] ** 2
  }

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))

  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Convert Pearson coefficient to 0-100 score with color
 */
function scoreToColor(score: number): 'green' | 'orange' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'orange'
  return 'red'
}

/**
 * Calculate XAU/USD correlations with specific assets
 * Each asset has specific relationship logic
 */
export function calculateXAUCorrelations(
  xauPrices: number[],
  dxyPrices: number[],
  xagPrices: number[],
  vixPrices: number[]
): CorrelationPair[] {
  // DXY: Inverse correlation (when DXY rises, Gold falls)
  const dxyPearson = calculatePearson(xauPrices, dxyPrices)
  const dxyScore = Math.abs(dxyPearson) * 100 // Absolute value because it's inverse
  
  // XAG: Direct correlation (both move together)
  const xagPearson = calculatePearson(xauPrices, xagPrices)
  const xagScore = Math.max(0, xagPearson * 100) // Only positive correlation counts
  
  // VIX: Direct correlation (risk-on/off sentiment)
  const vixPearson = calculatePearson(xauPrices, vixPrices)
  const vixScore = Math.max(0, vixPearson * 100) // Only positive correlation counts

  return [
    {
      symbol: 'DXY',
      correlation: Math.round(dxyScore),
      color: scoreToColor(Math.round(dxyScore)),
      relationship: 'inverse'
    },
    {
      symbol: 'XAG/USD',
      correlation: Math.round(xagScore),
      color: scoreToColor(Math.round(xagScore)),
      relationship: 'direct'
    },
    {
      symbol: 'VIX',
      correlation: Math.round(vixScore),
      color: scoreToColor(Math.round(vixScore)),
      relationship: 'direct'
    }
  ]
}

/**
 * Extract last N prices from OHLC data
 */
export function extractPrices(ohlcData: Array<{ close: number }>, count: number = 20): number[] {
  return ohlcData
    .slice(-count)
    .map(bar => bar.close)
}
