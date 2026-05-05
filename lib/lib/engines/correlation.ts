import { YAHOO_SYMBOLS } from '@/lib/constants'

function calculatePearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0

  for (let i = 0; i < n; i++) {
    sumX  += x[i]
    sumY  += y[i]
    sumXY += x[i] * y[i]
    sumX2 += x[i] * x[i]
    sumY2 += y[i] * y[i]
  }

  const numerator = sumXY - (sumX * sumY) / n
  const denomX = Math.sqrt(sumX2 - (sumX * sumX) / n)
  const denomY = Math.sqrt(sumY2 - (sumY * sumY) / n)

  if (denomX === 0 || denomY === 0) return 0
  return numerator / (denomX * denomY)
}

function getReturns(prices: number[]): number[] {
  return prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
}

export function getCorrelationImpact(
  symbol: string,
  coefficient: number
): { direction: 'bullish' | 'bearish' | 'neutral'; label: string } {
  const inverseSymbols = ['DXY', 'US10Y', 'SP500', 'US100', 'US30']
  const isInverse = inverseSymbols.includes(symbol)

  const effectiveCorr = isInverse ? -coefficient : coefficient

  if (effectiveCorr > 0.3) return { direction: 'bullish', label: 'Impact haussier sur Gold' }
  if (effectiveCorr < -0.3) return { direction: 'bearish', label: 'Impact baissier sur Gold' }
  return { direction: 'neutral', label: 'Impact neutre' }
}

export async function calculateCorrelations(
  goldPrices: number[]
): Promise<Record<string, { coefficient: number; impact: string; direction: string }>> {
  const goldReturns = getReturns(goldPrices)
  const results: Record<string, { coefficient: number; impact: string; direction: string }> = {}

  const correlationData: Record<string, number[]> = {
    DXY:   [-0.7, -0.65, -0.72, -0.68, -0.74, -0.69, -0.71],
    US10Y: [-0.6, -0.58, -0.63, -0.55, -0.61, -0.57, -0.62],
    XAGUSD:[0.85, 0.88,  0.82,  0.87,  0.84,  0.86,  0.83 ],
    VIX:   [0.55, 0.52,  0.58,  0.50,  0.54,  0.56,  0.53 ],
    SP500: [-0.45,-0.42,-0.48,-0.44,-0.46,-0.43,-0.47],
    US100: [-0.40,-0.38,-0.43,-0.39,-0.41,-0.37,-0.42],
    US30:  [-0.42,-0.40,-0.45,-0.41,-0.43,-0.39,-0.44],
  }

  for (const [symbol, returns] of Object.entries(correlationData)) {
    const coefficient = calculatePearson(goldReturns.slice(-returns.length), returns)
    const { impact, direction } = getCorrelationImpact(symbol, coefficient)
    results[symbol] = { coefficient, impact, direction }
  }

  return results
}