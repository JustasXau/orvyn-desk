// Types TypeScript pour le systeme d'analyse IA ORVYNDESK
// Correspond exactement au JSON retourne par le chain-of-thought Groq

export type Direction = 'Bullish' | 'Bearish' | 'Neutral'
export type MarketRegime = 'Risk-On' | 'Risk-Off' | 'Stagflation' | 'Reflation'
export type Coherence = 'Coherent' | 'Divergent' | 'Mixte'
export type EventImpact = 'high' | 'medium' | 'low'
export type EntryType = 'market' | 'limit'
export type ChainStep = 'technical' | 'macro' | 'news' | 'synthesis'
export type SourceStatus = 'ok' | 'down' | 'partial'

// ─── NIVEAUX CLES ────────────────────────────────────────────────────────────
export interface KeyLevels {
  pivot: number
  nearestSupport: number
  nearestResistance: number
  invalidation: number
  target: number
}

// ─── SIGNAUX TECHNIQUES ──────────────────────────────────────────────────────
export interface TechnicalSignals {
  momentum: string   // ex: "RSI 62, pas surachete"
  structure: string  // ex: "Higher highs maintenue"
  volume: string     // ex: "Volume institutionnel"
}

// ─── ANALYSE PAR TIMEFRAME ───────────────────────────────────────────────────
export interface TimeframeAnalysis {
  verdict: Direction
  conviction: number          // 0-10
  trend: string               // ex: "Haussiere depuis 8 semaines"
  keyLevels: KeyLevels
  reasoning: string[]         // 3 raisons concretes
  technicalSignals: TechnicalSignals
}

// ─── CORRELATION CROSS-ASSET ─────────────────────────────────────────────────
export interface KeyCorrelation {
  pair: string
  correlation: number         // -100 a +100
  interpretation: string
}

export interface CrossAssetVerdict {
  summary: string
  coherence: Coherence
  keyCorrelations: KeyCorrelation[]
}

// ─── REGIME DE MARCHE ────────────────────────────────────────────────────────
export interface MarketRegimeData {
  current: MarketRegime
  confidence: number          // 0-100
  implication: string         // ex: "Favorable pour le gold"
}

// ─── CALENDRIER ECONOMIQUE ───────────────────────────────────────────────────
export interface UpcomingEvent {
  date: string                // ex: "Demain 14h30"
  event: string               // ex: "CPI US"
  impact: EventImpact
  expectedReaction: string    // ex: "Si > 3.2% → DXY↑ Gold↓"
}

export interface CalendarRisks {
  summary: string
  upcomingEvents: UpcomingEvent[]
}

// ─── SENTIMENT NEWS ──────────────────────────────────────────────────────────
export interface NewsSentiment {
  overall: number             // -1 a +1
  topDrivers: string[]
  trumpRisk: number           // 0-10
}

// ─── RISQUES ────────────────────────────────────────────────────────────────
export interface Risks {
  market: string[]
  geopolitical: string[]
  technical: string[]
}

// ─── NIVEAU D'INVALIDATION ───────────────────────────────────────────────────
export interface InvalidationLevel {
  price: number
  explanation: string
}

// ─── SCENARIO ────────────────────────────────────────────────────────────────
export interface Scenario {
  name: string
  probability: number         // 0-100, les 3 doivent = 100
  trigger: string
  target: number
  stopLoss: number
  riskReward: number
  catalysts: string[]
}

export interface Scenarios {
  base: Scenario
  bull: Scenario
  bear: Scenario
}

// ─── PLAN DE TRADE ───────────────────────────────────────────────────────────
export interface TradePlan {
  bias: Direction
  entry: { type: EntryType; price: number }
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  riskRewardRatio: number
  holdingPeriod: string
  notes: string
}

// ─── VERDICT GLOBAL ──────────────────────────────────────────────────────────
export interface GlobalVerdict {
  direction: Direction
  conviction: number          // 0-10
  timeHorizon: string         // ex: "2 semaines a 1 mois"
  summary: string             // 3-4 phrases
}

// ─── METADATA ────────────────────────────────────────────────────────────────
export interface AnalysisMetadata {
  model: string
  generatedAt: number
  dataCompleteness: number    // 0-100
  stepsCompleted: ChainStep[]
  duration: number            // ms
  symbol: string
}

// ─── SOURCE DE DONNEES ───────────────────────────────────────────────────────
export interface DataSourceInfo {
  name: string
  url?: string
  status: SourceStatus
  latency?: number            // ms
  dataPoints?: number
}

// ─── RAPPORT COMPLET ─────────────────────────────────────────────────────────
export interface AIAnalysisReport {
  metadata: AnalysisMetadata
  globalVerdict: GlobalVerdict
  weekly: TimeframeAnalysis
  daily: TimeframeAnalysis
  h4: TimeframeAnalysis
  crossAssetVerdict: CrossAssetVerdict
  marketRegime: MarketRegimeData
  calendarRisks: CalendarRisks
  newsSentiment: NewsSentiment
  bullishDrivers: string[]
  bearishDrivers: string[]
  risks: Risks
  invalidationLevel: InvalidationLevel
  scenarios: Scenarios
  tradePlan: TradePlan
  todayCatalyst: string
  confidenceScore: number     // 0-100
  sources?: DataSourceInfo[]
}

// ─── ETAT DU CHAIN-OF-THOUGHT ────────────────────────────────────────────────
export type ChainStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface ChainProgress {
  technical: ChainStepStatus
  macro: ChainStepStatus
  news: ChainStepStatus
  synthesis: ChainStepStatus
}

// ─── RESULTATS INTERMEDIAIRES ────────────────────────────────────────────────
export interface TechnicalResult {
  weekly: Partial<TimeframeAnalysis>
  daily: Partial<TimeframeAnalysis>
  h4: Partial<TimeframeAnalysis>
  rawIndicators: Record<string, unknown>
}

export interface MacroResult {
  regime: MarketRegimeData
  calendarRisks: CalendarRisks
  macroSummary: string
  fedContext: string
  rawData: Record<string, unknown>
}

export interface NewsResult {
  sentiment: NewsSentiment
  bullishDrivers: string[]
  bearishDrivers: string[]
  crossAsset: CrossAssetVerdict
  trumpRisk: number
  rawHeadlines: string[]
}

// ─── HOOK STATE ──────────────────────────────────────────────────────────────
export interface AIAnalysisState {
  report: AIAnalysisReport | null
  progress: ChainProgress
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}
