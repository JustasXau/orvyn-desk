// Validation et parsing des reponses JSON de Groq
// Avec fallbacks intelligents si le JSON est incomplet

import type {
  AIAnalysisReport, TimeframeAnalysis, TechnicalResult,
  MacroResult, NewsResult, Direction, MarketRegime
} from '@/types/ai-analysis'

// Extraction JSON robuste (meme si Groq ajoute du texte autour)
export function extractJSON(raw: string): unknown {
  // Essai direct
  try {
    return JSON.parse(raw)
  } catch { /* continue */ }

  // Chercher le premier objet JSON valide
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch { /* continue */ }
  }

  // Tenter de nettoyer les caracteres problematiques
  const cleaned = raw
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')

  try {
    return JSON.parse(cleaned)
  } catch { /* continue */ }

  return null
}

function safeNumber(val: unknown, fallback: number): number {
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? fallback : n
}

function safeString(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.length > 0 ? val : fallback
}

function safeDirection(val: unknown): Direction {
  if (val === 'Bullish' || val === 'Bearish' || val === 'Neutral') return val
  return 'Neutral'
}

function safeMarketRegime(val: unknown): MarketRegime {
  if (val === 'Risk-On' || val === 'Risk-Off' || val === 'Stagflation' || val === 'Reflation') return val
  return 'Risk-Off'
}

function parseTimeframe(raw: unknown, price: number, label: string): TimeframeAnalysis {
  const r = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const kl = (r.keyLevels && typeof r.keyLevels === 'object') ? r.keyLevels as Record<string, unknown> : {}
  const ts = (r.technicalSignals && typeof r.technicalSignals === 'object') ? r.technicalSignals as Record<string, unknown> : {}

  return {
    verdict: safeDirection(r.verdict),
    conviction: Math.min(10, Math.max(0, safeNumber(r.conviction, 5))),
    trend: safeString(r.trend, `Tendance ${label} non determinee`),
    keyLevels: {
      pivot: safeNumber(kl.pivot, price),
      nearestSupport: safeNumber(kl.nearestSupport, price * 0.98),
      nearestResistance: safeNumber(kl.nearestResistance, price * 1.02),
      invalidation: safeNumber(kl.invalidation, price * 0.95),
      target: safeNumber(kl.target, price * 1.03),
    },
    reasoning: Array.isArray(r.reasoning) ? r.reasoning.slice(0, 3).map(String) : ['Analyse en cours'],
    technicalSignals: {
      momentum: safeString(ts.momentum, 'Momentum non evalue'),
      structure: safeString(ts.structure, 'Structure non determinee'),
      volume: safeString(ts.volume, 'Volume non analyse'),
    },
  }
}

// Valider et construire TechnicalResult depuis la reponse Groq
export function validateTechnicalResult(raw: string, price: number): TechnicalResult {
  const parsed = extractJSON(raw)
  const r = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {}
  const ri = (r.rawIndicators && typeof r.rawIndicators === 'object') ? r.rawIndicators as Record<string, unknown> : {}

  return {
    weekly: parseTimeframe(r.weekly, price, 'Weekly'),
    daily: parseTimeframe(r.daily, price, 'Daily'),
    h4: parseTimeframe(r.h4, price, 'H4'),
    rawIndicators: {
      weeklyRSI: ri.weeklyRSI ?? null,
      dailyRSI: ri.dailyRSI ?? null,
      h4RSI: ri.h4RSI ?? null,
      weeklyTrend: ri.weeklyTrend ?? 'mixed',
      dailyTrend: ri.dailyTrend ?? 'mixed',
      dominantTrend: ri.dominantTrend ?? 'mixed',
      keySupport: ri.keySupport ?? price * 0.97,
      keyResistance: ri.keyResistance ?? price * 1.03,
    },
  }
}

// Valider MacroResult
export function validateMacroResult(raw: string): MacroResult {
  const parsed = extractJSON(raw)
  const r = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {}
  const reg = (r.regime && typeof r.regime === 'object') ? r.regime as Record<string, unknown> : {}
  const cal = (r.calendarRisks && typeof r.calendarRisks === 'object') ? r.calendarRisks as Record<string, unknown> : {}
  const rd = (r.rawData && typeof r.rawData === 'object') ? r.rawData as Record<string, unknown> : {}

  return {
    regime: {
      current: safeMarketRegime(reg.current),
      confidence: safeNumber(reg.confidence, 50),
      implication: safeString(reg.implication, 'Impact non evalue'),
    },
    calendarRisks: {
      summary: safeString(cal.summary, 'Pas de calendrier disponible'),
      upcomingEvents: Array.isArray(cal.upcomingEvents) ? cal.upcomingEvents.slice(0, 5) : [],
    },
    macroSummary: safeString(r.macroSummary, 'Analyse macro en cours'),
    fedContext: safeString(r.fedContext, 'Posture Fed non determinee'),
    rawData: rd,
  }
}

// Valider NewsResult
export function validateNewsResult(raw: string): NewsResult {
  const parsed = extractJSON(raw)
  const r = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {}
  const sent = (r.sentiment && typeof r.sentiment === 'object') ? r.sentiment as Record<string, unknown> : {}
  const ca = (r.crossAsset && typeof r.crossAsset === 'object') ? r.crossAsset as Record<string, unknown> : {}
  const geo = (r.geopoliticalRisk && typeof r.geopoliticalRisk === 'object') ? r.geopoliticalRisk as Record<string, unknown> : {}

  return {
    sentiment: {
      overall: Math.min(1, Math.max(-1, safeNumber(sent.overall, 0))),
      topDrivers: Array.isArray(sent.topDrivers) ? sent.topDrivers.slice(0, 3).map(String) : [],
      trumpRisk: Math.min(10, Math.max(0, safeNumber(sent.trumpRisk, 2))),
    },
    bullishDrivers: Array.isArray(r.bullishDrivers) ? r.bullishDrivers.slice(0, 4).map(String) : [],
    bearishDrivers: Array.isArray(r.bearishDrivers) ? r.bearishDrivers.slice(0, 3).map(String) : [],
    crossAsset: {
      summary: safeString(ca.summary, 'Analyse cross-asset en cours'),
      coherence: (ca.coherence === 'Coherent' || ca.coherence === 'Divergent' || ca.coherence === 'Mixte') ? ca.coherence : 'Mixte',
      keyCorrelations: Array.isArray(ca.keyCorrelations) ? ca.keyCorrelations.slice(0, 5) : [],
    },
    trumpRisk: safeNumber(sent.trumpRisk, 2),
    rawHeadlines: Array.isArray(r.rawHeadlines) ? r.rawHeadlines.slice(0, 5).map(String) : [],
    geopoliticalRisk: {
      level: ['low', 'medium', 'high', 'critical'].includes(String(geo.level)) ? String(geo.level) as 'low' | 'medium' | 'high' | 'critical' : 'low',
      mainRisk: safeString(geo.mainRisk, 'Non identifie'),
      impact: safeString(geo.impact, 'Impact non evalue'),
    },
  }
}

// Valider le rapport de synthese final
export function validateFinalReport(
  raw: string,
  price: number,
  symbol: string,
  dataCompleteness: number,
  duration: number
): AIAnalysisReport {
  const parsed = extractJSON(raw)
  const r = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {}

  const gv = (r.globalVerdict && typeof r.globalVerdict === 'object') ? r.globalVerdict as Record<string, unknown> : {}
  const mr = (r.marketRegime && typeof r.marketRegime === 'object') ? r.marketRegime as Record<string, unknown> : {}
  const cr = (r.calendarRisks && typeof r.calendarRisks === 'object') ? r.calendarRisks as Record<string, unknown> : {}
  const ns = (r.newsSentiment && typeof r.newsSentiment === 'object') ? r.newsSentiment as Record<string, unknown> : {}
  const risks = (r.risks && typeof r.risks === 'object') ? r.risks as Record<string, unknown> : {}
  const inv = (r.invalidationLevel && typeof r.invalidationLevel === 'object') ? r.invalidationLevel as Record<string, unknown> : {}
  const sc = (r.scenarios && typeof r.scenarios === 'object') ? r.scenarios as Record<string, unknown> : {}
  const tp = (r.tradePlan && typeof r.tradePlan === 'object') ? r.tradePlan as Record<string, unknown> : {}
  const tpEntry = (tp.entry && typeof tp.entry === 'object') ? tp.entry as Record<string, unknown> : {}
  const cav = (r.crossAssetVerdict && typeof r.crossAssetVerdict === 'object') ? r.crossAssetVerdict as Record<string, unknown> : {}

  const parseScenario = (raw: unknown, defaultProb: number) => {
    const s = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
    return {
      name: safeString(s.name, 'Scenario'),
      probability: safeNumber(s.probability, defaultProb),
      trigger: safeString(s.trigger, 'Signal technique'),
      target: safeNumber(s.target, price * 1.02),
      stopLoss: safeNumber(s.stopLoss, price * 0.98),
      riskReward: safeNumber(s.riskReward, 1.5),
      catalysts: Array.isArray(s.catalysts) ? s.catalysts.slice(0, 3).map(String) : [],
    }
  }

  return {
    metadata: {
      model: 'groq-chain-v1',
      generatedAt: Date.now(),
      dataCompleteness,
      stepsCompleted: ['technical', 'macro', 'news', 'synthesis'],
      duration,
      symbol,
    },
    globalVerdict: {
      direction: safeDirection(gv.direction),
      conviction: Math.min(10, Math.max(0, safeNumber(gv.conviction, 5))),
      timeHorizon: safeString(gv.timeHorizon, '1-2 semaines'),
      summary: safeString(gv.summary, 'Analyse en cours'),
    },
    weekly: parseTimeframe(r.weekly, price, 'Weekly'),
    daily: parseTimeframe(r.daily, price, 'Daily'),
    h4: parseTimeframe(r.h4, price, 'H4'),
    crossAssetVerdict: {
      summary: safeString(cav.summary, 'Analyse cross-asset disponible'),
      coherence: (cav.coherence === 'Coherent' || cav.coherence === 'Divergent' || cav.coherence === 'Mixte') ? cav.coherence : 'Mixte',
      keyCorrelations: Array.isArray(cav.keyCorrelations) ? cav.keyCorrelations : [],
    },
    marketRegime: {
      current: safeMarketRegime(mr.current),
      confidence: safeNumber(mr.confidence, 50),
      implication: safeString(mr.implication, 'Impact non evalue'),
    },
    calendarRisks: {
      summary: safeString(cr.summary, 'Pas d\'evenement majeur identifie'),
      upcomingEvents: Array.isArray(cr.upcomingEvents) ? cr.upcomingEvents.slice(0, 5) : [],
    },
    newsSentiment: {
      overall: Math.min(1, Math.max(-1, safeNumber(ns.overall, 0))),
      topDrivers: Array.isArray(ns.topDrivers) ? ns.topDrivers.slice(0, 3).map(String) : [],
      trumpRisk: Math.min(10, Math.max(0, safeNumber(ns.trumpRisk, 2))),
    },
    bullishDrivers: Array.isArray(r.bullishDrivers) ? r.bullishDrivers.slice(0, 4).map(String) : [],
    bearishDrivers: Array.isArray(r.bearishDrivers) ? r.bearishDrivers.slice(0, 3).map(String) : [],
    risks: {
      market: Array.isArray(risks.market) ? risks.market.slice(0, 3).map(String) : [],
      geopolitical: Array.isArray(risks.geopolitical) ? risks.geopolitical.slice(0, 2).map(String) : [],
      technical: Array.isArray(risks.technical) ? risks.technical.slice(0, 2).map(String) : [],
    },
    invalidationLevel: {
      price: safeNumber(inv.price, price * 0.95),
      explanation: safeString(inv.explanation, 'Cassure du support majeur'),
    },
    scenarios: {
      base: parseScenario(sc.base, 50),
      bull: parseScenario(sc.bull, 25),
      bear: parseScenario(sc.bear, 25),
    },
    tradePlan: {
      bias: safeDirection(tp.bias),
      entry: { type: tpEntry.type === 'limit' ? 'limit' : 'market', price: safeNumber(tpEntry.price, price) },
      stopLoss: safeNumber(tp.stopLoss, price * 0.97),
      takeProfit1: safeNumber(tp.takeProfit1, price * 1.02),
      takeProfit2: safeNumber(tp.takeProfit2, price * 1.04),
      riskRewardRatio: safeNumber(tp.riskRewardRatio, 1.5),
      holdingPeriod: safeString(tp.holdingPeriod, '1-2 semaines'),
      notes: safeString(tp.notes, 'Respecter la gestion du risque'),
    },
    todayCatalyst: safeString(r.todayCatalyst, 'Surveiller les publications macro du jour'),
    confidenceScore: Math.min(100, Math.max(0, safeNumber(r.confidenceScore, 50))),
  }
}
