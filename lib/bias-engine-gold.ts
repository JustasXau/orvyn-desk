/**
 * BiasEngine optimisé pour le Gold trading
 * Multi-timeframe avec EMA, RSI, Structure, MACD, ADX
 */

export interface TimeframeData {
  bars: Array<{ open: number; high: number; low: number; close: number; time: number }>
  ema: { fast: number; slow: number }
  rsi: number
  macd: { histogram: number }
  adx: number
  structure: 'HH' | 'HL' | 'LH' | 'LL'
}

export interface BiasResult {
  direction: 'strongly_bullish' | 'bullish' | 'slightly_bullish' | 'neutral' | 'slightly_bearish' | 'bearish' | 'strongly_bearish'
  confidence: number
  score: number
  details: {
    emaScore: number
    rsiScore: number
    structureScore: number
    macdScore: number
    adxMultiplier: number
  }
}

/**
 * Calcule le score EMA: position vs EMA fast/slow
 * Range: -2 à +2
 */
function calculateEMAScore(close: number, emaFast: number, emaSlow: number): number {
  if (!emaFast || !emaSlow || !close) return 0
  
  // Position par rapport aux EMAs
  const aboveSlowEMA = close > emaSlow
  const aboveFastEMA = close > emaFast
  const fastAboveSlow = emaFast > emaSlow
  
  // Bullish: close > ema fast > ema slow
  if (aboveSlowEMA && aboveFastEMA && fastAboveSlow) return 2
  if (aboveSlowEMA && aboveFastEMA) return 1.5
  if (aboveSlowEMA) return 1
  
  // Bearish: close < ema fast < ema slow
  if (!aboveSlowEMA && !aboveFastEMA && !fastAboveSlow) return -2
  if (!aboveSlowEMA && !aboveFastEMA) return -1.5
  if (!aboveSlowEMA) return -1
  
  return 0
}

/**
 * Calcule le score RSI: position vs 50
 * Range: -2 à +2
 */
function calculateRSIScore(rsi: number): number {
  if (!rsi || rsi < 0 || rsi > 100) return 0
  
  if (rsi >= 70) return 2           // Overbought (but bullish momentum)
  if (rsi >= 60) return 1.5
  if (rsi > 50) return 1
  if (rsi === 50) return 0
  if (rsi < 50) return -1
  if (rsi <= 40) return -1.5
  if (rsi <= 30) return -2          // Oversold (but bearish momentum)
  
  return 0
}

/**
 * Calcule le score Structure: HH/HL vs LH/LL
 * Range: -2 à +2
 */
function calculateStructureScore(structure: string): number {
  switch (structure.toUpperCase()) {
    case 'HH': return 2    // Higher High = très bullish
    case 'HL': return -1   // Higher Low suivi de Lower High = consolidation/faiblesse
    case 'LH': return -1.5 // Lower High = très baissier
    case 'LL': return -2   // Lower Low = très baissier
    default: return 0
  }
}

/**
 * Calcule le score MACD: histogramme direction
 * Range: -2 à +2
 */
function calculateMACDScore(histogram: number): number {
  if (!histogram) return 0
  
  if (histogram > 0.002) return 2           // Très positif
  if (histogram > 0.001) return 1.5
  if (histogram > 0) return 1
  if (histogram === 0) return 0
  if (histogram < 0) return -1
  if (histogram < -0.001) return -1.5
  if (histogram < -0.002) return -2        // Très négatif
  
  return 0
}

/**
 * Récupère le multiplicateur ADX
 * Range: 0.7 à 1.3
 */
function getADXMultiplier(adx: number): number {
  if (!adx || adx < 0) return 1
  
  if (adx > 50) return 1.3    // Trend très fort
  if (adx > 40) return 1.2
  if (adx > 30) return 1.1
  if (adx > 20) return 1.05
  if (adx <= 20) return 0.7   // Faible trend
  
  return 1
}

/**
 * Convertit un score numérique en direction avec confiance
 */
function scoreToDirection(score: number): BiasResult['direction'] {
  const absScore = Math.abs(score)
  
  if (score > 0.55) return 'strongly_bullish'
  if (score > 0.25) return 'bullish'
  if (score > 0.10) return 'slightly_bullish'
  if (score >= -0.10 && score <= 0.10) return 'neutral'
  if (score < -0.10) return 'slightly_bearish'
  if (score < -0.25) return 'bearish'
  if (score < -0.55) return 'strongly_bearish'
  
  return 'neutral'
}

/**
 * Convertit une direction en confiance (%)
 */
function getConfidence(direction: BiasResult['direction']): number {
  switch (direction) {
    case 'strongly_bullish':
    case 'strongly_bearish':
      return 80 + Math.random() * 15  // 80-95%
    case 'bullish':
    case 'bearish':
      return 62 + Math.random() * 17  // 62-79%
    case 'slightly_bullish':
    case 'slightly_bearish':
      return 52 + Math.random() * 9   // 52-61%
    case 'neutral':
    default:
      return 45 + Math.random() * 6   // 45-51%
  }
}

/**
 * Calcule le bias pour un timeframe
 */
export function calculateTimeframeBias(timeframeData: TimeframeData): BiasResult {
  const bars = timeframeData.bars
  if (!bars || bars.length === 0) {
    return {
      direction: 'neutral',
      confidence: 50,
      score: 0,
      details: {
        emaScore: 0,
        rsiScore: 0,
        structureScore: 0,
        macdScore: 0,
        adxMultiplier: 1
      }
    }
  }

  const close = bars[bars.length - 1].close
  const emaFast = timeframeData.ema.fast
  const emaSlow = timeframeData.ema.slow

  // Calcule chaque score
  const emaScore = calculateEMAScore(close, emaFast, emaSlow)
  const rsiScore = calculateRSIScore(timeframeData.rsi)
  const structureScore = calculateStructureScore(timeframeData.structure)
  const macdScore = calculateMACDScore(timeframeData.macd.histogram)
  const adxMultiplier = getADXMultiplier(timeframeData.adx)

  // Score total = moyenne pondérée avec ADX multiplicateur
  const baseScore = (emaScore + rsiScore + structureScore + macdScore) / 4
  const score = (baseScore * adxMultiplier) / 2  // Normalize to -1 to +1 range

  const direction = scoreToDirection(score)
  const confidence = Math.round(getConfidence(direction))

  return {
    direction,
    confidence,
    score,
    details: {
      emaScore,
      rsiScore,
      structureScore,
      macdScore,
      adxMultiplier
    }
  }
}

/**
 * Calcule le bias SWING (multi-timeframe)
 * Weekly(52) × 40% + Daily(200) × 35% + H4(90) × 25%
 */
export function calculateSwingBias(
  weekly: TimeframeData,
  daily: TimeframeData,
  h4: TimeframeData
): BiasResult {
  const weeklyBias = calculateTimeframeBias(weekly)
  const dailyBias = calculateTimeframeBias(daily)
  const h4Bias = calculateTimeframeBias(h4)

  // Scores pondérés
  const weeklyWeight = weeklyBias.score * 0.4
  const dailyWeight = dailyBias.score * 0.35
  const h4Weight = h4Bias.score * 0.25

  const compositeScore = weeklyWeight + dailyWeight + h4Weight

  const direction = scoreToDirection(compositeScore)
  const confidence = Math.round(getConfidence(direction))

  return {
    direction,
    confidence,
    score: compositeScore,
    details: {
      emaScore: weeklyBias.details.emaScore,
      rsiScore: dailyBias.details.rsiScore,
      structureScore: h4Bias.details.structureScore,
      macdScore: (weeklyBias.details.macdScore + dailyBias.details.macdScore + h4Bias.details.macdScore) / 3,
      adxMultiplier: (weeklyBias.details.adxMultiplier + dailyBias.details.adxMultiplier + h4Bias.details.adxMultiplier) / 3
    }
  }
}

/**
 * Calcule le bias DAY (multi-timeframe)
 * H4(30) × 35% + H1(48) × 40% + M15(96) × 25%
 */
export function calculateDayBias(
  h4: TimeframeData,
  h1: TimeframeData,
  m15: TimeframeData
): BiasResult {
  const h4Bias = calculateTimeframeBias(h4)
  const h1Bias = calculateTimeframeBias(h1)
  const m15Bias = calculateTimeframeBias(m15)

  // Scores pondérés
  const h4Weight = h4Bias.score * 0.35
  const h1Weight = h1Bias.score * 0.4
  const m15Weight = m15Bias.score * 0.25

  const compositeScore = h4Weight + h1Weight + m15Weight

  const direction = scoreToDirection(compositeScore)
  const confidence = Math.round(getConfidence(direction))

  return {
    direction,
    confidence,
    score: compositeScore,
    details: {
      emaScore: (h4Bias.details.emaScore + h1Bias.details.emaScore + m15Bias.details.emaScore) / 3,
      rsiScore: (h4Bias.details.rsiScore + h1Bias.details.rsiScore + m15Bias.details.rsiScore) / 3,
      structureScore: (h4Bias.details.structureScore + h1Bias.details.structureScore + m15Bias.details.structureScore) / 3,
      macdScore: (h4Bias.details.macdScore + h1Bias.details.macdScore + m15Bias.details.macdScore) / 3,
      adxMultiplier: (h4Bias.details.adxMultiplier + h1Bias.details.adxMultiplier + m15Bias.details.adxMultiplier) / 3
    }
  }
}
