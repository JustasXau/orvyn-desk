// ═══════════════════════════════════════════════════════════════════════════
// MARKET STRUCTURE ANALYSIS — Professional Order Flow Analysis
// ═══════════════════════════════════════════════════════════════════════════
//
// Détecte les structures de marché professionnelles:
// - Higher High / Higher Low (HH/HL) = uptrend
// - Lower High / Lower Low (LH/LL) = downtrend
// - Break of Structure (BOS) = changement de tendance
// - Change of Character (CHoCH) = affaissement puis continuation
// - Order Blocks = dernier mouvement impulsif avant reversal
//

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketStructure {
  type: 'HH' | 'HL' | 'LH' | 'LL' | 'BOS' | 'CHoCH' | 'none';
  strength: number; // 0 → 100 (score de confiance)
  signal: 'bullish' | 'bearish' | 'neutral';
  level?: number; // Prix du dernier pivot
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  range: number;
  isRetesting: boolean; // Prix actuel reteste cet OB
  retestStrength: number; // 0 → 100 (proximité du retest)
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. DETECT MARKET STRUCTURE — HH/HL/LH/LL & BOS/CHoCH
// ═══════════════════════════════════════════════════════════════════════════

export function detectMarketStructure(candles: Candle[]): MarketStructure {
  if (candles.length < 5) return { type: 'none', strength: 0, signal: 'neutral' };

  const recent = candles.slice(-10); // Examine dernières 10 bougies
  const swings = detectSwingPoints(recent);
  
  if (swings.length < 3) {
    return { type: 'none', strength: 0, signal: 'neutral' };
  }

  // Prendre les 3 derniers swings
  const [s1, s2, s3] = swings.slice(-3);

  // ── Détecter HH/HL/LH/LL ──
  let structureType: 'HH' | 'HL' | 'LH' | 'LL' | 'none' = 'none';
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (s3.high > s2.high && s3.low > s2.low) {
    structureType = 'HH'; // Higher Highs = Strong uptrend
    signal = 'bullish';
  } else if (s3.high < s2.high && s3.low < s2.low) {
    structureType = 'LL'; // Lower Lows = Strong downtrend
    signal = 'bearish';
  } else if (s3.high > s2.high && s3.low < s2.low) {
    structureType = 'HH'; // Swing higher
    signal = 'bullish';
  } else if (s3.high < s2.high && s3.low > s2.low) {
    structureType = 'LL'; // Swing lower
    signal = 'bearish';
  }

  // ── Détecter BOS (Break of Structure) ──
  const bosLevel = s2.type === 'high' ? s2.value : s2.value;
  const isBOS = structureType === 'HH' && recent[recent.length - 1].low > bosLevel;
  
  const finalType = isBOS ? 'BOS' : structureType;
  const strength = calculateStructureStrength(swings);

  return {
    type: finalType,
    strength,
    signal,
    level: bosLevel,
  };
}

// Detecter les points de swing (High/Low locaux)
interface SwingPoint {
  type: 'high' | 'low';
  value: number;
  index: number;
}

function detectSwingPoints(candles: Candle[]): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const curr = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    // Détecte un High (pic local)
    if (curr.high > prev2.high && curr.high > prev1.high && 
        curr.high > next1.high && curr.high > next2.high) {
      swings.push({ type: 'high', value: curr.high, index: i });
    }
    // Détecte un Low (creux local)
    else if (curr.low < prev2.low && curr.low < prev1.low && 
             curr.low < next1.low && curr.low < next2.low) {
      swings.push({ type: 'low', value: curr.low, index: i });
    }
  }

  return swings;
}

function calculateStructureStrength(swings: SwingPoint[]): number {
  if (swings.length < 2) return 0;

  const last = swings[swings.length - 1];
  const prev = swings[swings.length - 2];

  // Plus la distance entre swings est grande, plus c'est fort
  const distance = Math.abs(last.value - prev.value);
  return Math.min(100, distance * 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. DETECT ORDER BLOCKS — Dernière impulsion avant move fort
// ═══════════════════════════════════════════════════════════════════════════

export function detectOrderBlock(candles: Candle[], currentPrice: number): OrderBlock | null {
  if (candles.length < 5) return null;

  const recent = candles.slice(-20);
  const swings = detectSwingPoints(recent);

  if (swings.length < 2) return null;

  // Prendre le dernier swing
  const lastSwing = swings[swings.length - 1];
  const prevSwing = swings[swings.length - 2];

  // L'Order Block est la bougie avec le mouvement le plus fort avant le pivot
  let obCandle = candles[lastSwing.index];

  // Si c'était un High, l'OB est baissier (le dernier down move)
  if (lastSwing.type === 'high') {
    const downCandles = recent
      .slice(prevSwing.index, lastSwing.index)
      .sort((a, b) => (a.low - a.high) - (b.low - b.high));
    obCandle = downCandles[0]; // Le candle avec le plus grand down move
  } else {
    // Si c'était un Low, l'OB est haussier
    const upCandles = recent
      .slice(prevSwing.index, lastSwing.index)
      .sort((a, b) => (b.high - b.low) - (a.high - a.low));
    obCandle = upCandles[0];
  }

  const range = Math.abs(obCandle.high - obCandle.low);
  
  // Vérifier si le prix reteste l'OB
  const tolerance = range * 0.1; // 10% de tolerance
  const isRetesting =
    currentPrice > obCandle.low - tolerance &&
    currentPrice < obCandle.high + tolerance;

  // Force du retest (1 = à la bordure, 100 = au centre)
  const retestStrength = isRetesting
    ? 100 - (Math.abs(currentPrice - (obCandle.high + obCandle.low) / 2) / range) * 200
    : 0;

  return {
    type: lastSwing.type === 'high' ? 'bearish' : 'bullish',
    high: obCandle.high,
    low: obCandle.low,
    range,
    isRetesting,
    retestStrength: Math.max(0, retestStrength),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ECONOMIC CALENDAR FILTER
// ═══════════════════════════════════════════════════════════════════════════

export interface EconomicEvent {
  name: string;
  impact: 'high' | 'medium' | 'low';
  time: number; // timestamp
  currency?: string;
  forecast?: number;
  previous?: number;
}

// High impact events que nous cherchons
const HIGH_IMPACT_EVENTS = ['NFP', 'CPI', 'FOMC', 'ECB', 'BOE', 'RBA', 'RBNZ', 'PPI', 'Retail Sales'];

export function checkEconomicRisk(
  upcomingEvents: EconomicEvent[],
  timeWindowMinutes: number = 120
): {
  newsRisk: boolean;
  nextEvent?: EconomicEvent;
  minutesUntil?: number;
  confidenceReduction: number; // % de réduction de confiance pour day bias
} {
  const now = Date.now();
  const windowEnd = now + timeWindowMinutes * 60 * 1000;

  // Chercher les events haute impact dans la fenêtre
  const risky = upcomingEvents.filter(e => {
    if (e.impact !== 'high') return false;
    if (!HIGH_IMPACT_EVENTS.some(evt => e.name.includes(evt))) return false;
    return e.time > now && e.time <= windowEnd;
  });

  if (risky.length === 0) {
    return { newsRisk: false, confidenceReduction: 0 };
  }

  const nextEvent = risky[0];
  const minutesUntil = (nextEvent.time - now) / 60000;

  // Réduction de confiance proportionnelle à la proximité
  // À 120 min: 30% reduction
  // À 0 min: 60% reduction
  const confidenceReduction = 30 + ((120 - minutesUntil) / 120) * 30;

  return {
    newsRisk: true,
    nextEvent,
    minutesUntil,
    confidenceReduction: Math.min(60, confidenceReduction),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CORRELATION FILTER — Ajuste le score selon les corrélations
// ═══════════════════════════════════════════════════════════════════════════

export function applyCorrelationFilter(
  biasScore: number,
  symbol: string,
  correlatedPricesDirection: Record<string, number> // { 'DXY': +5 (up) ou -5 (down) }
): { adjustedScore: number; reduction: number } {
  let score = biasScore;
  let totalReduction = 0;

  // Pour les paires USD: DXY inverse leur mouvement
  if (symbol.includes('USD') && correlatedPricesDirection['DXY']) {
    const dxyDir = correlatedPricesDirection['DXY'];
    // Si notre bias est HAUSSIER (+score) mais DXY monte (-15% correction)
    if (biasScore > 0 && dxyDir > 0) {
      const reduction = 15;
      score -= reduction;
      totalReduction += reduction;
    }
    // Si notre bias est BAISSIER (-score) mais DXY baisse (maintient le bias)
    else if (biasScore < 0 && dxyDir < 0) {
      // Pas de correction - c'est aligné
    }
  }

  return {
    adjustedScore: Math.max(-100, Math.min(100, score)),
    reduction: totalReduction,
  };
}
