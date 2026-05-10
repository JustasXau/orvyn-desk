// Prompt pour l'agent "Macro Strategist" (Etape 2 du chain-of-thought)
// Analyse le contexte macro FRED + calendrier economique

import type { CollectedData } from '../data-collector'

function fmtSeries(name: string, val: number | null, prev: number | null, unit = ''): string {
  if (val == null) return `${name}: Non disponible`
  const change = prev != null ? ` (${val > prev ? '+' : ''}${(val - prev).toFixed(2)}${unit} vs precedent)` : ''
  return `${name}: ${val}${unit}${change}`
}

export function buildMacroPrompt(data: CollectedData): string {
  const m = data.macro
  const cal = data.calendar
  const fg = data.fearGreed

  const yc10_2 = m.yieldCurve10_2 != null
    ? `Yield Curve 10Y-2Y: ${m.yieldCurve10_2 > 0 ? '+' : ''}${m.yieldCurve10_2}% (${m.yieldCurve10_2 < 0 ? 'INVERTED — signal recession' : 'normale'})`
    : 'Yield Curve: Non disponible'

  const topEvents = cal.events
    .filter(e => e.impact === 'high')
    .slice(0, 5)
    .map(e => `  - [${e.impact.toUpperCase()}] ${e.event} — ${e.expectedReaction}`)
    .join('\n') || '  Aucun evenement high-impact identifie'

  return `Tu es un macro-strategiste senior specialise en trading multi-asset.
Tu dois analyser le contexte macro pour ${data.fullName} (${data.symbol}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLITIQUE MONETAIRE & TAUX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${fmtSeries('Fed Funds Rate', m.fedFundsRate.value, m.fedFundsRate.previousValue, '%')}
${fmtSeries('US 10Y Yield', m.us10y.value, m.us10y.previousValue, '%')}
${fmtSeries('US 5Y Yield', m.us5y.value, m.us5y.previousValue, '%')}
${fmtSeries('US 2Y Yield', m.us2y.value, m.us2y.previousValue, '%')}
${fmtSeries('US 30Y Yield', m.us30y.value, m.us30y.previousValue, '%')}
${fmtSeries('TIPS 10Y (Real Rate)', m.tips10y.value, m.tips10y.previousValue, '%')}
${yc10_2}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFLATION & CROISSANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${fmtSeries('CPI (YoY)', m.cpi.value, m.cpi.previousValue, '%')}
${fmtSeries('Core CPI', m.coreCpi.value, m.coreCpi.previousValue, '%')}
${fmtSeries('PCE (indicateur prefere Fed)', m.pce.value, m.pce.previousValue, '%')}
${fmtSeries('Unemployment Rate', m.unemploymentRate.value, m.unemploymentRate.previousValue, '%')}
${fmtSeries('Non-Farm Payrolls', m.nfp.value, m.nfp.previousValue, 'K')}
${fmtSeries('Consumer Sentiment (Michigan)', m.consumerSentiment.value, m.consumerSentiment.previousValue)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIQUIDITE & MARCHE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${fmtSeries('Fed Balance Sheet', m.fedBalanceSheet.value != null ? m.fedBalanceSheet.value / 1e9 : null, m.fedBalanceSheet.previousValue != null ? m.fedBalanceSheet.previousValue / 1e9 : null, 'B$')}
${fmtSeries('M2 Money Supply', m.m2.value != null ? m.m2.value / 1e9 : null, null, 'B$')}
${fmtSeries('WTI Crude Oil', m.wtiOil.value, m.wtiOil.previousValue, '$')}
${fmtSeries('USD/JPY Official (FRED)', m.usdJpy.value, m.usdJpy.previousValue)}
${fmtSeries('USD/CNY Official (FRED)', m.usdCny.value, m.usdCny.previousValue)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENTIMENT & RISK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CNN Fear & Greed: ${fg.cnn.value ?? 'N/A'}/100 (${fg.cnn.label}) — Semaine precedente: ${fg.cnn.weekAgo ?? 'N/A'}
Crypto Fear & Greed: ${fg.crypto.value ?? 'N/A'}/100 (${fg.crypto.label})
${fg.combined.interpretation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALENDRIER ECONOMIQUE (HIGH IMPACT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${cal.summary}
Evenements a surveiller:
${topEvents}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETUDE DES DONNEES MACRO: ${m.completeness}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGLES:
1. Identifier le regime de marche (Risk-On/Off/Stagflation/Reflation) en te basant sur DXY + VIX + taux + indices
2. Evaluer la posture Fed (hawkish/dovish/neutre) via taux + inflation
3. Evaluer l'impact specifique sur ${data.symbol}
4. Si real rate negatif → favorable ${data.category === 'Metaux precieux' ? 'pour l\'or' : 'pour les actifs risques'}
5. Yield curve inversee = risque recession = risk-off = or hausse typically

Reponds UNIQUEMENT avec ce JSON valide:
{
  "regime": {
    "current": "Risk-On"|"Risk-Off"|"Stagflation"|"Reflation",
    "confidence": <0-100>,
    "implication": "<impact specifique sur ${data.symbol}>"
  },
  "calendarRisks": {
    "summary": "<phrase de synthese>",
    "upcomingEvents": [
      {
        "date": "<date>",
        "event": "<nom>",
        "impact": "high"|"medium"|"low",
        "expectedReaction": "<reaction attendue pour ${data.symbol}>"
      }
    ]
  },
  "macroSummary": "<3 phrases cles sur le contexte macro actuel>",
  "fedContext": "<posture Fed actuelle et implication>",
  "rawData": {
    "realRate": <nombre|null>,
    "yieldCurve": <nombre|null>,
    "fedStance": "hawkish"|"neutral"|"dovish",
    "inflationTrend": "rising"|"falling"|"stable",
    "recessRecessionRisk": "low"|"medium"|"high"
  }
}`
}
