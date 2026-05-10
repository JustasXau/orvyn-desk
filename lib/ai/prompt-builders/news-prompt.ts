// Prompt pour l'agent "News Sentiment Analyst" (Etape 3 du chain-of-thought)

import type { CollectedData } from '../data-collector'

export function buildNewsPrompt(data: CollectedData): string {
  const news = data.rssNews
  const geo = data.geopolitical
  const reddit = data.reddit
  const crypto = data.crypto

  // Top 8 news les plus pertinentes
  const topNews = news.items.slice(0, 8).map((item, i) =>
    `${i + 1}. [${item.source}] "${item.title}" (pertinence: ${item.relevanceScore}/10)`
  ).join('\n') || 'Aucune news disponible'

  // Top posts Reddit
  const topReddit = reddit.posts.slice(0, 5).map(p =>
    `  - [${p.subreddit}] "${p.title}" (${p.sentiment}, score: ${p.score})`
  ).join('\n') || '  Aucun post Reddit disponible'

  return `Tu es un analyste specialise en sentiment de marche et analyse des news.
Tu analyses le sentiment pour ${data.fullName} (${data.symbol}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEWS FINANCIERES (24H)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sources disponibles: ${news.sourcesAvailable.join(', ') || 'Aucune'}
Sources indisponibles: ${news.sourcesFailed.join(', ') || 'Aucune'}
Total articles collectes: ${news.totalFetched}

Articles les plus pertinents pour ${data.symbol}:
${topNews}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GEOPOLITIQUE (GDELT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${geo.summary}
Niveau de risque: ${geo.riskLevel.toUpperCase()}
Ton moyen (negatif=tensions): ${geo.averageTone ?? 'N/A'}
Evenements detectes:
${geo.events.slice(0, 5).map(e => `  - "${e.title}" (ton: ${e.tone}, source: ${e.source})`).join('\n') || '  Aucun evenement geopolitique majeur'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENTIMENT RETAIL (REDDIT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reddit.summary}
Score global: ${reddit.sentimentScore > 0 ? '+' : ''}${reddit.sentimentScore} (-1=bearish, +1=bullish)
Distribution: ${reddit.bullishCount} haussiers / ${reddit.neutralCount} neutres / ${reddit.bearishCount} baissiers
Posts significatifs:
${topReddit}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORRELATIONS CRYPTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BTC: ${crypto.btcPrice ? `$${crypto.btcPrice.toLocaleString()}` : 'N/A'} (${crypto.btcChange24h != null ? `${crypto.btcChange24h > 0 ? '+' : ''}${crypto.btcChange24h}%` : 'N/A'})
BTC Dominance: ${crypto.btcDominance ?? 'N/A'}%
${crypto.fearGreedCorrelation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Score Trump Risk sur TOUTE la data: 0=aucun impact, 10=impact majeur imminent
2. Sentiment overall: -1 (tres bearish) a +1 (tres bullish) POUR ${data.symbol} specifiquement
3. Note: si retail tres bullish (> +0.7) c'est souvent contrarian (signal de vente)
4. Cite les titres exacts des news dans topDrivers
5. Identifie les catalyseurs imminents (48h)

Reponds UNIQUEMENT avec ce JSON valide:
{
  "sentiment": {
    "overall": <-1 a 1>,
    "topDrivers": ["<titre/fait cle 1>", "<titre/fait cle 2>", "<titre/fait cle 3>"],
    "trumpRisk": <0-10>
  },
  "bullishDrivers": ["<driver haussier concret 1>", "<driver 2>", "<driver 3>"],
  "bearishDrivers": ["<driver baissier concret 1>", "<driver 2>"],
  "crossAsset": {
    "summary": "<synthese cross-asset>",
    "coherence": "Coherent"|"Divergent"|"Mixte",
    "keyCorrelations": [
      {
        "pair": "<symbole>",
        "correlation": <-100 a 100>,
        "interpretation": "<implication pour ${data.symbol}>"
      }
    ]
  },
  "immediateCatalysts": ["<catalyseur 48h 1>", "<catalyseur 2>"],
  "geopoliticalRisk": {
    "level": "low"|"medium"|"high"|"critical",
    "mainRisk": "<risque principal>",
    "impact": "<impact attendu sur ${data.symbol}>"
  },
  "rawHeadlines": ["<headline 1>", "<headline 2>", "<headline 3>"]
}`
}
