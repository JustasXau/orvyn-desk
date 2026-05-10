// ═══════════════════════════════════════════════════════════════════════════
// ORVYN DESK — PROFESSIONAL BIAS ENGINE (UNIVERSAL)
// ═══════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
// - Single logic applied to ALL assets from lib/assets.ts
// - Weights and thresholds configured in BIAS_WEIGHTS (lib/assets.ts)
// - Add a new asset → automatically gets bias calculation
// - Modify weights → applies to all assets instantly
//
// TIMEFRAMES DEFINITION:
// - SWING TRADING = 2 semaines à 1 mois (moyen terme)
//   → Tendance structurelle dominante, analyse Weekly/Daily
//   → Plus de poids: structure de marché, S/R majeurs, macro
//
// - DAY TRADING = Maximum 24h (court terme)  
//   → Momentum actuel, dynamique H4/H1, news du jour
//   → Focus: sentiment intraday, rotation sectorielle
//
// REGLE: Le rapport doit TOUJOURS correspondre aux biais du dashboard
// ═══════════════════════════════════════════════════════════════════════════

import { BIAS_WEIGHTS, ASSETS, Asset, getAsset, getAllSymbols, getYahooSymbol, processAllAssets } from './assets';
import { 
  detectMarketStructure, 
  detectOrderBlock, 
  checkEconomicRisk,
  applyCorrelationFilter,
  type Candle,
  type EconomicEvent,
  type MarketStructure,
  type OrderBlock,
} from './market-structure';

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL BIAS CALCULATION — Apply to all assets automatically
// ═══════════════════════════════════════════════════════════════════════════

export interface AssetBiasResult {
  symbol: string;
  swing: BiasResult;
  day: BiasResult;
  timestamp: number;
}

// Calculate bias for a single asset (generic - works for any asset)
export async function calculateAssetBias(
  symbol: string,
  fetchIndicators: (yahooSymbol: string) => Promise<{ swing: SwingIndicators; day: DayIndicators }>
): Promise<AssetBiasResult> {
  const yahooSymbol = getYahooSymbol(symbol);
  const indicators = await fetchIndicators(yahooSymbol);
  
  return {
    symbol,
    swing: calcSwingBias(indicators.swing),
    day: calcDayBias(indicators.day),
    timestamp: Date.now(),
  };
}

// Calculate bias for ALL assets in the desk (universal batch processing)
export async function calculateAllBiases(
  fetchIndicators: (yahooSymbol: string) => Promise<{ swing: SwingIndicators; day: DayIndicators }>
): Promise<Map<string, AssetBiasResult>> {
  return processAllAssets(async (asset) => {
    return calculateAssetBias(asset.symbol, fetchIndicators);
  });
}

// Get thresholds from centralized config
export function getThresholds() {
  return BIAS_WEIGHTS.thresholds;
}

// Get ADX multipliers from centralized config
export function getADXMultiplier(adx: number): number {
  const multipliers = BIAS_WEIGHTS.adxMultipliers;
  
  if (adx < multipliers.veryWeak.threshold) return multipliers.veryWeak.multiplier;
  if (adx < multipliers.weak.threshold) return multipliers.weak.multiplier;
  if (adx < multipliers.developing.threshold) return multipliers.developing.multiplier;
  if (adx < multipliers.normal.threshold) return multipliers.normal.multiplier;
  if (adx < multipliers.strong.threshold) return multipliers.strong.multiplier;
  return multipliers.veryStrong.multiplier;
}

// Standardized bias score type
export type BiasScore = {
  score: number;        // 0 → 1 (0.5 = neutral)
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;   // 0 → 100
};

// Compute technical score from indicators (returns 0-1)
export function computeTechScore(indicators: {
  ema50?: number;
  ema200?: number;
  macd?: number;
  rsi?: number;
  momentum?: number;
}): number {
  let score = 0;
  
  // EMA Trend (30% weight)
  if (indicators.ema50 && indicators.ema200) {
    if (indicators.ema50 > indicators.ema200) score += 0.3;
    else score -= 0.3;
  }
  
  // MACD (25% weight)
  if (indicators.macd !== undefined) {
    if (indicators.macd > 0) score += 0.25;
    else score -= 0.25;
  }
  
  // RSI (20% weight)
  if (indicators.rsi !== undefined) {
    if (indicators.rsi < 30) score += 0.2;      // Oversold = bullish
    else if (indicators.rsi > 70) score -= 0.2; // Overbought = bearish
  }
  
  // Momentum (15% weight)
  if (indicators.momentum !== undefined) {
    if (indicators.momentum > 0) score += 0.15;
    else score -= 0.15;
  }
  
  // Clamp to 0-1 range (0.5 = neutral)
  return Math.max(0, Math.min(1, 0.5 + score));
}

// Compute global weighted score (ORVYN weights: 70% tech, 20% sentiment, 10% macro)
export function computeGlobalScore({
  tech,
  sentiment,
  macro,
}: {
  tech: number;      // 0-1 score
  sentiment: number; // 0-1 score
  macro: number;     // 0-1 score
}): number {
  return (
    tech * 0.7 +
    sentiment * 0.2 +
    macro * 0.1
  );
}

// Resolve conflict between swing and intraday bias (ORVYN rules)
// Swing DOMINATES - intraday can refine but never reverse
// NOTE: Le biais montre TOUJOURS la direction reelle. La confiance indique la force.
export function resolveBias(
  swing: BiasScore,
  intraday: BiasScore
): BiasScore & { context: string; action: "BUY" | "SELL" | "HOLD" } {
  let final = { ...swing };
  let context = "TREND";
  
  // CONFLICT: swing and intraday disagree
  if (swing.bias !== intraday.bias && swing.bias !== "NEUTRAL" && intraday.bias !== "NEUTRAL") {
    context = "PULLBACK";
    // Swing dominates, confidence decreases on conflict
    final = {
      ...swing,
      confidence: Math.max(0, swing.confidence - 15),
    };
  } else if (swing.bias === "NEUTRAL" && intraday.bias === "NEUTRAL") {
    context = "RANGE";
  }
  
  // ACTION based on confidence threshold (confidence < 65 = HOLD, but bias stays)
  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  if (final.confidence >= 65) {
    action = final.bias === "BULLISH" ? "BUY" : final.bias === "BEARISH" ? "SELL" : "HOLD";
  }
  
  return { ...final, context, action };
}

// ═══════════════════════════════════════════════════════════════════════════
// ORVYN FULL PIPELINE - Compute final bias from all inputs
// ═══════════════════════════════════════════════════════════════════════════
export function computeOrvynBias(inputs: {
  swingScore: number;      // 0-1
  intradayScore: number;   // 0-1
  sentimentScore: number;  // 0-1
  macroScore: number;      // 0-1
}): {
  swing: BiasScore;
  intraday: BiasScore;
  global: BiasScore;
  final: BiasScore & { context: string };
  action: "BUY" | "SELL" | "HOLD";
} {
  // Step 1: Compute individual biases
  const swing = computeBiasFromScore(inputs.swingScore);
  const intraday = computeBiasFromScore(inputs.intradayScore);
  
  // Step 2: Compute global score (70% tech/swing, 20% sentiment, 10% macro)
  const globalScore = computeGlobalScore({
    tech: inputs.swingScore,
    sentiment: inputs.sentimentScore,
    macro: inputs.macroScore,
  });
  const global = computeBiasFromScore(globalScore);
  
  // Step 3: Resolve swing vs intraday conflict
  const final = resolveBias(swing, intraday);
  
  // Step 4: Determine action
  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  if (final.bias === "BULLISH" && final.confidence >= 65) {
    action = "BUY";
  } else if (final.bias === "BEARISH" && final.confidence >= 65) {
    action = "SELL";
  }
  
  return { swing, intraday, global, final, action };
}

/*
EXAMPLE with precomputed scores:
  swing_score: 0.72      → BULLISH (> 0.6), confidence: 44
  intraday_score: 0.48   → NEUTRAL (0.4-0.6), confidence: 4
  sentiment_score: 0.55  → NEUTRAL
  macro_score: 0.40      → NEUTRAL
  global_score: 0.66     → BULLISH (> 0.6)
  
  resolveBias(swing=BULLISH, intraday=NEUTRAL):
    - swing !== intraday → CONFLICT → context = "PULLBACK"
    - final bias = swing (BULLISH)
    - confidence = 44 - 15 = 29 (< 65 → HOLD)
  
  Result: HOLD (confidence too low after conflict penalty)
*/

// Resolve AI bias vs System bias conflict
// AI bias comes from Groq, System bias comes from technical indicators
export function resolveAIvsSystem(
  ai: BiasScore,
  system: BiasScore
): BiasScore & { action: "BUY" | "SELL" | "HOLD" } {
  const result = { ...ai };
  
  // If AI and System disagree, reduce AI confidence
  if (ai.bias !== system.bias) {
    result.confidence = Math.max(0, ai.confidence - 20);
  }
  
  // Determine action based on final confidence
  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  
  if (result.confidence >= 65) {
    if (result.bias === "BULLISH") action = "BUY";
    else if (result.bias === "BEARISH") action = "SELL";
  }
  
  // Force HOLD if confidence < 65
  if (result.confidence < 65) {
    action = "HOLD";
  }
  
  return { ...result, action };
}

// Compute bias from a 0-1 score
export function computeBiasFromScore(score: number): BiasScore {
  let bias: BiasScore["bias"] = "NEUTRAL";
  let confidence = Math.round(Math.abs(score - 0.5) * 200);
  
  if (score > 0.6) bias = "BULLISH";
  else if (score < 0.4) bias = "BEARISH";
  
  // Apply confidence < 65 = HOLD rule
  if (confidence < 65) bias = "NEUTRAL";
  
  return {
    score,
    bias,
    confidence,
  };
}

// Convert internal BiasResult to standardized BiasScore
export function toBiasScore(result: BiasResult): BiasScore {
  // Convert -100 to +100 score to 0 to 1
  const normalizedScore = (result.score + 100) / 200;
  
  // Map French bias labels to English
  let bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  if (result.bias === 'Fort Haussier' || result.bias === 'Haussier') {
    bias = "BULLISH";
  } else if (result.bias === 'Fort Baissier' || result.bias === 'Baissier') {
    bias = "BEARISH";
  } else {
    bias = "NEUTRAL";
  }
  
  // Apply confidence < 65 = HOLD rule
  if (result.confidence < 65) {
    bias = "NEUTRAL";
  }
  
  return {
    score: Math.round(normalizedScore * 100) / 100,
    bias,
    confidence: result.confidence
  };
}

export interface SwingIndicators {
  // Trend
  ema50: number;
  ema200: number;
  adx: number;          // 0–100, trend strength
  // Momentum
  macdLine: number;
  macdSignal: number;
  macdHist: number;
  // Mean reversion
  rsi: number;          // 0–100
  // Price momentum
  change1M: number | null;  // % change
  change3M: number | null;
  // Context
  sentiment: number;    // -1 to +1 from Finnhub
  // MARKET STRUCTURE (NEW)
  candles?: Candle[];   // Dernières bougies pour structure detection
  currentPrice?: number;
  // ECONOMIC CALENDAR (NEW)
  upcomingEvents?: EconomicEvent[];
  // CORRELATIONS (NEW)
  correlatedAssets?: Record<string, number>; // { 'DXY': +5 or -5 }
}

export interface DayIndicators {
  // Momentum
  macdLine: number;
  macdSignal: number;
  // Trend short
  ema9: number;
  ema21: number;
  // Mean reversion
  rsi: number;          // 0–100
  stochK: number;       // 0–100
  stochD: number;
  // Volatility position
  price: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  // Volatility filter
  atr: number;
  atrPct: number;       // ATR as % of price
  // Context
  sentiment4h: number;  // -1 to +1
}

export interface BiasResult {
  score: number;           // -100 to +100
  bias: 'Fort Haussier' | 'Haussier' | 'Neutre' | 'Baissier' | 'Fort Baissier';
  confidence: number;      // 0–95
  reliable: boolean;       // false if market conditions make signal unreliable
  reliabilityReason?: string; // why it's unreliable if applicable
  components: {            // breakdown for transparency
    name: string;
    weight: number;
    contribution: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
}

// ═══════════════════════════════
// SWING TRADING BIAS (Daily TF) - Uses BIAS_WEIGHTS from assets.ts
// ═══════════════════════════════
export function calcSwingBias(ind: SwingIndicators): BiasResult {
  const components: BiasResult['components'] = [];
  let score = 0;
  
  // Get weights from centralized config
  const W = BIAS_WEIGHTS.swing;

  // ═════════════════════════════════════════════════════════════════
  // 1. MARKET STRUCTURE ANALYSIS — 30% weight (NEW)
  // ═════════════════════════════════════════════════════════════════
  let structureScore = 0;
  let structureSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (ind.candles && ind.candles.length >= 5) {
    const structure = detectMarketStructure(ind.candles);
    const orderBlock = ind.currentPrice ? detectOrderBlock(ind.candles, ind.currentPrice) : null;
    
    // Structure contribue 30% du score swing
    const structureWeight = W.structure;
    
    // Signal de base de la structure
    if (structure.type === 'HH' || structure.type === 'BOS') {
      structureScore = structureWeight * (structure.strength / 100);
      structureSignal = 'bullish';
    } else if (structure.type === 'LL') {
      structureScore = -structureWeight * (structure.strength / 100);
      structureSignal = 'bearish';
    }
    
    // Order Block boost (si retesting un OB)
    if (orderBlock?.isRetesting) {
      const obBoost = (orderBlock.retestStrength / 100) * (structureWeight * 0.3);
      structureScore += orderBlock.type === 'bullish' ? obBoost : -obBoost;
    }
    
    score += structureScore;
    components.push({
      name: `Market Structure ${structure.type} (OB: ${orderBlock?.isRetesting ? 'RETESTING' : 'none'})`,
      weight: W.structure,
      contribution: structureScore,
      signal: structureSignal
    });
  }

  // ── EMA CROSS: Uses W.emaCross weight ──────────────────────────
  // EMA50 > EMA200 = Golden Cross (very bullish long term)
  // EMA50 < EMA200 = Death Cross (very bearish long term)
  const ema50Val = Number(ind.ema50) || 0;
  const ema200Val = Number(ind.ema200) || 0;
  const emaCrossWeight = W.emaCross || 25;
  const emaCrossScore = ema50Val > ema200Val ? emaCrossWeight : -emaCrossWeight;
  score += emaCrossScore;
  components.push({
    name: 'EMA50/200 Cross',
    weight: emaCrossWeight,
    contribution: emaCrossScore,
    signal: emaCrossScore > 0 ? 'bullish' : 'bearish'
  });

  // ── MACD DAILY: Uses W.macd weight ────────────────────────
  // Use histogram for more nuance than simple cross
  // Ensure numeric values to avoid NaN
  const macdH = Number(ind.macdHist) || 0;
  const macdL = Math.abs(Number(ind.macdLine)) || 1;
  const macdWeight = W.macd || 20; // fallback
  const macdScore = macdH > 0
    ? Math.min(macdWeight, macdWeight * 0.6 + (macdH / macdL) * macdWeight * 0.4)
    : Math.max(-macdWeight, -macdWeight * 0.6 - (Math.abs(macdH) / macdL) * macdWeight * 0.4);
  score += macdScore;
  components.push({
    name: 'MACD Daily',
    weight: macdWeight,
    contribution: macdScore,
    signal: macdScore > 0 ? 'bullish' : macdScore < 0 ? 'bearish' : 'neutral'
  });

  // ── RSI DAILY: Uses W.rsi weight — CONTINUOUS score ──────
  // Not binary — score is proportional to RSI level
  const rsiVal = Number(ind.rsi) || 50;
  const rsiWeight = W.rsi || 15;
  let rsiScore = 0;
  if (rsiVal <= 20) rsiScore = rsiWeight;
  else if (rsiVal <= 30) rsiScore = rsiWeight * 0.75;
  else if (rsiVal <= 40) rsiScore = rsiWeight * 0.4;
  else if (rsiVal >= 80) rsiScore = -rsiWeight;
  else if (rsiVal >= 70) rsiScore = -rsiWeight * 0.75;
  else if (rsiVal >= 60) rsiScore = -rsiWeight * 0.4;
  else rsiScore = (50 - rsiVal) * (rsiWeight / 57);
  score += rsiScore;
  components.push({
    name: 'RSI(14) Daily',
    weight: rsiWeight,
    contribution: rsiScore,
    signal: rsiScore > 3 ? 'bullish' : rsiScore < -3 ? 'bearish' : 'neutral'
  });

  // ── PRICE MOMENTUM 1M+3M: Uses W.momentum weight ─────────────
  const chg1M = Number(ind.change1M) || 0;
  const chg3M = Number(ind.change3M) || 0;
  const momentum = (chg1M * 0.6) + (chg3M * 0.4);
  const momentumWeight = W.momentum || 5;
  const momentumScore = Math.min(momentumWeight, Math.max(-momentumWeight, momentum * (momentumWeight / 5)));
  score += momentumScore;
  components.push({
    name: 'Momentum 1M/3M',
    weight: momentumWeight,
    contribution: momentumScore,
    signal: momentumScore > 2 ? 'bullish' : momentumScore < -2 ? 'bearish' : 'neutral'
  });

  // ── NEWS SENTIMENT: Uses W.sentiment weight ────────────────────
  const sentimentWeight = W.sentiment || 5;
  const sentimentScore = (Number(ind.sentiment) || 0) * sentimentWeight;
  score += sentimentScore;
  components.push({
    name: 'Sentiment News',
    weight: sentimentWeight,
    contribution: sentimentScore,
    signal: sentimentScore > 1 ? 'bullish' : sentimentScore < -1 ? 'bearish' : 'neutral'
  });

  // ── ADX MULTIPLIER — Trend strength filter ────────
  // ADX measures trend STRENGTH, not direction
  // Low ADX = ranging market = signals are less reliable
  // MAIS: On garde le signal plus fort pour les metaux et indices qui ont souvent des tendances claires
  let adxMultiplier: number;
  let reliabilityReason: string | undefined;

  if (ind.adx < 15) {
    adxMultiplier = 0.65; // Was 0.35 - less aggressive reduction
    reliabilityReason = `ADX=${ind.adx.toFixed(0)} — Marche en consolidation`;
  } else if (ind.adx < 20) {
    adxMultiplier = 0.80; // Was 0.60
    reliabilityReason = `ADX=${ind.adx.toFixed(0)} — Tendance en developpement`;
  } else if (ind.adx < 25) {
    adxMultiplier = 0.90; // Was 0.80
  } else if (ind.adx < 30) {
    adxMultiplier = 1.00; // Normal
  } else if (ind.adx < 40) {
    adxMultiplier = 1.10; // Good trend
  } else {
    adxMultiplier = 1.20; // Strong trend — amplify signal
  }

  score = score * adxMultiplier;

  // ──────────────────────────────────────────────────────────────
  // ECONOMIC CALENDAR FILTER (NEW) — Réduit confiance si event proche
  // ──────────────────────────────────────────────────────────────
  let newsRiskReduction = 0;
  if (ind.upcomingEvents && ind.upcomingEvents.length > 0) {
    const ecoRisk = checkEconomicRisk(ind.upcomingEvents, 120); // 120 min window
    if (ecoRisk.newsRisk) {
      newsRiskReduction = ecoRisk.confidenceReduction;
      components.push({
        name: `⚠️ Economic Risk: ${ecoRisk.nextEvent?.name || 'Upcoming'} in ${Math.round(ecoRisk.minutesUntil || 0)}min`,
        weight: 0,
        contribution: 0,
        signal: 'neutral'
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // CORRELATION FILTER (NEW) — Adjust score selon DXY pour pairs USD
  // ──────────────────────────────────────────────────────────────
  let correlationReduction = 0;
  if (ind.correlatedAssets) {
    const { adjustedScore: adjScore, reduction } = applyCorrelationFilter(
      score,
      'UNK', // Will be passed from API
      ind.correlatedAssets
    );
    if (reduction > 0) {
      correlationReduction = reduction;
      score = adjScore;
    }
  }

  // Adaptive threshold based on ADX - LOWER thresholds for clearer signals
  // Seuils plus bas pour avoir des signaux plus clairs
  const threshold = ind.adx < 20 ? 25 : ind.adx < 25 ? 18 : 15;
  
  // Calculate final score (capped at ±100)
  const finalScore = Math.round(Math.min(100, Math.max(-100, score)));

  // ═══════════════════════════════════════════════════════════════════════════
  // NOUVELLE LOGIQUE: Confidence = force du signal, Direction = signe du score
  // ═══════════════════════════════════════════════════════════════════════════
  // 
  // La CONFIANCE represente la FORCE du signal (0-100%)
  // La DIRECTION est determinee par le SIGNE du score:
  //   - Score < -10 → Bearish
  //   - Score -10 to +10 → Neutral (zone d'incertitude)
  //   - Score > +10 → Bullish
  //
  // REGLE FONDAMENTALE: Confiance >= 60% implique une direction claire (pas Neutre)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const absScore = Math.abs(finalScore);
  
  // Confidence basee sur la force absolue du score
  // Score 0 = 0% confiance, Score 100 = 100% confiance
  let confidence = Math.min(95, Math.round(absScore));
  
  // ADX bonus (trend strength indicator)
  const adxBonus = ind.adx >= 30 ? 10 : ind.adx >= 25 ? 5 : 0;
  confidence = Math.min(95, confidence + adxBonus);
  
  // Direction basee sur le score ET la confiance
  let biasLabel: BiasResult['bias'];
  
  // Si confiance >= 55%, on DOIT avoir une direction (pas Neutre)
  if (confidence >= 55) {
    if (finalScore >= 50) biasLabel = 'Fort Haussier';
    else if (finalScore > 0) biasLabel = 'Haussier';
    else if (finalScore <= -50) biasLabel = 'Fort Baissier';
    else biasLabel = 'Baissier'; // finalScore < 0
  } else if (confidence >= 40) {
    // Zone intermediaire: direction legere
    if (finalScore > 10) biasLabel = 'Haussier';
    else if (finalScore < -10) biasLabel = 'Baissier';
    else biasLabel = 'Neutre';
  } else {
    // Confiance < 40% = Neutre (signal trop faible)
    biasLabel = 'Neutre';
  }
  
  // Apply economic calendar reduction
  confidence = Math.max(30, confidence - newsRiskReduction);
  
  // Apply correlation reduction
  if (correlationReduction > 0) {
    confidence = Math.max(30, confidence - correlationReduction);
  }

  return {
    score: finalScore,
    bias: biasLabel,
    confidence,
    reliable: ind.adx >= 20,
    reliabilityReason,
    components
  };
}

// ═══════════════════════════════
// INTRA-DAY BIAS (H4/H1 TF) - Max 24h horizon
// ═══════════════════════════════
export function calcDayBias(ind: DayIndicators): BiasResult {
  const components: BiasResult['components'] = [];
  let score = 0;

  // ── MACD 1H: 28% weight ───────────────────────────
  const macdCross = ind.macdLine > ind.macdSignal;
  const macdStrength = Math.abs(ind.macdLine - ind.macdSignal);
  const macdScore = macdCross
    ? Math.min(28, 18 + macdStrength * 5)
    : Math.max(-28, -18 - macdStrength * 5);
  score += macdScore;
  components.push({
    name: 'MACD 1H',
    weight: 28,
    contribution: macdScore,
    signal: macdScore > 0 ? 'bullish' : 'bearish'
  });

  // ── EMA9 vs EMA21 1H: 22% weight ─────────────────
  const emaDiff = ((ind.ema9 - ind.ema21) / ind.ema21) * 100;
  const emaScore = ind.ema9 > ind.ema21
    ? Math.min(22, 14 + Math.abs(emaDiff) * 8)
    : Math.max(-22, -14 - Math.abs(emaDiff) * 8);
  score += emaScore;
  components.push({
    name: 'EMA9/21 1H',
    weight: 22,
    contribution: emaScore,
    signal: emaScore > 0 ? 'bullish' : 'bearish'
  });

  // ── RSI 1H: 20% weight — CONTINUOUS ──────────────
  let rsiScore = 0;
  if (ind.rsi <= 20) rsiScore = 20;
  else if (ind.rsi <= 30) rsiScore = 14;
  else if (ind.rsi <= 40) rsiScore = 6;
  else if (ind.rsi >= 80) rsiScore = -20;
  else if (ind.rsi >= 70) rsiScore = -14;
  else if (ind.rsi >= 60) rsiScore = -6;
  else rsiScore = (50 - ind.rsi) * 0.32;
  score += rsiScore;
  components.push({
    name: 'RSI(14) 1H',
    weight: 20,
    contribution: rsiScore,
    signal: rsiScore > 2 ? 'bullish' : rsiScore < -2 ? 'bearish' : 'neutral'
  });

  // ── STOCHASTIC 1H: 15% weight ────────────────────
  let stochScore = 0;
  if (ind.stochK <= 10) stochScore = 15;
  else if (ind.stochK <= 20) stochScore = 10;
  else if (ind.stochK <= 30) stochScore = 4;
  else if (ind.stochK >= 90) stochScore = -15;
  else if (ind.stochK >= 80) stochScore = -10;
  else if (ind.stochK >= 70) stochScore = -4;
  else stochScore = (50 - ind.stochK) * 0.25;
  // Bonus if K and D agree
  if (ind.stochK < 20 && ind.stochD < 20) stochScore = Math.min(15, stochScore + 3);
  if (ind.stochK > 80 && ind.stochD > 80) stochScore = Math.max(-15, stochScore - 3);
  score += stochScore;
  components.push({
    name: 'Stochastic(14) 1H',
    weight: 15,
    contribution: stochScore,
    signal: stochScore > 2 ? 'bullish' : stochScore < -2 ? 'bearish' : 'neutral'
  });

  // ── BOLLINGER BANDS: 10% weight ──────────────────
  const bbRange = ind.bbUpper - ind.bbLower;
  const bbPos = bbRange > 0 ? (ind.price - ind.bbLower) / bbRange : 0.5;
  // Price near lower band = bullish, near upper band = bearish
  const bbScore = (0.5 - bbPos) * 20;
  score += bbScore;
  components.push({
    name: 'Bollinger Bands 1H',
    weight: 10,
    contribution: bbScore,
    signal: bbScore > 2 ? 'bullish' : bbScore < -2 ? 'bearish' : 'neutral'
  });

  // ── NEWS SENTIMENT 4H: 5% weight ─────────────────
  const sentimentScore = (ind.sentiment4h ?? 0) * 5;
  score += sentimentScore;
  components.push({
    name: 'Sentiment 4H',
    weight: 5,
    contribution: sentimentScore,
    signal: sentimentScore > 0.5 ? 'bullish' : sentimentScore < -0.5 ? 'bearish' : 'neutral'
  });

  // ── ATR FILTER — Volatility context ──────────────
  let atrMultiplier = 1.0;
  let reliabilityReason: string | undefined;

  if (ind.atrPct < 0.05) {
    atrMultiplier = 0.70; // Was 0.4 - less aggressive reduction
    reliabilityReason = `ATR faible (${ind.atrPct.toFixed(2)}%) — Marche calme`;
  } else if (ind.atrPct < 0.15) {
    atrMultiplier = 0.85; // Was 0.7
    reliabilityReason = `ATR modere (${ind.atrPct.toFixed(2)}%)`;
  } else if (ind.atrPct > 2.5) {
    atrMultiplier = 0.85; // Was 0.75
    reliabilityReason = `ATR eleve (${ind.atrPct.toFixed(2)}%) — Volatilite importante`;
  } else if (ind.atrPct > 1.5) {
    atrMultiplier = 0.95; // Was 0.90
  }
  // Optimal range 0.15–1.5% = multiplier 1.0

  score = score * atrMultiplier;

  const finalScore = Math.round(Math.min(100, Math.max(-100, score)));

  // ═══════════════════════════════════════════════════════════════════════════
  // MEME LOGIQUE QUE SWING: Confiance = force, Direction = signe
  // Day trading: Max 90% confiance (plus d'incertitude sur court terme)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const absScore = Math.abs(finalScore);
  
  // Confidence basee sur la force absolue du score (capped at 90% for day)
  let confidence = Math.min(90, Math.round(absScore * 0.9));
  
  // ATR bonus (optimal volatility = clearer signals)
  const atrBonus = (ind.atrPct >= 0.15 && ind.atrPct <= 1.5) ? 10 : 0;
  confidence = Math.min(90, confidence + atrBonus);
  
  // Direction basee sur score ET confiance - meme regle que swing
  let biasLabel: BiasResult['bias'];
  
  if (confidence >= 55) {
    // Confiance forte = direction claire obligatoire
    if (finalScore >= 45) biasLabel = 'Fort Haussier';
    else if (finalScore > 0) biasLabel = 'Haussier';
    else if (finalScore <= -45) biasLabel = 'Fort Baissier';
    else biasLabel = 'Baissier';
  } else if (confidence >= 35) {
    // Zone intermediaire
    if (finalScore > 8) biasLabel = 'Haussier';
    else if (finalScore < -8) biasLabel = 'Baissier';
    else biasLabel = 'Neutre';
  } else {
    // Confiance < 35% = Neutre
    biasLabel = 'Neutre';
  }

  return {
    score: finalScore,
    bias: biasLabel,
    confidence,
    reliable: ind.atrPct >= 0.10 && ind.atrPct <= 2.5,
    reliabilityReason,
    components
  };
}
