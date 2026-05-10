// ═══════════════════════════════════════════════════════════════════════════
// CONTEXTUAL REPORT GENERATOR WITH REAL-TIME NEWS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Generates both quick (2-sentence desk card) and full (structured) reports
// using impact mapping and real-time news integration.
// Each analysis is contextualized to its pair — no copy-paste.
//
// ═══════════════════════════════════════════════════════════════════════════

import {
  filterEventsForSymbol,
  filterNewsForSymbol,
  getEventImpactDescription,
  IMPACT_MAP,
} from './impact-map';

export interface ContextualReportParams {
  symbol: string;
  price: number;
  priceChange: number;
  swingBias: { direction: string; confidence: number; score: number };
  dayBias: { direction: string; confidence: number; score: number };
  rsi?: number;
  structure?: string;
  economicEvents?: any[];
  news?: any[];
  correlations?: Array<{ symbol: string; change: number }>;
}

export interface QuickAnalysisParams {
  symbol: string;
  price: number;
  priceChange: number;
  swingBias: { direction: string; confidence: number; score: number };
  dayBias: { direction: string; confidence: number; score: number };
  news?: any[];
  technicalContext?: string;
}

// Helper function to format time ago
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes}m`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}

// System prompt for coherent analysis
export const SYSTEM_PROMPT_ANALYST = `Tu es un analyste de trading professionnel et factuel pour MRKT.IA.

RÈGLES ABSOLUES DE COHÉRENCE:
1. Une news baissière récente + prix qui monte = divergence à EXPLIQUER
2. Une news haussière récente + bias bearish = tension à SIGNALER
3. Si NFP, CPI, FOMC vient de sortir = c'est le point CENTRAL de l'analyse
4. Ne JAMAIS ignorer une news haute importance sortie dans la dernière heure
5. Ne JAMAIS contredire les données sans explication logique
6. TOUJOURS relier news + technique + prix dans une logique cohérente
7. Si aucune news pertinente → baser l'analyse sur le technique uniquement et le mentionner: "Absence de catalyseur news — analyse purement technique"

ANALYSE RAPIDE (desk card): 2 phrases, verdict + implication
RAPPORT COMPLET: Structuré (situation + catalyseurs + biais + niveaux + risques + conclusion)

Toutes les analyses en français naturel, style analytique mais accessible.`;

/**
 * Build QUICK analysis prompt for desk card (2 sentences max)
 * - Filters top 5 most recent news
 * - Focuses on what's moving the price RIGHT NOW
 * - Explains any divergences between price action and bias
 */
export function buildQuickAnalysisPrompt(params: QuickAnalysisParams): string {
  const {
    symbol,
    price,
    priceChange,
    swingBias,
    dayBias,
    news = [],
    technicalContext = '',
  } = params;

  // Get top 5 most recent and relevant news
  const recentNews = filterNewsForSymbol(symbol, news, { logDetails: false })
    .sort((a: any, b: any) => (b.datetime || 0) - (a.datetime || 0))
    .slice(0, 5);

  const newsContext = recentNews.length > 0
    ? recentNews
        .map((n: any) => `- ${n.headline} (${n.source}, ${getTimeAgo(n.datetime || Date.now())})`)
        .join('\n')
    : 'Aucune news récente trouvée pour cette paire';

  // Detect divergence
  const priceUp = priceChange > 0;
  const biasUp = dayBias.direction.toLowerCase().includes('bull');
  const hasDivergence = priceUp !== biasUp;

  const divergenceNote = hasDivergence
    ? `\nATTENTION DIVERGENCE: Prix ${priceUp ? '↑' : '↓'} mais bias ${dayBias.direction} - expliquer la tension`
    : '';

  const prompt = `Tu es un analyste de trading professionnel et factuel. Génère une analyse TRÈS COURTE en 2 phrases MAX pour la carte du desk.

PAIRE: ${symbol}
PRIX: ${price.toFixed(4)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}% aujourd'hui)
BIAS SWING: ${swingBias.direction} (${swingBias.confidence}%)
BIAS DAY: ${dayBias.direction} (${dayBias.confidence}%)

NEWS RÉCENTES QUI CONCERNENT ${symbol}:
${newsContext}

CONTEXTE TECHNIQUE:
${technicalContext || 'À analyser à partir des indicators'}

RÈGLES ABSOLUES:
1. Si une news explique le mouvement du prix → mentionne-la DIRECTEMENT
2. Si bias et prix sont opposés → explique la divergence en tenant compte des news${divergenceNote}
3. Si news importante vient de sortir → c'est la priorité dans l'analyse
4. 2 phrases MAX, en français, factuel et utile pour un trader
5. Termine par l'implication concrète: opportunité, attendre, ou risque élevé
6. JAMAIS de trade idea (entry, stop, target)
7. Si aucune news pertinente → "Absence de catalyseur news — analyse purement technique"

FORMAT: [VERDICT CLAIR] → [IMPLICATION IMMÉDIATE]
Exemple: "Bullish structurel mais rejet EMA20 sur M15 → Attendre break au-dessus du dernier HH"

GÉNÈRE L'ANALYSE:`;

  return prompt;
}

/**
 * Build contextualized FULL REPORT prompt for Groq with all filtered news
 */
export function buildContextualPrompt(params: ContextualReportParams): string {
  const {
    symbol,
    price,
    priceChange,
    swingBias,
    dayBias,
    rsi,
    structure,
    economicEvents = [],
    news = [],
    correlations = [],
  } = params;

  // Filter events and news for this specific symbol with logging
  const relevantEvents = filterEventsForSymbol(symbol, economicEvents);
  const allFilteredNews = filterNewsForSymbol(symbol, news, { logDetails: true });
  const relevantCorrelations = correlations.slice(0, 3);

  // QUALITY CHECKS
  console.log(`[ContextualReport] ${symbol} data quality:`, {
    totalNews: news.length,
    relevantNews: allFilteredNews.length,
    relevantEvents: relevantEvents.length,
    hasNewsData: allFilteredNews.length > 0,
    newsQuality: allFilteredNews.length < 3 ? 'LOW' : 'GOOD'
  });

  // Sort news by most recent first
  const sortedNews = allFilteredNews
    .sort((a: any, b: any) => (b.datetime || 0) - (a.datetime || 0));

  // If not enough news, try to expand time window or broaden keywords
  let newsWarning = '';
  if (allFilteredNews.length === 0) {
    newsWarning = `\n\n⚠️ ATTENTION: Aucune news récente trouvée pour ${symbol}. L'analyse utilise uniquement les données techniques.`
  } else if (allFilteredNews.length < 3) {
    newsWarning = `\n⚠️ Données limitées: Seulement ${allFilteredNews.length} article(s) trouvé(s). Résultat basé sur la technique.`
  }

  // Build economic events section with expected impact
  const eventsSection = relevantEvents.length > 0
    ? relevantEvents
        .slice(0, 5)
        .map((event: any) => {
          const impact = getEventImpactDescription(symbol, event.name || event.event);
          return `- ${event.date || 'Date TBD'} ${event.time || ''} : ${event.name || event.event}
   Impact attendu sur ${symbol} : ${impact}
   Données: Précédent ${event.previous || 'N/A'} | Attendu ${event.forecast || 'N/A'}`;
        })
        .join('\n')
    : `Aucun événement économique majeur affectant ${symbol} dans les 48h`;

  // Build COMPLETE news section (all filtered articles, sorted by recency)
  const newsSection = sortedNews.length > 0
    ? sortedNews
        .map((n: any) => {
          const timeAgo = getTimeAgo(n.datetime || Date.now());
          return `- [${timeAgo}] ${n.headline || n.title} (${n.source || 'Source'})`;
        })
        .join('\n')
    : `Aucune news récente directement liée à ${symbol}`;

  // Build correlations section
  const correlationsSection = relevantCorrelations.length > 0
    ? relevantCorrelations
        .map((c: any) => {
          const direction = c.change > 0 ? 'haut' : c.change < 0 ? 'bas' : 'stable';
          return `- ${c.symbol}: ${c.change > 0 ? '+' : ''}${c.change.toFixed(2)}% (${direction})`;
        })
        .join('\n')
    : 'Pas de corrélations actives';

  // Build the complete report prompt
  const prompt = `Tu es un analyste trading expert pour MRKT.IA. Génère un rapport COMPLET et STRUCTURÉ pour ${symbol} en tenant compte de TOUTES les données ci-dessous.

═══════════════════════════════════════════
DONNÉES ACTUELLES POUR ${symbol}
═══════════════════════════════════════════

Prix: ${price.toFixed(4)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)
Bias Swing: ${swingBias.direction} (confiance ${swingBias.confidence}%, score ${swingBias.score.toFixed(2)})
Bias Day: ${dayBias.direction} (confiance ${dayBias.confidence}%, score ${dayBias.score.toFixed(2)})
${rsi ? `RSI Daily: ${rsi.toFixed(1)}` : ''}
${structure ? `Structure: ${structure}` : ''}

═══════════════════════════════════════════
CALENDRIER ÉCONOMIQUE (48h) - Impact sur ${symbol}
═══════════════════════════════════════════
${eventsSection}

═══════════════════════════════════════════
NEWS DU FIL D'ACTUALITÉ - Filtrées pour ${symbol} (${sortedNews.length} articles)
═══════════════════════════════════════════
${newsSection}

═══════════════════════════════════════════
CORRÉLATIONS EN TEMPS RÉEL
═══════════════════════════════════════════
${correlationsSection}

═══════════════════════════════════════════
DIRECTIVES POUR LE RAPPORT COMPLET
═══════════════════════════════════════════

Structure en 6 sections:
1. SITUATION ACTUELLE — Ce qui se passe sur ${symbol} en ce moment (prix + technique + contexte)
2. CATALYSEURS — Ce qui explique le mouvement (news + macro + technique)
3. BIAIS DIRECTIONNEL — Justifié par les données ci-dessus (Swing vs Day)
4. NIVEAUX CLÉS — Supports et résistances à surveiller
5. RISQUES — News à venir, corrélations contraires, divergences
6. CONCLUSION — Opportunité maintenant / attendre / éviter et POURQUOI

RÈGLES DE COHÉRENCE STRICTES:
- Une news baissière récente + prix qui monte = divergence à expliquer
- Une news haussière récente + bias bearish = tension à signaler
- Si NFP, CPI, FOMC vient de sortir = point CENTRAL de l'analyse
- Ne JAMAIS ignorer une news haute importance sortie dans la dernière heure
- Ne JAMAIS contredire les données sans explication logique
- TOUJOURS relier news + technique + prix dans une logique cohérente
- JAMAIS de Trade Idea (entry, stop, target)
- JAMAIS de mention d'événements ne concernant PAS ${symbol}
- Format: Français naturel, style MRKT.IA (analytique mais accessible)
- MAX 300 mots
${newsWarning}

GÉNÈRE LE RAPPORT:`;

  return prompt;
}

/**
 * Verify report is contextual (has symbol-specific content)
 */
export function validateContextualReport(
  report: string,
  symbol: string
): { valid: boolean; reason?: string } {
  // Report should mention the symbol
  if (!report.toUpperCase().includes(symbol.replace('/', '').substring(0, 3))) {
    return { valid: false, reason: 'Report does not reference the symbol' };
  }

  // Report should NOT be generic (check for copy-paste indicators)
  const genericPhrases = [
    'une paire forex quelconque',
    'cet actif',
    'le symbole',
    'votre paire',
  ];

  const hasGenericPhrases = genericPhrases.some((phrase) =>
    report.toLowerCase().includes(phrase.toLowerCase())
  );

  if (hasGenericPhrases) {
    return {
      valid: false,
      reason: 'Report contains generic placeholder language',
    };
  }

  return { valid: true };
}
