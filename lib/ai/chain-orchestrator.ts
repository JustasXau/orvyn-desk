// Orchestrateur du chain-of-thought — coordonne les 4 appels Groq en cascade
// Etapes 1/2/3 en parallele, etape 4 attend les resultats

import { collectAllData, type CollectedData } from './data-collector'
import { callGroq } from './groq-client'
import { buildTechnicalPrompt } from './prompt-builders/technical-prompt'
import { buildMacroPrompt } from './prompt-builders/macro-prompt'
import { buildNewsPrompt } from './prompt-builders/news-prompt'
import { buildSynthesisPrompt } from './prompt-builders/synthesis-prompt'
import {
  validateTechnicalResult,
  validateMacroResult,
  validateNewsResult,
  validateFinalReport,
} from './response-validator'
import type { AIAnalysisReport, TechnicalResult, MacroResult, NewsResult, ChainProgress } from '@/types/ai-analysis'

export type ProgressCallback = (progress: ChainProgress) => void

export interface OrchestrationResult {
  report: AIAnalysisReport
  data: CollectedData
  duration: number
  steps: {
    dataCollection: number
    technical: number
    macro: number
    news: number
    synthesis: number
  }
}

// Fallback analytique pur si Groq est indisponible
function buildMathematicalFallback(data: CollectedData): AIAnalysisReport {
  const price = data.currentPrice ?? 0
  const daily = data.daily
  const rsi = daily?.rsi ?? 50
  const emaBundle = daily?.ema

  let direction: AIAnalysisReport['globalVerdict']['direction'] = 'Neutral'
  let conviction = 5

  if (emaBundle?.trend === 'bullish' && rsi > 50 && rsi < 70) {
    direction = 'Bullish'; conviction = 6
  } else if (emaBundle?.trend === 'bearish' && rsi < 50 && rsi > 30) {
    direction = 'Bearish'; conviction = 6
  }

  const support = daily?.pivots?.nearestSupport ?? price * 0.97
  const resistance = daily?.pivots?.nearestResistance ?? price * 1.03

  return {
    metadata: {
      model: 'mathematical-fallback',
      generatedAt: Date.now(),
      dataCompleteness: data.dataCompleteness,
      stepsCompleted: [],
      duration: 0,
      symbol: data.symbol,
    },
    globalVerdict: {
      direction,
      conviction,
      timeHorizon: '1 semaine',
      summary: `Analyse mathematique (Groq indisponible). EMA: ${emaBundle?.trend ?? 'N/A'}, RSI: ${rsi}. Support: ${support.toFixed(2)}, Resistance: ${resistance.toFixed(2)}.`,
    },
    weekly: { verdict: direction, conviction: 5, trend: 'Trend mathematique', keyLevels: { pivot: price, nearestSupport: support, nearestResistance: resistance, invalidation: price * 0.94, target: resistance }, reasoning: ['Signal EMA', 'RSI position', 'Niveaux pivots'], technicalSignals: { momentum: `RSI ${rsi}`, structure: emaBundle?.description ?? 'N/A', volume: 'Non evalue' } },
    daily: { verdict: direction, conviction: 5, trend: 'Trend mathematique', keyLevels: { pivot: price, nearestSupport: support, nearestResistance: resistance, invalidation: price * 0.96, target: resistance }, reasoning: ['EMA daily', 'MACD direction', 'Bollinger position'], technicalSignals: { momentum: `RSI ${rsi}`, structure: daily?.structure.description ?? 'N/A', volume: 'Non evalue' } },
    h4: { verdict: direction, conviction: 4, trend: 'Trend mathematique H4', keyLevels: { pivot: price, nearestSupport: support * 1.005, nearestResistance: resistance * 0.998, invalidation: price * 0.97, target: resistance * 0.998 }, reasoning: ['H4 structure', 'Momentum', 'Niveau pivot'], technicalSignals: { momentum: 'Non evalue', structure: 'Non evalue', volume: 'Non evalue' } },
    crossAssetVerdict: { summary: 'Analyse cross-asset non disponible (mode fallback)', coherence: 'Mixte', keyCorrelations: [] },
    marketRegime: { current: 'Risk-Off', confidence: 30, implication: 'Regime non determine — donnees Groq indisponibles' },
    calendarRisks: { summary: data.calendar.summary, upcomingEvents: data.calendar.events.slice(0, 3) },
    newsSentiment: { overall: 0, topDrivers: data.rssNews.items.slice(0, 3).map(i => i.title), trumpRisk: 3 },
    bullishDrivers: ['Signal EMA haussier', 'RSI momentum'],
    bearishDrivers: ['Groq indisponible — analyse limitee'],
    risks: { market: ['Analyse incomplète'], geopolitical: [data.geopolitical.summary], technical: ['Fallback mathematique'] },
    invalidationLevel: { price: price * 0.95, explanation: 'Cassure support majeur' },
    scenarios: {
      base: { name: 'Scenario continuation', probability: 50, trigger: 'Maintien au-dessus du support', target: resistance, stopLoss: support, riskReward: 1.5, catalysts: ['Signal EMA'] },
      bull: { name: 'Scenario haussier', probability: 25, trigger: 'Cassure resistance', target: resistance * 1.03, stopLoss: support * 0.99, riskReward: 2.5, catalysts: ['Volume fort'] },
      bear: { name: 'Scenario baissier', probability: 25, trigger: 'Cassure support', target: support * 0.97, stopLoss: resistance * 1.01, riskReward: 1.5, catalysts: ['Pression vendeurs'] },
    },
    tradePlan: { bias: direction, entry: { type: 'market', price }, stopLoss: support, takeProfit1: resistance, takeProfit2: resistance * 1.02, riskRewardRatio: 1.5, holdingPeriod: '1 semaine', notes: 'Mode fallback — utiliser avec precaution' },
    todayCatalyst: data.calendar.nextHighImpact?.event ?? 'Surveiller les publications macro',
    confidenceScore: 25,
  }
}

export async function runChainOfThought(
  symbol: string,
  onProgress?: ProgressCallback
): Promise<OrchestrationResult> {
  const totalStart = Date.now()
  const steps = { dataCollection: 0, technical: 0, macro: 0, news: 0, synthesis: 0 }

  const progress: ChainProgress = {
    technical: 'pending',
    macro: 'pending',
    news: 'pending',
    synthesis: 'pending',
  }

  const notify = (p: Partial<ChainProgress>) => {
    Object.assign(progress, p)
    onProgress?.(progress)
  }

  // ─── ETAPE 0: Collecte des donnees ──────────────────────────────────────────
  const dataStart = Date.now()
  const data = await collectAllData(symbol)
  steps.dataCollection = Date.now() - dataStart

  const price = data.currentPrice ?? 0

  if (data.dataCompleteness < 10) {
    console.warn(`[Chain] Completude critique: ${data.dataCompleteness}% pour ${symbol}`)
  }

  // ─── ETAPES 1, 2, 3 EN PARALLELE ────────────────────────────────────────────
  notify({ technical: 'running', macro: 'running', news: 'running' })

  const [techResult, macroResult, newsResult] = await Promise.all([
    // Agent 1: Technical
    (async (): Promise<TechnicalResult> => {
      const t = Date.now()
      try {
        const prompt = buildTechnicalPrompt(data)
        const res = await callGroq('technical', '', prompt)
        steps.technical = Date.now() - t
        notify({ technical: 'done' })
        return validateTechnicalResult(res.content, price)
      } catch (err) {
        console.error('[Chain][Technical] Erreur:', err)
        notify({ technical: 'error' })
        // Fallback mathematique pour l'etape technique
        return validateTechnicalResult('{}', price)
      }
    })(),

    // Agent 2: Macro
    (async (): Promise<MacroResult> => {
      const t = Date.now()
      try {
        const prompt = buildMacroPrompt(data)
        const res = await callGroq('macro', '', prompt)
        steps.macro = Date.now() - t
        notify({ macro: 'done' })
        return validateMacroResult(res.content)
      } catch (err) {
        console.error('[Chain][Macro] Erreur:', err)
        notify({ macro: 'error' })
        return validateMacroResult('{}')
      }
    })(),

    // Agent 3: News
    (async (): Promise<NewsResult> => {
      const t = Date.now()
      try {
        const prompt = buildNewsPrompt(data)
        const res = await callGroq('news', '', prompt)
        steps.news = Date.now() - t
        notify({ news: 'done' })
        return validateNewsResult(res.content)
      } catch (err) {
        console.error('[Chain][News] Erreur:', err)
        notify({ news: 'error' })
        return validateNewsResult('{}')
      }
    })(),
  ])

  // ─── ETAPE 4: SYNTHESE FINALE ────────────────────────────────────────────────
  notify({ synthesis: 'running' })

  let finalReport: AIAnalysisReport

  try {
    const synthStart = Date.now()
    const synthPrompt = buildSynthesisPrompt(data, techResult, macroResult, newsResult)
    const synthRes = await callGroq('synthesis', '', synthPrompt)
    steps.synthesis = Date.now() - synthStart

    finalReport = validateFinalReport(
      synthRes.content,
      price,
      data.symbol,
      data.dataCompleteness,
      Date.now() - totalStart
    )

    // Injecter les sources dans le rapport
    finalReport.sources = data.sources
    finalReport.metadata.duration = Date.now() - totalStart

    notify({ synthesis: 'done' })
  } catch (err) {
    console.error('[Chain][Synthesis] Erreur, fallback mathematique:', err)
    notify({ synthesis: 'error' })
    finalReport = buildMathematicalFallback(data)
    finalReport.sources = data.sources
  }

  return {
    report: finalReport,
    data,
    duration: Date.now() - totalStart,
    steps,
  }
}
