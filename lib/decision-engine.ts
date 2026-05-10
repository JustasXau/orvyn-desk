/**
 * INSTITUTIONAL-GRADE TRADING DECISION ENGINE
 * 
 * Pipeline: DATA → NORMALIZATION → FEATURE ENGINE → SCORING → AI → RISK → EXECUTION → COT LOG
 * 
 * You do NOT guess. You only act on confirmed signals.
 */

// ============================================================================
// TYPES
// ============================================================================

export type MarketRegime = 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'HIGH_VOLATILITY';
export type TradeBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TradeAction = 'BUY' | 'SELL' | 'HOLD';

// ============================================================================
// GLOBAL SCORE COMPUTATION (Weighted Model)
// ============================================================================

/**
 * Compute the global weighted score for trading decision
 * 
 * Weights:
 * - Technical: 70% (EMA alignment, MACD, RSI, trend)
 * - Sentiment: 20% (News, social, fear/greed)
 * - Macro: 10% (Rates, inflation, geopolitical)
 * 
 * @param tech - Technical score (-100 to 100)
 * @param sentiment - Sentiment score (-100 to 100)
 * @param macro - Macro score (-100 to 100)
 * @returns Global weighted score (-100 to 100)
 */
export function computeGlobalScore({
  tech,
  sentiment,
  macro,
}: {
  tech: number;
  sentiment: number;
  macro: number;
}): number {
  return (
    tech * 0.7 +
    sentiment * 0.2 +
    macro * 0.1
  );
}

/**
 * Interpret the global score into actionable bias
 */
export function interpretGlobalScore(score: number): {
  bias: TradeBias;
  action: TradeAction;
  confidence: number;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
} {
  const absScore = Math.abs(score);
  const confidence = Math.min(100, Math.round(50 + absScore / 2));
  
  let strength: 'STRONG' | 'MODERATE' | 'WEAK';
  if (absScore >= 60) strength = 'STRONG';
  else if (absScore >= 35) strength = 'MODERATE';
  else strength = 'WEAK';
  
  if (score >= 35) {
    return { bias: 'BULLISH', action: confidence >= 65 ? 'BUY' : 'HOLD', confidence, strength };
  } else if (score <= -35) {
    return { bias: 'BEARISH', action: confidence >= 65 ? 'SELL' : 'HOLD', confidence, strength };
  } else {
    return { bias: 'NEUTRAL', action: 'HOLD', confidence: 50, strength: 'WEAK' };
  }
}

// ============================================================================
// MARKET REGIME DETECTION
// ============================================================================

/**
 * Detect market regime based on ADX and volatility
 * 
 * @param adx - Average Directional Index (0-100)
 * @param volatility - ATR as percentage of price (e.g., 0.02 = 2%)
 * @returns Market regime: HIGH_VOLATILITY, TRENDING, or RANGING
 */
export function detectRegime(adx: number, volatility: number): 'HIGH_VOLATILITY' | 'TRENDING' | 'RANGING' {
  // High volatility takes precedence (risk management)
  if (volatility > 0.04) return 'HIGH_VOLATILITY';
  // ADX > 25 indicates trending market
  if (adx > 25) return 'TRENDING';
  // Low ADX = ranging/consolidating market
  return 'RANGING';
}

/**
 * Extended regime detection with trend direction
 */
export function detectRegimeExtended(
  adx: number, 
  volatility: number,
  ema50: number,
  ema200: number,
  price: number
): MarketRegime {
  // High volatility takes precedence
  if (volatility > 0.04) return 'HIGH_VOLATILITY';
  
  // Check if trending (ADX > 25)
  if (adx > 25) {
    // Determine trend direction
    if (price > ema50 && ema50 > ema200) return 'TRENDING_UP';
    if (price < ema50 && ema50 < ema200) return 'TRENDING_DOWN';
    // Trend exists but direction unclear
    return price > ema200 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  }
  
  // Low ADX = ranging market
  return 'RANGING';
}

export interface TechnicalScores {
  emaAlignment: number;      // -100 to 100
  macdMomentum: number;      // -100 to 100
  rsiSignal: number;         // -100 to 100
  trendStrength: number;     // 0 to 100
  mtfConfirmation: number;   // -100 to 100 (multi-timeframe)
}

export interface RawIndicators {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  adx: number;
  atr: number;
  atrPercent: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  stochK: number;
  stochD: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
  sources: string[];
}

export interface NewsSentiment {
  score: number;           // -1 to 1
  articlesCount: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  hasPanic: boolean;
  hasHype: boolean;
  recentHeadlines: string[];
}

export interface MacroData {
  interestRate: number;
  inflationRate: number;
  rateDirection: 'HAWKISH' | 'DOVISH' | 'NEUTRAL';
  energyShock: boolean;
  gdpGrowth?: number;
  sentiment: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
}

export interface DecisionInput {
  technicalScores: TechnicalScores;
  rawIndicators: RawIndicators;
  marketData: MarketData;
  newsSentiment: NewsSentiment;
  macroData: MacroData;
}

export interface DecisionOutput {
  regime: MarketRegime;
  bias: TradeBias;
  action: TradeAction;
  confidence: number;
  entry: {
    ideal: string;
    fallback: string;
  };
  risk: {
    stop_loss: string;
    take_profit: string;
    risk_reward: string;
  };
  reasoning: string[];
  warnings: string[];
  timestamp: number;
  symbol: string;
}

// ============================================================================
// STEP 1: MARKET REGIME DETECTION
// ============================================================================

export function detectMarketRegime(indicators: RawIndicators, marketData: MarketData): MarketRegime {
  const { adx, atrPercent } = indicators;
  const { changePercent } = marketData;
  
  // High volatility overrides all
  if (atrPercent > 3 || Math.abs(changePercent) > 2) {
    return 'HIGH_VOLATILITY';
  }
  
  // ADX-based trend detection
  if (adx > 25) {
    // Check trend direction using EMA alignment
    if (indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50) {
      return 'TRENDING_UP';
    }
    if (indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50) {
      return 'TRENDING_DOWN';
    }
  }
  
  // Low ADX = ranging market
  return 'RANGING';
}

// ============================================================================
// STEP 2: TECHNICAL DOMINANCE (70% weight)
// ============================================================================

export function calculateTechnicalScore(
  scores: TechnicalScores, 
  indicators: RawIndicators,
  regime: MarketRegime
): { score: number; signals: string[]; conflicts: string[] } {
  const signals: string[] = [];
  const conflicts: string[] = [];
  let totalScore = 0;
  
  // EMA Alignment (30% of technical)
  const emaScore = scores.emaAlignment * 0.30;
  totalScore += emaScore;
  
  if (scores.emaAlignment > 50) {
    signals.push('EMA alignment bullish');
  } else if (scores.emaAlignment < -50) {
    signals.push('EMA alignment bearish');
  }
  
  // MACD Momentum (25% of technical)
  const macdScore = scores.macdMomentum * 0.25;
  totalScore += macdScore;
  
  if (indicators.macdHistogram > 0 && indicators.macd > indicators.macdSignal) {
    signals.push('MACD bullish crossover');
  } else if (indicators.macdHistogram < 0 && indicators.macd < indicators.macdSignal) {
    signals.push('MACD bearish crossover');
  }
  
  // RSI - Only extremes matter (20% of technical)
  // Reject weak RSI zones (45-55)
  if (indicators.rsi >= 45 && indicators.rsi <= 55) {
    conflicts.push('RSI in neutral zone (45-55) - signal rejected');
  } else {
    const rsiScore = scores.rsiSignal * 0.20;
    totalScore += rsiScore;
    
    if (indicators.rsi < 30) {
      signals.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 70) {
      signals.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
    }
  }
  
  // Multi-timeframe confirmation (25% of technical)
  const mtfScore = scores.mtfConfirmation * 0.25;
  totalScore += mtfScore;
  
  if (Math.abs(scores.mtfConfirmation) > 50) {
    signals.push('Multi-TF confirmation strong');
  } else if (scores.mtfConfirmation > 0 !== scores.emaAlignment > 0) {
    conflicts.push('Multi-TF conflict with primary trend');
  }
  
  // Check for conflicting signals
  const bullishSignals = signals.filter(s => s.includes('bullish') || s.includes('oversold')).length;
  const bearishSignals = signals.filter(s => s.includes('bearish') || s.includes('overbought')).length;
  
  if (bullishSignals > 0 && bearishSignals > 0) {
    conflicts.push('Mixed bullish/bearish signals detected');
    totalScore *= 0.5; // Reduce confidence on conflicts
  }
  
  return { score: totalScore, signals, conflicts };
}

// ============================================================================
// STEP 3: SENTIMENT FILTER (20% weight)
// ============================================================================

export function calculateSentimentScore(sentiment: NewsSentiment): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  
  // Only strong sentiment matters
  if (Math.abs(sentiment.score) < 0.3) {
    return { score: 0, signals: ['Sentiment neutral/weak - ignored'] };
  }
  
  // Detect panic/hype cycles
  if (sentiment.hasPanic) {
    signals.push('PANIC detected - potential reversal');
    score = 30; // Contrarian signal
  } else if (sentiment.hasHype) {
    signals.push('HYPE detected - potential top');
    score = -30; // Contrarian signal
  } else {
    // Normal sentiment scoring
    score = sentiment.score * 100 * 0.20;
    
    if (sentiment.score > 0.5) {
      signals.push('Strong bullish sentiment');
    } else if (sentiment.score < -0.5) {
      signals.push('Strong bearish sentiment');
    }
  }
  
  // Article count check - ignore if too few
  if (sentiment.articlesCount < 3) {
    signals.push('Insufficient news data');
    score *= 0.5;
  }
  
  return { score, signals };
}

// ============================================================================
// STEP 4: MACRO FILTER (10% weight)
// ============================================================================

export function calculateMacroScore(macro: MacroData): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  
  // Interest rates (hawkish = bearish for risk assets)
  if (macro.rateDirection === 'HAWKISH') {
    score -= 10;
    signals.push('Hawkish rates - bearish for risk');
  } else if (macro.rateDirection === 'DOVISH') {
    score += 10;
    signals.push('Dovish rates - bullish for risk');
  }
  
  // Energy shocks
  if (macro.energyShock) {
    score -= 15;
    signals.push('Energy shock - risk-off');
  }
  
  // Inflation context
  if (macro.inflationRate > 4) {
    score -= 5;
    signals.push('High inflation environment');
  }
  
  // Overall sentiment
  if (macro.sentiment === 'RISK_OFF') {
    score -= 10;
    signals.push('Risk-off environment');
  } else if (macro.sentiment === 'RISK_ON') {
    score += 10;
    signals.push('Risk-on environment');
  }
  
  return { score: score * 0.10, signals };
}

// ============================================================================
// STEP 5: DECISION LOGIC
// ============================================================================

export function makeDecision(
  technicalResult: { score: number; signals: string[]; conflicts: string[] },
  sentimentResult: { score: number; signals: string[] },
  macroResult: { score: number; signals: string[] },
  regime: MarketRegime
): { action: TradeAction; bias: TradeBias; confidence: number; reasoning: string[]; warnings: string[] } {
  
  // Combine all scores (already weighted)
  const totalScore = (technicalResult.score * 0.70) + sentimentResult.score + macroResult.score;
  
  // Calculate raw confidence (0-100)
  let confidence = Math.min(100, Math.abs(totalScore));
  
  // Collect all signals and warnings
  const reasoning = [
    ...technicalResult.signals.slice(0, 2),
    ...sentimentResult.signals.slice(0, 1),
    ...macroResult.signals.slice(0, 1),
  ].slice(0, 5);
  
  const warnings = [...technicalResult.conflicts];
  
  // Determine bias
  let bias: TradeBias = 'NEUTRAL';
  if (totalScore > 20) bias = 'BULLISH';
  else if (totalScore < -20) bias = 'BEARISH';
  
  // HARD RULES
  let action: TradeAction = 'HOLD';
  
  // Rule 1: No trend → HOLD
  if (regime === 'RANGING') {
    warnings.push('No clear trend - HOLD enforced');
    confidence = Math.min(confidence, 50);
    return { action: 'HOLD', bias, confidence, reasoning, warnings };
  }
  
  // Rule 2: High volatility caution
  if (regime === 'HIGH_VOLATILITY') {
    warnings.push('High volatility - reduced position size recommended');
    confidence *= 0.8;
  }
  
  // Rule 3: Confidence < 65 → HOLD
  if (confidence < 65) {
    warnings.push(`Confidence ${confidence.toFixed(0)}% below threshold (65%)`);
    return { action: 'HOLD', bias, confidence, reasoning, warnings };
  }
  
  // Rule 4: Conflicting signals → HOLD
  if (technicalResult.conflicts.length >= 2) {
    warnings.push('Too many conflicting signals');
    return { action: 'HOLD', bias, confidence: confidence * 0.7, reasoning, warnings };
  }
  
  // Strong alignment → BUY/SELL
  if (totalScore > 40 && regime === 'TRENDING_UP') {
    action = 'BUY';
    reasoning.unshift('Strong bullish alignment in uptrend');
  } else if (totalScore < -40 && regime === 'TRENDING_DOWN') {
    action = 'SELL';
    reasoning.unshift('Strong bearish alignment in downtrend');
  }
  
  return { action, bias, confidence, reasoning, warnings };
}

// ============================================================================
// STEP 6: RISK MANAGEMENT
// ============================================================================

export function calculateRisk(
  marketData: MarketData,
  indicators: RawIndicators,
  action: TradeAction,
  bias: TradeBias
): { stop_loss: string; take_profit: string; risk_reward: string; idealEntry: string; fallbackEntry: string } {
  
  const { price, high, low } = marketData;
  const { atr, bbUpper, bbLower, ema21 } = indicators;
  
  let stopLoss: number;
  let takeProfit: number;
  let idealEntry: number;
  let fallbackEntry: number;
  
  if (action === 'BUY' || (action === 'HOLD' && bias === 'BULLISH')) {
    // Long setup
    stopLoss = Math.min(low - atr * 1.5, bbLower);
    takeProfit = price + (atr * 3);
    idealEntry = Math.max(ema21, price - atr * 0.5);
    fallbackEntry = price;
  } else if (action === 'SELL' || (action === 'HOLD' && bias === 'BEARISH')) {
    // Short setup
    stopLoss = Math.max(high + atr * 1.5, bbUpper);
    takeProfit = price - (atr * 3);
    idealEntry = Math.min(ema21, price + atr * 0.5);
    fallbackEntry = price;
  } else {
    // Neutral - no trade
    return {
      stop_loss: 'N/A',
      take_profit: 'N/A',
      risk_reward: 'N/A',
      idealEntry: 'N/A',
      fallbackEntry: 'N/A'
    };
  }
  
  const risk = Math.abs(price - stopLoss);
  const reward = Math.abs(takeProfit - price);
  const riskReward = reward / risk;
  
  // Format based on symbol type
  const decimals = price > 100 ? 2 : price > 10 ? 3 : 5;
  
  return {
    stop_loss: stopLoss.toFixed(decimals),
    take_profit: takeProfit.toFixed(decimals),
    risk_reward: `1:${riskReward.toFixed(2)}`,
    idealEntry: idealEntry.toFixed(decimals),
    fallbackEntry: fallbackEntry.toFixed(decimals)
  };
}

// ============================================================================
// MAIN DECISION ENGINE
// ============================================================================

export function runDecisionEngine(input: DecisionInput): DecisionOutput {
  const { technicalScores, rawIndicators, marketData, newsSentiment, macroData } = input;
  
  // STEP 1: Market Regime Detection
  const regime = detectMarketRegime(rawIndicators, marketData);
  
  // STEP 2: Technical Dominance (70%)
  const technicalResult = calculateTechnicalScore(technicalScores, rawIndicators, regime);
  
  // STEP 3: Sentiment Filter (20%)
  const sentimentResult = calculateSentimentScore(newsSentiment);
  
  // STEP 4: Macro Filter (10%)
  const macroResult = calculateMacroScore(macroData);
  
  // STEP 5: Decision Logic
  const decision = makeDecision(technicalResult, sentimentResult, macroResult, regime);
  
  // STEP 6: Risk Management
  const risk = calculateRisk(marketData, rawIndicators, decision.action, decision.bias);
  
  // STEP 7: Build output
  const output: DecisionOutput = {
    regime,
    bias: decision.bias,
    action: decision.action,
    confidence: Math.round(decision.confidence),
    entry: {
      ideal: risk.idealEntry,
      fallback: risk.fallbackEntry
    },
    risk: {
      stop_loss: risk.stop_loss,
      take_profit: risk.take_profit,
      risk_reward: risk.risk_reward
    },
    reasoning: decision.reasoning,
    warnings: decision.warnings,
    timestamp: Date.now(),
    symbol: marketData.symbol
  };
  
  // HARD RULE: Always include stop loss
  if (output.action !== 'HOLD' && output.risk.stop_loss === 'N/A') {
    output.warnings.push('CRITICAL: No stop loss calculated - trade rejected');
    output.action = 'HOLD';
  }
  
  return output;
}

// ============================================================================
// HELPER: Create default inputs for testing
// ============================================================================

export function createDefaultMacroData(): MacroData {
  return {
    interestRate: 5.25,
    inflationRate: 3.2,
    rateDirection: 'NEUTRAL',
    energyShock: false,
    sentiment: 'NEUTRAL'
  };
}

export function createDefaultNewsSentiment(): NewsSentiment {
  return {
    score: 0,
    articlesCount: 0,
    bullishCount: 0,
    bearishCount: 0,
    neutralCount: 0,
    hasPanic: false,
    hasHype: false,
    recentHeadlines: []
  };
}
