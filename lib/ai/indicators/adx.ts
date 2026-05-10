// Calcul de l'ADX (Average Directional Index) — mesure la force de tendance
// ADX > 25 = tendance forte, ADX < 20 = pas de tendance

export interface ADXResult {
  adx: number
  plusDI: number
  minusDI: number
  trend: 'strong_bullish' | 'strong_bearish' | 'weak' | 'ranging'
  description: string
}

export function calcADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): ADXResult | null {
  if (highs.length < period * 2) return null

  const trList: number[] = []
  const plusDMList: number[] = []
  const minusDMList: number[] = []

  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1]
    const lowDiff = lows[i - 1] - lows[i]

    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )

    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0

    trList.push(tr)
    plusDMList.push(plusDM)
    minusDMList.push(minusDM)
  }

  // Wilder smoothing
  const smooth = (arr: number[], p: number): number[] => {
    const result: number[] = [arr.slice(0, p).reduce((a, b) => a + b, 0)]
    for (let i = p; i < arr.length; i++) {
      result.push(result[result.length - 1] - result[result.length - 1] / p + arr[i])
    }
    return result
  }

  const atr = smooth(trList, period)
  const smoothedPlusDM = smooth(plusDMList, period)
  const smoothedMinusDM = smooth(minusDMList, period)

  const dxList: number[] = []
  for (let i = 0; i < atr.length; i++) {
    if (atr[i] === 0) continue
    const plusDI = (smoothedPlusDM[i] / atr[i]) * 100
    const minusDI = (smoothedMinusDM[i] / atr[i]) * 100
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
    dxList.push(dx)
  }

  if (dxList.length < period) return null

  const adxSmoothed = smooth(dxList, period)
  const adx = adxSmoothed[adxSmoothed.length - 1]

  const lastATR = atr[atr.length - 1]
  const lastPlusDI = lastATR > 0 ? (smoothedPlusDM[smoothedPlusDM.length - 1] / lastATR) * 100 : 0
  const lastMinusDI = lastATR > 0 ? (smoothedMinusDM[smoothedMinusDM.length - 1] / lastATR) * 100 : 0

  let trend: ADXResult['trend']
  if (adx >= 25 && lastPlusDI > lastMinusDI) trend = 'strong_bullish'
  else if (adx >= 25 && lastMinusDI > lastPlusDI) trend = 'strong_bearish'
  else if (adx >= 20) trend = 'weak'
  else trend = 'ranging'

  const strength = adx >= 50 ? 'tres forte' : adx >= 25 ? 'forte' : adx >= 20 ? 'moderee' : 'faible (range)'
  const description = `ADX ${adx.toFixed(1)} — tendance ${strength} — +DI: ${lastPlusDI.toFixed(1)} / -DI: ${lastMinusDI.toFixed(1)}`

  return {
    adx: Math.round(adx * 10) / 10,
    plusDI: Math.round(lastPlusDI * 10) / 10,
    minusDI: Math.round(lastMinusDI * 10) / 10,
    trend,
    description,
  }
}
