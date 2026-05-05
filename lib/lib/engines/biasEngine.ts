import { YAHOO_SYMBOLS, TIMEFRAME_CONFIG } from '@/lib/constants'
import { fetchYahooHistorical } from '@/lib/api/yahoo'
import { GoldBias, Timeframe, TimeframeBias } from '@/lib/types'

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }
  return ema
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
  }
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateMACD(prices: number[]): number {
  if (prices.length < 26) return 0
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  return ema12 - ema26
}

function calculateADX(candles: [number, number, number, number, number][], period = 14): number {
  if (candles.length < period + 1) return 20
  const trs: number[] = []
  const plusDMs: number[] = []
  const minusDMs: number[] = []

  for (let i = 1; i < candles.length; i++) {
    const [, , high, low] = candles[i]
    const [, , prevHigh, prevLow, prevClose] = candles[i - 1]
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
    const upMove = high - prevHigh
    const downMove = prevLow - low
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period
  if (atr === 0) return 20

  const plusDI = (plusDMs.slice(-period).reduce((a, b) => a + b, 0) / period / atr) * 100
  const minusDI = (minusDMs.slice(-period).reduce((a, b) => a + b, 0) / period / atr) * 100
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
  return isNaN(dx) ? 20 : dx
}

function detectStructure(candles: [number, number, number, number, number][]): 'HH/HL' | 'LH/LL' | 'RANGE' {
  if (candles.length < 5) return 'RANGE'
  const highs = candles.map(c => c[2])
  const lows = candles.map(c => c[3])
  let hhCount = 0, hlCount = 0, lhCount = 0, llCount = 0
  for (let i = 1; i < highs.length; i++) {
    if (highs[i] > highs[i - 1]) hhCount++
    if (lows[i] > lows[i - 1]) hlCount++
    if (highs[i] < highs[i - 1]) lhCount++
    if (lows[i] < lows[i - 1]) llCount++
  }
  if (hhCount >= 3 && hlCount >= 3) return 'HH/HL'
  if (lhCount >= 3 && llCount >= 3) return 'LH/LL'
  return 'RANGE'
}

function calculateTimeframeBias(
  candles: [number, number, number, number, number][],
  timeframe: Timeframe
): TimeframeBias {
  const config = TIMEFRAME_CONFIG[timeframe]
  const closes = candles.map(c => c[4])

  const emaFast = calculateEMA(closes, config.emaFast)
  const emaSlow = calculateEMA(closes, config.emaSlow)
  const rsi = calculateRSI(closes, config.rsiPeriod)
  const macd = calculateMACD(closes)
  const adx = calculateADX(candles)
  const structure = detectStructure(candles)

  const emaScore = emaFast > emaSlow
    ? (emaFast / emaSlow > 1.005 ? 2 : 1)
    : (emaFast / emaSlow < 0.995 ? -2 : -1)

  const rsiScore = rsi > 60 ? 2 : rsi > 50 ? 1 : rsi < 40 ? -2 : rsi < 50 ? -1 : 0

  const structureScore = structure === 'HH/HL' ? 2 : structure === 'LH/LL' ? -2 : 0

  const macdScore = macd > 0.5 ? 2 : macd > 0 ? 1 : macd < -0.5 ? -2 : -1

  const adxMultiplier = adx > 40 ? 1.3 : adx > 25 ? 1.15 : adx > 20 ? 1.0 : adx > 15 ? 0.85 : 0.7

  const rawScore = (emaScore + rsiScore + structureScore + macdScore) / 8
  const score = Math.max(-1, Math.min(1, rawScore * adxMultiplier)) * config.weight

  return {
    timeframe,
    weight: config.weight,
    indicators: [
      { name: 'EMA', score: emaScore, description: `EMA${config.emaFast} vs EMA${config.emaSlow}` },
      { name: 'RSI', score: rsiScore, description: `RSI ${rsi.toFixed(1)}` },
      { name: 'Structure', score: structureScore, description: structure },
      { name: 'MACD', score: macdScore, description: `Histogram ${macd.toFixed(2)}` },
    ],
    score,
    emaFast,
    emaSlow,
    rsi,
    structure,
    macdHistogram: macd,
    adx,
  }
}

export async function calculateBias(): Promise<GoldBias> {
  const symbol = YAHOO_SYMBOLS.XAUUSD

  const [weekly, daily, h4, h1, m15] = await Promise.all([
    fetchYahooHistorical(symbol, 'WEEKLY'),
    fetchYahooHistorical(symbol, 'DAILY'),
    fetchYahooHistorical(symbol, 'H4'),
    fetchYahooHistorical(symbol, 'H1'),
    fetchYahooHistorical(symbol, 'M15'),
  ])

  const weeklyBias = calculateTimeframeBias(weekly, 'WEEKLY')
  const dailyBias  = calculateTimeframeBias(daily,  'DAILY')
  const h4Bias     = calculateTimeframeBias(h4,     'H4')
  const h1Bias     = calculateTimeframeBias(h1,     'H1')
  const m15Bias    = calculateTimeframeBias(m15,    'M15')

  const swingScore = weeklyBias.score + dailyBias.score + h4Bias.score
  const dayScore   = h4Bias.score + h1Bias.score + m15Bias.score

  return {
    swing: {
      weekly:     weeklyBias,
      daily:      dailyBias,
      h4:         h4Bias,
      score:      swingScore,
      confidence: Math.min(0.95, Math.abs(swingScore) * 1.5),
    },
    day: {
      h4:         h4Bias,
      h1:         h1Bias,
      m15:        m15Bias,
      score:      dayScore,
      confidence: Math.min(0.95, Math.abs(dayScore) * 1.5),
    },
    lastUpdated: Date.now(),
  }
}

export function getBiasLabel(score: number): string {
  if (score >  0.55) return 'Strongly Bullish'
  if (score >  0.25) return 'Bullish'
  if (score >  0.10) return 'Slightly Bullish'
  if (score < -0.55) return 'Strongly Bearish'
  if (score < -0.25) return 'Bearish'
  if (score < -0.10) return 'Slightly Bearish'
  return 'Neutral'
}

export function getBiasConfidence(score: number): number {
  const abs = Math.abs(score)
  if (abs > 0.55) return Math.round(80 + abs * 20)
  if (abs > 0.25) return Math.round(62 + abs * 40)
  if (abs > 0.10) return Math.round(52 + abs * 30)
  return Math.round(45 + abs * 30)
}