// Prompt pour le "Senior Strategist" — Synthese finale (Etape 4)
// C'est le fichier LE PLUS IMPORTANT — reçoit les 3 analyses precedentes

import type { CollectedData } from '../data-collector'
import type { TechnicalResult, MacroResult, NewsResult } from '@/types/ai-analysis'

export function buildSynthesisPrompt(
  data: CollectedData,
  technical: TechnicalResult,
  macro: MacroResult,
  news: NewsResult
): string {
  const price = data.currentPrice
  const sym = data.symbol

  // Compiler le contexte technique
  const techSummary = `
WEEKLY: ${technical.weekly?.verdict ?? 'N/A'} (conviction ${technical.weekly?.conviction ?? '?'}/10) — ${technical.weekly?.trend ?? ''}
DAILY:  ${technical.daily?.verdict ?? 'N/A'} (conviction ${technical.daily?.conviction ?? '?'}/10) — ${technical.daily?.trend ?? ''}
H4:     ${technical.h4?.verdict ?? 'N/A'} (conviction ${technical.h4?.conviction ?? '?'}/10) — ${technical.h4?.trend ?? ''}

Support cle: ${(technical.rawIndicators as { keySupport?: number })?.keySupport ?? 'N/A'}
Resistance cle: ${(technical.rawIndicators as { keyResistance?: number })?.keyResistance ?? 'N/A'}
Tendance dominante: ${(technical.rawIndicators as { dominantTrend?: string })?.dominantTrend ?? 'N/A'}
RSI Daily: ${(technical.rawIndicators as { dailyRSI?: number })?.dailyRSI ?? 'N/A'}`

  // Compiler le contexte macro
  const macroSummary = `
Regime: ${macro.regime.current} (confiance ${macro.regime.confidence}%)
Implication: ${macro.regime.implication}
Fed: ${macro.fedContext}
${macro.macroSummary}
Prochain event high-impact: ${data.calendar.nextHighImpact?.event ?? 'Aucun identifie'}`

  // Compiler le contexte news
  const newsSummary = `
Sentiment global: ${news.sentiment.overall > 0 ? '+' : ''}${news.sentiment.overall} (${news.sentiment.overall > 0.3 ? 'bullish' : news.sentiment.overall < -0.3 ? 'bearish' : 'neutre'})
Trump Risk: ${news.sentiment.trumpRisk}/10
Drivers haussiers: ${news.bullishDrivers.slice(0, 3).join(' | ')}
Drivers baissiers: ${news.bearishDrivers.slice(0, 2).join(' | ')}
Cross-asset: ${news.crossAsset.coherence} — ${news.crossAsset.summary}
Geopolitique: ${news.geopoliticalRisk.level.toUpperCase()} — ${news.geopoliticalRisk.mainRisk}`

  return `Tu es un stratege senior de niveau institutionnel (Tier 1 bank).
Tu as reçu l'analyse de 3 experts. Ta mission: produire LE rapport de synthese definitif pour ${data.fullName} (${sym}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE DE BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Symbole: ${sym} (${data.fullName})
Prix actuel: ${price ?? 'N/A'} USD
Variation 24h: ${data.priceChangePct24h != null ? `${data.priceChangePct24h > 0 ? '+' : ''}${data.priceChangePct24h.toFixed(2)}%` : 'N/A'}
High/Low 24h: ${data.high24h ?? 'N/A'} / ${data.low24h ?? 'N/A'}
Completude donnees: ${data.dataCompleteness}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAPPORT TECHNIQUE (Expert 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${techSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAPPORT MACRO (Expert 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${macroSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAPPORT SENTIMENT/NEWS (Expert 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${newsSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLES ABSOLUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. JAMAIS de "Neutral 50%" si les signaux convergent — soit bullish soit bearish
2. JAMAIS inventer un prix — tous les niveaux doivent etre coherents avec ${price ?? 'le prix actuel'}
3. La somme des probabilites des 3 scenarios = 100%
4. R/R minimum 1.5 pour tout trade plan
5. Conviction > 5 si 2+ experts d'accord, > 7 si les 3 sont d'accord
6. Style: francais professionnel, concis, CITE les chiffres reels
7. Le todayCatalyst doit etre UN evenement specifique des 24h a venir

Reponds UNIQUEMENT avec ce JSON valide et complet:
{
  "metadata": {
    "model": "groq-chain-v1",
    "generatedAt": ${Date.now()},
    "dataCompleteness": ${data.dataCompleteness},
    "stepsCompleted": ["technical", "macro", "news", "synthesis"],
    "duration": 0,
    "symbol": "${sym}"
  },
  "globalVerdict": {
    "direction": "Bullish"|"Bearish"|"Neutral",
    "conviction": <0-10>,
    "timeHorizon": "<ex: 1-2 semaines>",
    "summary": "<3-4 phrases avec chiffres reels>"
  },
  "weekly": {
    "verdict": "Bullish"|"Bearish"|"Neutral",
    "conviction": <0-10>,
    "trend": "<description>",
    "keyLevels": { "pivot": <n>, "nearestSupport": <n>, "nearestResistance": <n>, "invalidation": <n>, "target": <n> },
    "reasoning": ["<avec chiffres>", "<avec chiffres>", "<avec chiffres>"],
    "technicalSignals": { "momentum": "<RSI X>", "structure": "<HH/HL>", "volume": "<description>" }
  },
  "daily": { <meme structure> },
  "h4": { <meme structure> },
  "crossAssetVerdict": {
    "summary": "<synthese>",
    "coherence": "Coherent"|"Divergent"|"Mixte",
    "keyCorrelations": [{ "pair": "<sym>", "correlation": <n>, "interpretation": "<texte>" }]
  },
  "marketRegime": {
    "current": "Risk-On"|"Risk-Off"|"Stagflation"|"Reflation",
    "confidence": <0-100>,
    "implication": "<impact sur ${sym}>"
  },
  "calendarRisks": {
    "summary": "<phrase>",
    "upcomingEvents": [{ "date": "<date>", "event": "<nom>", "impact": "high"|"medium"|"low", "expectedReaction": "<reaction>" }]
  },
  "newsSentiment": {
    "overall": <-1 a 1>,
    "topDrivers": ["<driver 1>", "<driver 2>", "<driver 3>"],
    "trumpRisk": <0-10>
  },
  "bullishDrivers": ["<driver concret 1>", "<driver 2>", "<driver 3>"],
  "bearishDrivers": ["<driver concret 1>", "<driver 2>"],
  "risks": {
    "market": ["<risque marche>"],
    "geopolitical": ["<risque geo>"],
    "technical": ["<risque technique>"]
  },
  "invalidationLevel": {
    "price": <coherent avec prix actuel ${price ?? 0}>,
    "explanation": "<pourquoi ce niveau invalide le scenario>"
  },
  "scenarios": {
    "base": {
      "name": "<nom scenario>",
      "probability": <35-55>,
      "trigger": "<declencheur>",
      "target": <coherent>,
      "stopLoss": <coherent>,
      "riskReward": <min 1.5>,
      "catalysts": ["<catalyseur 1>", "<catalyseur 2>"]
    },
    "bull": {
      "name": "<nom>",
      "probability": <15-35>,
      "trigger": "<declencheur>",
      "target": <coherent>,
      "stopLoss": <coherent>,
      "riskReward": <min 2>,
      "catalysts": ["<catalyseur>"]
    },
    "bear": {
      "name": "<nom>",
      "probability": <15-35>,
      "trigger": "<declencheur>",
      "target": <coherent>,
      "stopLoss": <coherent>,
      "riskReward": <min 1.5>,
      "catalysts": ["<catalyseur>"]
    }
  },
  "tradePlan": {
    "bias": "Bullish"|"Bearish"|"Neutral",
    "entry": { "type": "market"|"limit", "price": <coherent> },
    "stopLoss": <coherent>,
    "takeProfit1": <coherent>,
    "takeProfit2": <coherent>,
    "riskRewardRatio": <min 1.5>,
    "holdingPeriod": "<ex: 1-2 semaines>",
    "notes": "<conditions a respecter>"
  },
  "todayCatalyst": "<evenement SPECIFIQUE du jour a surveiller>",
  "confidenceScore": <0-100>
}`
}
