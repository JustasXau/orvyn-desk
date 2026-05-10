import { fetchSwingTimeframes, fetchDayTimeframes, calculateEMA, calculateRSI, calculateMACD, detectStructure } from './ohlc-fetcher'

interface TimeframeScore {
  score: number // -1 to +1
  weight: number
  indicators: {
    ema: number
    rsi: number
    structure: number
    macd: number
    adx: number
  }
}

interface BiasResult {
  symbol: string
  swing: {
    direction: string
    score: number
    confidence: number
    label: string
    timeframes: Record<string, TimeframeScore>
  }
  day: {
    direction: string
    score: number
    confidence: number
    label: string
    timeframes: Record<string, TimeframeScore>
  }
  confidence: number
  lastUpdated: string
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX 1 & 3: ADX Calculation (replaces volatility %)
// ═══════════════════════════════════════════════════════════════════════════

function calculateTrueRange(bars: any[]): number[] {
  const tr: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      tr.push(bars[i].high - bars[i].low)
    } else {
      tr.push(Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      ))
    }
  }
  return tr
}

function calculateADX(bars: any[], period: number = 14): number {
  if (bars.length < period + 1) return 20 // Default neutral ADX
  
  const tr = calculateTrueRange(bars)
  const atr = tr.slice(-period).reduce((a, b) => a + b, 0) / period
  
  if (atr === 0) return 0
  
  // +DM and -DM
  const plusDM: number[] = []
  const minusDM: number[] = []
  
  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i].high - bars[i - 1].high
    const downMove = bars[i - 1].low - bars[i].low
    
    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove)
      minusDM.push(0)
    } else if (downMove > upMove && downMove > 0) {
      plusDM.push(0)
      minusDM.push(downMove)
    } else {
      plusDM.push(0)
      minusDM.push(0)
    }
  }
  
  // Smooth DM
  const avgPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0) / period
  const avgMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0) / period
  
  // DI
  const plusDI = (avgPlusDM / atr) * 100
  const minusDI = (avgMinusDM / atr) * 100
  const di = Math.abs(plusDI - minusDI)
  const didm = plusDI + minusDI
  
  // ADX
  const dx = didm > 0 ? (di / didm) * 100 : 0
  return Math.min(100, dx)
}

function getADXMultiplier(adx: number): number {
  if (adx > 50) return 0.9   // Potential exhaustion - reduce conviction
  if (adx > 35) return 1.2   // Strong trend
  if (adx > 25) return 1.1   // Moderate trend
  if (adx > 20) return 1.0   // Developing trend
  if (adx > 15) return 0.85  // Weak trend
  return 0.7                  // Range / no trend
}

// ═══════════════════════════════════════════════════════════════════════════
// Adaptive indicator periods based on timeframe and bar count
// Short timeframes (H4, H1, M15) need shorter EMA periods
// ═══════════════════════════════════════════════════════════════════════════

function getIndicatorPeriods(timeframe: string, barCount: number): {
  emaFast: number
  emaSlow: number
  rsi: number
  macdFast: number
  macdSlow: number
  macdSignal: number
} {
  // For intraday H4 with only 30 bars: use very short periods
  if ((timeframe === 'h4' || timeframe === 'H4') && barCount <= 40) {
    return {
      emaFast: 9,
      emaSlow: 20,
      rsi: 9,
      macdFast: 8,
      macdSlow: 17,
      macdSignal: 6
    }
  }
  
  // For H1 (48 bars)
  if ((timeframe === 'h1' || timeframe === 'H1') && barCount <= 60) {
    return {
      emaFast: 9,
      emaSlow: 21,
      rsi: 9,
      macdFast: 8,
      macdSlow: 17,
      macdSignal: 6
    }
  }
  
  // For M15 (96 bars)
  if ((timeframe === 'm15' || timeframe === 'M15') && barCount <= 120) {
    return {
      emaFast: 8,
      emaSlow: 21,
      rsi: 7,
      macdFast: 6,
      macdSlow: 13,
      macdSignal: 5
    }
  }
  
  // For longer timeframes (Weekly, Daily): standard periods
  return {
    emaFast: 50,
    emaSlow: 200,
    rsi: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Calculate indicator contribution on a single timeframe with adaptive periods
// Max score now = 8 (EMA:2 + RSI:2 + Structure:2 + MACD:2)
// ═══════════════════════════════════════════════════════════════════════════

function calculateTimeframeScore(bars: any[], timeframe: string = 'daily'): number {
  if (!bars || bars.length < 5) {
    return 0
  }

  const barCount = bars.length
  const periods = getIndicatorPeriods(timeframe, barCount)
  
  let emaScore = 0
  let rsiScore = 0
  let structureScore = 0
  let macdScore = 0

  const closes = bars.map(b => b.close)
  const currentPrice = closes[closes.length - 1]

  // 1. EMA Position: Price vs EMA (fast) and EMA (slow) (+2 à -2)
  // Adapted periods for short timeframes
  const emaFast = calculateEMA(closes, periods.emaFast)
  const emaSlow = calculateEMA(closes, periods.emaSlow)
  const emaFastVal = emaFast[emaFast.length - 1] || currentPrice
  const emaSlowVal = emaSlow[emaSlow.length - 1] || currentPrice

  if (currentPrice > emaFastVal && currentPrice > emaSlowVal) {
    emaScore = 2 // Above both
  } else if (currentPrice > Math.min(emaFastVal, emaSlowVal) && currentPrice < Math.max(emaFastVal, emaSlowVal)) {
    emaScore = emaFastVal > emaSlowVal ? 1 : -1
  } else {
    emaScore = -2 // Below both
  }

  // 2. RSI with adaptive period (+2 à -2)
  const rsi = calculateRSI(closes, periods.rsi)
  if (rsi > 60) rsiScore = 2
  else if (rsi >= 50) rsiScore = 1
  else if (rsi <= 40) rsiScore = -2
  else rsiScore = -1

  // 3. Market Structure: +2 to -2
  const structure = detectStructure(bars)
  if (structure.pattern === 'HH' && structure.strength > 0.5) {
    structureScore = 2
  } else if (structure.pattern === 'HH') {
    structureScore = 1
  } else if (structure.pattern === 'LL' && structure.strength > 0.5) {
    structureScore = -2
  } else if (structure.pattern === 'LL') {
    structureScore = -1
  }

  // 4. MACD with adaptive periods: +2 to -2
  const macd = calculateMACD(closes, periods.macdFast, periods.macdSlow, periods.macdSignal)
  const prevMACD = closes.length >= 2 ? calculateMACD(closes.slice(0, -1), periods.macdFast, periods.macdSlow, periods.macdSignal) : macd
  const histogramTrend = macd.histogram - (prevMACD.histogram || 0)

  if (macd.histogram > 0 && macd.histogram > macd.signal && histogramTrend > 0) {
    macdScore = 2
  } else if (macd.histogram > 0) {
    macdScore = 1
  } else if (macd.histogram < 0 && histogramTrend < 0) {
    macdScore = -2
  } else if (macd.histogram < 0) {
    macdScore = -1
  }

  // Raw score before ADX
  const rawScore = emaScore + rsiScore + structureScore + macdScore
  
  // 5. ADX Multiplier with adaptive period
  const adxPeriod = timeframe.match(/weekly|daily/i) ? 14 : 9 // Shorter ADX for intraday
  const adx = calculateADX(bars, adxPeriod)
  const adxMultiplier = getADXMultiplier(adx)

  // Correct normalization: max raw = 8, apply multiplier then normalize to -1..+1
  const normalizedScore = (rawScore / 8) * adxMultiplier
  const finalScore = Math.max(-1, Math.min(1, normalizedScore))

  return finalScore
}

// Calculate volatility (ATR-like)
function calculateVolatility(closes: number[], period: number): number {
  if (closes.length < period) return 0
  const recentPrices = closes.slice(-period)
  const avg = recentPrices.reduce((a, b) => a + b) / period
  const variance = recentPrices.reduce((sum, p) => sum + Math.pow((p - avg), 2), 0) / period
  return Math.sqrt(variance) / avg
}

// Calculate weighted score
function calculateWeightedScore(timeframeScores: Record<string, any>, weights: Record<string, number>): number {
  let totalWeight = 0
  let weightedScore = 0

  for (const [tf, score] of Object.entries(timeframeScores)) {
    if (score === undefined || score === null) continue
    const weight = weights[tf] || 0
    if (weight === 0) continue
    weightedScore += (score as number) * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return weightedScore / totalWeight
}

// ═══════════════════════════════════════��═══════════════════════════════════
// FIX 4: Convert score to direction and confidence (resserrer la zone Neutral)
// ═══════════════════════════════════════════════════════════════════════════

function scoreToDirection(score: number): { direction: string; label: string; confidence: number } {
  let direction: string
  let confidence: number

  // FIXED: Narrower Neutral zone + add "Slightly" variants
  if (score > 0.55) {
    direction = 'Strongly Bullish'
    confidence = 80 + Math.min(15, (score - 0.55) * 100)
  } else if (score > 0.25) {
    direction = 'Bullish'
    confidence = 62 + Math.min(18, (score - 0.25) * 60)
  } else if (score >= 0.10) {
    direction = 'Slightly Bullish'
    confidence = 52 + Math.round((score - 0.10) * 90)
  } else if (score >= -0.10) {
    direction = 'Neutral'
    confidence = 45 + Math.round(Math.abs(score) * 60) // 45-51%
  } else if (score >= -0.25) {
    direction = 'Slightly Bearish'
    confidence = 52 + Math.round(Math.abs(score - (-0.25)) * 90)
  } else if (score >= -0.55) {
    direction = 'Bearish'
    confidence = 62 + Math.min(18, (Math.abs(score) - 0.25) * 60)
  } else {
    direction = 'Strongly Bearish'
    confidence = 80 + Math.min(15, (Math.abs(score) - 0.55) * 100)
  }

  return {
    direction,
    label: direction,
    confidence: Math.min(95, Math.max(45, Math.round(confidence)))
  }
}

/**
 * Validate that OHLC bars are from today's trading session
 * Prevents stale H1/M15 data from previous day affecting Day bias
 */
function isDataFromToday(bars: any[]): boolean {
  if (!bars || bars.length === 0) return false
  
  const lastBar = bars[bars.length - 1]
  if (!lastBar.time) return false
  
  // Convert timestamp (Unix seconds) to date
  const lastBarDate = new Date(lastBar.time * 1000).toDateString()
  const today = new Date().toDateString()
  
  const isToday = lastBarDate === today
  return isToday
}

/**
 * Helper: Safely convert timestamp to ISO string
 */
function safeTimestampToISO(time: any): string {
  if (!time || typeof time !== 'number') return 'N/A'
  try {
    const date = new Date(time * 1000)
    if (isNaN(date.getTime())) return 'Invalid'
    return date.toISOString()
  } catch {
    return 'Error'
  }
}

/**
 * Helper: Log timeframe validation results
 */
function validateTimeframeData(symbol: string, dayBars: any): void {
  try {
    const h4Fresh = isDataFromToday(dayBars.h4)
    const h1Fresh = isDataFromToday(dayBars.h1)
    const m15Fresh = isDataFromToday(dayBars.m15)
    
    if (!h1Fresh || !m15Fresh) {
      const lastH1 = dayBars.h1?.[dayBars.h1.length - 1]
      const lastM15 = dayBars.m15?.[dayBars.m15.length - 1]
      
      console.warn(`[BiasEngine] ${symbol} - STALE DATA DETECTED:`, {
        h4: { count: dayBars.h4?.length || 0, fresh: h4Fresh },
        h1: { count: dayBars.h1?.length || 0, fresh: h1Fresh },
        m15: { count: dayBars.m15?.length || 0, fresh: m15Fresh },
        lastH1Time: lastH1 ? safeTimestampToISO(lastH1.time) : 'N/A',
        lastM15Time: lastM15 ? safeTimestampToISO(lastM15.time) : 'N/A',
      })
    }
  } catch (error) {
    console.warn(`[BiasEngine] ${symbol} - validateTimeframeData error:`, error)
  }
}

// Main calculation function
export async function calculateBias(symbol: string): Promise<BiasResult> {
  try {
    // Fetch all timeframes in parallel - pass ORVYN symbol (not yahooSymbol)
    const [swingBars, dayBars] = await Promise.all([
      fetchSwingTimeframes(symbol),
      fetchDayTimeframes(symbol)
    ])

    // FIX 2: Validate Day timeframes are fresh (not from previous session)
    validateTimeframeData(symbol, dayBars)

    // Validate we have minimum data
    if (!swingBars.daily || swingBars.daily.length < 5) {
      throw new Error(`Insufficient data for ${symbol}: Daily has ${swingBars.daily?.length ?? 0} bars (need 5+)`)
    }

    // Calculate SWING scores with adaptive periods
    const swingScores = {
      weekly: calculateTimeframeScore(swingBars.weekly, 'weekly'),
      daily: calculateTimeframeScore(swingBars.daily, 'daily'),
      h4: calculateTimeframeScore(swingBars.h4, 'h4')
    }

    const swingWeights = { weekly: 0.25, daily: 0.45, h4: 0.30 } // Daily dominant for 2-4 week swing
    const swingScore = calculateWeightedScore(swingScores, swingWeights)
    const swingDirection = scoreToDirection(swingScore)

    // Calculate DAY scores with adaptive periods
    const dayScores = {
      h4: calculateTimeframeScore(dayBars.h4, 'h4'),
      h1: calculateTimeframeScore(dayBars.h1, 'h1'),
      m15: calculateTimeframeScore(dayBars.m15, 'm15')
    }

    const dayWeights = { h4: 0.25, h1: 0.35, m15: 0.40 } // M15 dominant for day trading
    const dayScore = calculateWeightedScore(dayScores, dayWeights)
    const dayDirection = scoreToDirection(dayScore)

    // Average confidence
    const avgConfidence = Math.round((swingDirection.confidence + dayDirection.confidence) / 2)

    return {
      symbol,
      swing: {
        direction: swingDirection.direction,
        score: swingScore,
        confidence: swingDirection.confidence,
        label: swingDirection.label,
        timeframes: {
          weekly: { score: swingScores.weekly, weight: 0.40, indicators: {} as any },
          daily: { score: swingScores.daily, weight: 0.35, indicators: {} as any },
          h4: { score: swingScores.h4, weight: 0.25, indicators: {} as any }
        }
      },
      day: {
        direction: dayDirection.direction,
        score: dayScore,
        confidence: dayDirection.confidence,
        label: dayDirection.label,
        timeframes: {
          h4: { score: dayScores.h4, weight: 0.35, indicators: {} as any },
          h1: { score: dayScores.h1, weight: 0.40, indicators: {} as any },
          m15: { score: dayScores.m15, weight: 0.25, indicators: {} as any }
        }
      },
      confidence: avgConfidence,
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error(`[BiasEngine] Error calculating bias for ${symbol}:`, error)
    // Return neutral default
    return {
      symbol,
      swing: {
        direction: 'Neutral',
        score: 0,
        confidence: 50,
        label: 'Neutral',
        timeframes: {}
      },
      day: {
        direction: 'Neutral',
        score: 0,
        confidence: 50,
        label: 'Neutral',
        timeframes: {}
      },
      confidence: 50,
      lastUpdated: new Date().toISOString()
    }
  }
}

// Calculate all assets simultaneously
export async function calculateAllBiases(symbols: string[]): Promise<BiasResult[]> {
  return Promise.all(symbols.map(calculateBias))
}
