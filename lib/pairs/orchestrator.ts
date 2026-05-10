// lib/pairs/orchestrator.ts
// Cerveau qui orchestre toutes les APIs par paire

import { getPair, PAIRS } from './config'
import type { PairPrice, MacroContext, PairAnalysis, PairBias, BiasLevel } from './types'

// ─── CROSS-ASSET INTELLIGENCE ─────────────────────────────────────────────────
// Correlations historiques (research-backed) pour ajuster le bias XAU/USD
const GOLD_CORRELATIONS: Record<string, { correlation: number; weight: number }> = {
  'DXY': { correlation: -0.78, weight: 0.25 },      // Dollar = #1 inverse driver
  'US10Y': { correlation: -0.45, weight: 0.15 },    // Yields = cost of holding gold
  'US02Y': { correlation: -0.50, weight: 0.10 },    // Fed expectations
  'VIX': { correlation: 0.35, weight: 0.15 },       // Fear = gold up
  'USDJPY': { correlation: -0.55, weight: 0.10 },   // Risk sentiment
  'XAGUSD': { correlation: 0.88, weight: 0.10 },    // Confirmation metaux
  'US500': { correlation: -0.25, weight: 0.05 },    // Risk-on/off
  'GOLDSILVER': { correlation: 0.15, weight: 0.10 }, // Ratio fear/greed
}

export interface CrossAssetSignal {
  pairId: string
  bias: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  impactOnGold: 'bullish' | 'bearish' | 'neutral'
  weight: number
}

export interface GoldVerdict {
  direction: 'Bullish' | 'Bearish' | 'Neutral'
  confidence: number
  crossAssetScore: number  // -100 to +100
  signals: CrossAssetSignal[]
  agreement: number        // % of signals aligned
  warning?: string
  _debug?: { bullishPercent: number; bearishPercent: number; neutralPercent: number; totalWeight: number }
}

// ─── PRICE FETCHER ───────────────────────────────────────────────────────────

export async function fetchPairPrice(pairId: string): Promise<PairPrice | null> {
  const config = getPair(pairId)
  if (!config) return null

  // Special handling for GOLDSILVER ratio
  if (pairId === 'GOLDSILVER') {
    return fetchGoldSilverRatio()
  }

  const yahooSymbol = config.apiSymbols.yahoo
  const twelveSymbol = config.apiSymbols.twelveData

  // Try sources in order
  for (const source of config.priceSourceOrder) {
    try {
      let result: PairPrice | null = null

      if (source === 'yahoo' && yahooSymbol) {
        result = await fetchYahoo(config.symbol, yahooSymbol)
      } else if (source === 'twelveData' && twelveSymbol) {
        result = await fetchTwelveData(config.symbol, twelveSymbol)
      } else if (source === 'fred' && config.apiSymbols.fred) {
        result = await fetchFRED(config.symbol, config.apiSymbols.fred)
      } else if (source === 'goldapi') {
        result = await fetchGoldApi(config.symbol)
      }

      if (result && result.price > 0) return result
    } catch {
      // Try next source
    }
  }
  return null
}

// Calculate Gold/Silver ratio from live prices
async function fetchGoldSilverRatio(): Promise<PairPrice | null> {
  try {
    const [goldRes, silverRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 30 }
      }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=2d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 30 }
      })
    ])
    
    if (!goldRes.ok || !silverRes.ok) return null
    
    const goldData = await goldRes.json()
    const silverData = await silverRes.json()
    
    const goldPrice = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice
    const silverPrice = silverData?.chart?.result?.[0]?.meta?.regularMarketPrice
    const goldPrev = goldData?.chart?.result?.[0]?.meta?.previousClose || goldPrice
    const silverPrev = silverData?.chart?.result?.[0]?.meta?.previousClose || silverPrice
    
    if (!goldPrice || !silverPrice) return null
    
    const ratio = goldPrice / silverPrice
    const prevRatio = goldPrev / silverPrev
    const change = ratio - prevRatio
    const changePercent = prevRatio ? (change / prevRatio) * 100 : 0
    
    return {
      symbol: 'XAU/XAG',
      price: Math.round(ratio * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: Date.now(),
      source: 'calculated',
    }
  } catch {
    return null
  }
}

async function fetchYahoo(symbol: string, yahooSymbol: string): Promise<PairPrice | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 30 } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null

  const prev = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice
  const change = meta.regularMarketPrice - prev
  const changePercent = prev ? (change / prev) * 100 : 0

  return {
    symbol,
    price: meta.regularMarketPrice,
    change,
    changePercent,
    high24h: meta.regularMarketDayHigh,
    low24h: meta.regularMarketDayLow,
    open: meta.regularMarketOpen,
    previousClose: prev,
    volume: meta.regularMarketVolume,
    timestamp: Date.now(),
    source: 'yahoo',
  }
}

async function fetchTwelveData(symbol: string, tdSymbol: string): Promise<PairPrice | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.TWELVEDATA_API_KEY
  if (!apiKey) return null
  const res = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbol)}&apikey=${apiKey}`,
    { next: { revalidate: 30 } }
  )
  if (!res.ok) return null
  const d = await res.json()
  if (d.status === 'error' || !d.close) return null
  const price = parseFloat(d.close)
  const prev = parseFloat(d.previous_close) || price
  return {
    symbol,
    price,
    change: price - prev,
    changePercent: prev ? ((price - prev) / prev) * 100 : 0,
    high24h: parseFloat(d.high) || undefined,
    low24h: parseFloat(d.low) || undefined,
    open: parseFloat(d.open) || undefined,
    timestamp: Date.now(),
    source: 'twelveData',
  }
}

async function fetchFRED(symbol: string, fredSeries: string): Promise<PairPrice | null> {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return null
  const res = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${fredSeries}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return null
  const d = await res.json()
  const obs = d.observations?.filter((o: any) => o.value !== '.') || []
  if (obs.length === 0) return null
  const price = parseFloat(obs[0].value)
  const prev = obs[1] ? parseFloat(obs[1].value) : price
  return {
    symbol,
    price,
    change: price - prev,
    changePercent: prev ? ((price - prev) / prev) * 100 : 0,
    timestamp: Date.now(),
    source: 'fred',
  }
}

async function fetchGoldApi(symbol: string): Promise<PairPrice | null> {
  const apiKey = process.env.GOLDAPI_KEY
  if (!apiKey) return null
  const metalSymbol = symbol.includes('XAG') ? 'XAG' : 'XAU'
  const res = await fetch(
    `https://www.goldapi.io/api/${metalSymbol}/USD`,
    { headers: { 'x-access-token': apiKey }, next: { revalidate: 60 } }
  )
  if (!res.ok) return null
  const d = await res.json()
  if (!d.price) return null
  return {
    symbol,
    price: d.price,
    change: d.ch || 0,
    changePercent: d.chp || 0,
    high24h: d.high_price,
    low24h: d.low_price,
    open: d.open_price,
    timestamp: Date.now(),
    source: 'goldapi',
  }
}

// ─── MACRO CONTEXT FETCHER ────────────────────────────────────────────────────

export async function fetchMacroContext(): Promise<MacroContext> {
  const apiKey = process.env.FRED_API_KEY

  const fetchFredValue = async (seriesId: string): Promise<number | null> => {
    if (!apiKey) return null
    try {
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`,
        { next: { revalidate: 3600 } }
      )
      if (!res.ok) return null
      const d = await res.json()
      const obs = d.observations?.filter((o: any) => o.value !== '.') || []
      return obs[0] ? parseFloat(obs[0].value) : null
    } catch {
      return null
    }
  }

  const [fedFundsRate, cpi, us10y, realRate10y, dxy, vix, yieldCurve2y10y] = await Promise.all([
    fetchFredValue('DFF'),
    fetchFredValue('CPIAUCSL'),
    fetchFredValue('DGS10'),
    fetchFredValue('DFII10'),
    fetchFredValue('DTWEXBGS'),
    fetchFredValue('VIXCLS'),
    fetchFredValue('T10Y2Y'),
  ])

  return { fedFundsRate, cpi, us10y, realRate10y, dxy, vix, yieldCurve2y10y }
}

// ─── BIAS BUILDER ─────────────────────────────────────────────────────────────

function directionToLevel(direction: string): BiasLevel {
  const d = direction.toLowerCase()
  if (d.includes('strongly bullish') || d.includes('strong bullish')) return 'Strongly Bullish'
  if (d.includes('slightly bullish')) return 'Slightly Bullish'
  if (d.includes('bullish')) return 'Bullish'
  if (d.includes('strongly bearish') || d.includes('strong bearish')) return 'Strongly Bearish'
  if (d.includes('slightly bearish')) return 'Slightly Bearish'
  if (d.includes('bearish')) return 'Bearish'
  return 'Neutral'
}

function levelToDirection(level: BiasLevel): 'up' | 'down' | 'neutral' {
  if (level.includes('Bullish')) return 'up'
  if (level.includes('Bearish')) return 'down'
  return 'neutral'
}

export function buildBiasFromEngine(engineResult: any): PairBias {
  const swingLevel = directionToLevel(engineResult.swing?.direction || 'Neutral')
  const dayLevel = directionToLevel(engineResult.day?.direction || 'Neutral')
  return {
    swing: {
      level: swingLevel,
      confidence: engineResult.swing?.confidence || 50,
      direction: levelToDirection(swingLevel),
    },
    day: {
      level: dayLevel,
      confidence: engineResult.day?.confidence || 50,
      direction: levelToDirection(dayLevel),
    },
  }
}

// ─── ANALYSIS BUILDER ─────────────────────────────────��───────────────────────

export function buildAnalysis(
  pairId: string,
  bias: PairBias,
  macro: MacroContext,
  technicals?: { rsi?: number; atr?: number; adx?: number; volume?: number; avgVolume?: number }
): PairAnalysis {
  // Edge Factor: weighted score from multiple sources
  const swingConf = bias.swing.confidence / 100
  const dayConf = bias.day.confidence / 100
  const avgConf = (swingConf + dayConf) / 2

  const swingNotNeutral = bias.swing.level !== 'Neutral' ? 1 : 0
  const dayNotNeutral = bias.day.level !== 'Neutral' ? 1 : 0
  const consensusBonus = bias.swing.direction === bias.day.direction && bias.swing.direction !== 'neutral' ? 15 : 0
  const adxBonus = (technicals?.adx || 25) / 100 * 10

  const edgeFactor = Math.min(100, Math.round(
    (avgConf * 55) + (swingNotNeutral * 10) + (dayNotNeutral * 10) + consensusBonus + adxBonus
  ))

  // Mood: PAIR-SPECIFIC based on asset type + VIX + macro context
  const vix = macro.vix || 20
  const realRate = macro.realRate10y || 0
  const yieldCurve = macro.yieldCurve2y10y || 0
  
  // Adjust mood based on pair type
  let moodBase: number
  if (pairId === 'XAUUSD' || pairId === 'XAGUSD') {
    // Gold/Silver: benefits from fear, negative real rates
    moodBase = vix > 25 ? 70 : vix > 18 ? 55 : 40
    if (realRate < 0) moodBase += 15
    if (realRate > 1) moodBase -= 15
  } else if (pairId === 'VIX') {
    // VIX: inverse of equity mood
    moodBase = vix > 30 ? 80 : vix > 20 ? 60 : vix > 15 ? 40 : 20
  } else if (pairId.startsWith('US') && pairId !== 'US10Y') {
    // Equities: benefits from low VIX, positive curve
    moodBase = vix < 15 ? 80 : vix < 20 ? 65 : vix < 28 ? 45 : 25
    if (yieldCurve > 0.5) moodBase += 10
    if (yieldCurve < -0.5) moodBase -= 15
  } else if (pairId === 'WTI') {
    // Oil: mixed - benefits from growth but hurt by high rates
    moodBase = vix < 20 ? 60 : vix < 30 ? 45 : 30
  } else if (pairId === 'DXY' || pairId === 'US10Y' || pairId === 'US02Y') {
    // Dollar/Yields: benefits from higher rates
    const fedRate = macro.fedFundsRate || 5
    moodBase = fedRate > 5 ? 70 : fedRate > 4 ? 55 : 40
  } else if (pairId === 'USDJPY') {
    // USDJPY: risk-on = up, risk-off = down (carry trade)
    moodBase = vix < 18 ? 70 : vix < 25 ? 50 : 30
    if (yieldCurve > 0) moodBase += 10
  } else if (pairId === 'GOLDSILVER') {
    // Gold/Silver ratio: high ratio = fear (gold outperforms), low = greed (silver outperforms)
    moodBase = vix > 25 ? 65 : vix > 18 ? 50 : 35
  } else {
    moodBase = vix < 17 ? 70 : vix < 25 ? 50 : 30
  }
  
  const moodScore = Math.min(100, Math.max(0, moodBase))
  const mood = {
    score: moodScore,
    label: (moodScore > 75 ? 'Extreme Greed' : moodScore > 55 ? 'Greed' : moodScore > 45 ? 'Neutral' : moodScore > 25 ? 'Fear' : 'Extreme Fear') as any,
  }

  // Pulse: PAIR-SPECIFIC based on typical ATR ranges
  const ATR_NORMS: Record<string, number> = {
    'XAUUSD': 25, 'XAGUSD': 0.35, 'DXY': 0.5, 'WTI': 1.5,
    'US500': 40, 'US100': 180, 'US30': 300, 'VIX': 2, 'US10Y': 0.08,
    'USDJPY': 0.8, 'US02Y': 0.05, 'GOLDSILVER': 1.5
  }
  const atrNorm = ATR_NORMS[pairId] || 1
  const atr = technicals?.atr || atrNorm * 0.8
  const pulseScore = Math.min(100, Math.round((atr / atrNorm) * 50))
  const pulse = {
    level: (pulseScore > 70 ? 'Sauvage' : pulseScore > 35 ? 'Tradable' : 'Calme') as any,
    score: pulseScore,
  }

  // Flow: based on bias strength + confidence as proxy for volume
  // Higher confidence + strong bias = healthy flow
  const biasStrength = Math.abs(swingConf - 0.5) + Math.abs(dayConf - 0.5)
  const flowScore = Math.min(100, Math.round(30 + biasStrength * 100 + (consensusBonus > 0 ? 20 : 0)))
  const flow = {
    level: (flowScore > 70 ? 'Chargé' : flowScore > 40 ? 'Sain' : 'Mince') as any,
    score: flowScore,
  }

  // Trend: based on ADX + bias direction consensus
  const adx = technicals?.adx || 25
  const trendLevel = adx > 35 ? 'Continuation' : adx > 22 ? (swingNotNeutral || dayNotNeutral ? 'Emergence' : 'Variation') : 'Variation'
  const trendDir = bias.swing.direction !== 'neutral' ? bias.swing.direction : bias.day.direction

  return {
    pairId,
    edgeFactor,
    bias,
    mood,
    pulse,
    flow,
    trend: {
      level: trendLevel as any,
      direction: trendDir,
    },
    updatedAt: Date.now(),
  }
}

// ─── CROSS-ASSET GOLD VERDICT ─────────────────────────────────────────────────
// Analyse toutes les paires pour donner un verdict croise sur XAU/USD
// Utilise une methodologie de scoring multi-facteurs (research-backed)

export function calculateGoldVerdict(
  allBiases: Record<string, { swing: { direction: string; confidence: number }; day: { direction: string; confidence: number } }>
): GoldVerdict {
  const signals: CrossAssetSignal[] = []
  
  // ─── ETAPE 1: CALCULER LES SCORES PAR PAIRE ─────────────────────────────
  const pairScores: Array<{ pairId: string; score: number; confidence: number; weight: number; signal: CrossAssetSignal }> = []
  
  for (const [pairId, corrData] of Object.entries(GOLD_CORRELATIONS)) {
    const pairBias = allBiases[pairId]
    if (!pairBias) continue
    
    // Utiliser swing bias (plus fiable pour prévisions court-terme)
    const direction = pairBias.swing.direction.toLowerCase()
    const confidence = pairBias.swing.confidence / 100 // 0 to 1
    
    // Convertir bias en score -1 a +1 avec poids de confiance
    let biasScore = 0
    if (direction.includes('bull')) biasScore = confidence // 0 to 1
    else if (direction.includes('bear')) biasScore = -confidence // -1 to 0
    else biasScore = 0 // neutral
    
    // Appliquer la correlation: si DXY bullish (+1) et corr -0.78 = -0.78 pour gold
    const goldImpactScore = biasScore * corrData.correlation
    
    // Determiner impact direction
    let impactOnGold: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (goldImpactScore > 0.05) impactOnGold = 'bullish'
    else if (goldImpactScore < -0.05) impactOnGold = 'bearish'
    
    const signal: CrossAssetSignal = {
      pairId,
      bias: direction.includes('bull') ? 'bullish' : direction.includes('bear') ? 'bearish' : 'neutral',
      confidence: pairBias.swing.confidence,
      impactOnGold,
      weight: corrData.weight,
    }
    
    signals.push(signal)
    pairScores.push({
      pairId,
      score: goldImpactScore,
      confidence,
      weight: corrData.weight,
      signal,
    })
  }
  
  // ─── ETAPE 2: DETECTER LES CONSENSUS & DIVERGENCES ─────────────────────
  const bullishScores = pairScores.filter(p => p.signal.impactOnGold === 'bullish').map(p => Math.abs(p.score) * p.weight)
  const bearishScores = pairScores.filter(p => p.signal.impactOnGold === 'bearish').map(p => Math.abs(p.score) * p.weight)
  const neutralScores = pairScores.filter(p => p.signal.impactOnGold === 'neutral').map(p => p.weight)
  
  const bullishSum = bullishScores.reduce((a, b) => a + b, 0)
  const bearishSum = bearishScores.reduce((a, b) => a + b, 0)
  const neutralSum = neutralScores.reduce((a, b) => a + b, 0)
  const totalWeight = bullishSum + bearishSum + neutralSum
  
  // Pourcentage par direction (pondere par confiance)
  const bullishPercent = totalWeight > 0 ? (bullishSum / totalWeight) * 100 : 0
  const bearishPercent = totalWeight > 0 ? (bearishSum / totalWeight) * 100 : 0
  const neutralPercent = totalWeight > 0 ? (neutralSum / totalWeight) * 100 : 0
  
  // ─── ETAPE 3: CALCULER LE SCORE CROSS-ASSET ───────────────────────────
  // Methode: Difference ponderee bullish - bearish, puis normalisee
  // Similar a la formule de force relative
  const rawScore = bullishSum - bearishSum
  const crossAssetScore = totalWeight > 0 ? Math.round((rawScore / totalWeight) * 100) : 0
  
  // ─── ETAPE 4: CALCULER LE CONSENSUS (AGREEMENT) ──────────────────────
  // Consensus = pourcentage du signal dominant
  // Penalise les divergences (low agreement = moins de conviction)
  const agreement = Math.round(Math.max(bullishPercent, bearishPercent, neutralPercent))
  
  // ─── ETAPE 5: DETERMINER LA DIRECTION & CONFIANCE ─────────────────────
  let direction: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral'
  
  // Utiliser a la fois le score ET l'agreement pour la decision
  if (crossAssetScore > 20 && agreement > 55) {
    direction = 'Bullish'
  } else if (crossAssetScore < -20 && agreement > 55) {
    direction = 'Bearish'
  } else if (crossAssetScore > 5 && agreement > 65) {
    direction = 'Bullish'
  } else if (crossAssetScore < -5 && agreement > 65) {
    direction = 'Bearish'
  }
  // Else = Neutral (thresholds not met)
  
  // Confidence = fonction du score absolu + agreement
  // Plus le score est extreme ET le consensus fort = plus de confiance
  const baseConfidence = Math.min(90, Math.abs(crossAssetScore) * 1.5)
  const agreementBonus = agreement > 70 ? 10 : agreement > 60 ? 5 : 0
  const confidence = Math.min(95, baseConfidence + agreementBonus)
  
  // ─── ETAPE 6: DETECTION DES AVERTISSEMENTS ────────────────────────────
  let warning: string | undefined
  
  // Warning 1: Divergence majeure
  if (agreement < 55 && Math.abs(crossAssetScore) > 30) {
    warning = 'Divergence majeure: score extreme mais consensus faible - risque'
  }
  // Warning 2: Signaux contradictoires equilibres
  else if (bullishPercent > 40 && bullishPercent < 60) {
    warning = 'Signaux equilibres: faible consensus - attendez clarification'
  }
  // Warning 3: Confiance tres basse malgre score
  else if (confidence < 40 && Math.abs(crossAssetScore) > 15) {
    warning = 'Score contradictoire avec confiance basse - incertain'
  }
  
  return {
    direction,
    confidence: Math.round(confidence),
    crossAssetScore,
    signals: signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)), // Trier par importance
    agreement,
    warning,
    // Debug: percentages
    _debug: { bullishPercent, bearishPercent, neutralPercent, totalWeight }
  }
}

// ─── ALL PAIRS OVERVIEW ───────────────────────────────────────────────────────

export async function fetchAllPairPrices(): Promise<Record<string, PairPrice | null>> {
  const entries = await Promise.all(
    Object.keys(PAIRS).map(async (id) => [id, await fetchPairPrice(id)])
  )
  return Object.fromEntries(entries)
}
