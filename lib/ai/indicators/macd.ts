// Calcul du MACD (Moving Average Convergence Divergence)
// Parametres standards: EMA12, EMA26, Signal EMA9

import { calcEMA } from './ema'

export interface MACDResult {
  macdLine: number
  signalLine: number
  histogram: number
  trend: 'bullish' | 'bearish'
  description: string
}

export function calcMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult | null {
  if (closes.length < slowPeriod + signalPeriod) return null

  const emaFast = calcEMA(closes, fastPeriod)
  const emaSlow = calcEMA(closes, slowPeriod)

  // Aligner les deux series (emaSlow est plus courte)
  const offset = emaFast.length - emaSlow.length
  const macdLine: number[] = []

  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i])
  }

  if (macdLine.length < signalPeriod) return null

  const signalEMA = calcEMA(macdLine, signalPeriod)
  if (signalEMA.length === 0) return null

  const lastMACD = macdLine[macdLine.length - 1]
  const lastSignal = signalEMA[signalEMA.length - 1]
  const histogram = lastMACD - lastSignal

  const trend = lastMACD > lastSignal ? 'bullish' : 'bearish'
  const aboveZero = lastMACD > 0 ? 'au-dessus de zero' : 'en-dessous de zero'
  const histDir = histogram > 0 ? 'croissant (momentum +)' : 'decroissant (momentum -)'

  const description = `MACD(${lastMACD.toFixed(4)}) ${trend === 'bullish' ? '>' : '<'} Signal(${lastSignal.toFixed(4)}) — ${aboveZero} — histogramme ${histDir}`

  return {
    macdLine: Math.round(lastMACD * 10000) / 10000,
    signalLine: Math.round(lastSignal * 10000) / 10000,
    histogram: Math.round(histogram * 10000) / 10000,
    trend,
    description,
  }
}
