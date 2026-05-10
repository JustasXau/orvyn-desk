/**
 * Filtre de news Gold optimisé
 * Keywords: gold, xau, bullion, fed, fomc, powell, dollar, dxy, inflation, cpi, pce,
 *           war, sanctions, safe haven, risk off, iran, russia, treasury, yield, silver,
 *           nfp, payroll, gdp, recession, trump, tariff
 */

const GOLD_KEYWORDS = [
  // Gold et Silver
  'gold', 'xau', 'bullion', 'silver', 'xag',
  // Fed et Policy
  'fed', 'fomc', 'powell', 'federal reserve', 'interest rate',
  // Dollar et Currency
  'dollar', 'dxy', 'usd', 'forex',
  // Inflation
  'inflation', 'cpi', 'pce', 'deflation', 'disinflation',
  // Risk et Safe Haven
  'risk off', 'safe haven', 'flight to safety', 'risk sentiment',
  // Geopolitique
  'war', 'sanctions', 'iran', 'russia', 'ukraine', 'middle east', 'conflict',
  // Treasury et Yields
  'treasury', 'yield', '10y', '2y10y', 'bond',
  // Employment
  'nfp', 'payroll', 'unemployment', 'jobs', 'jobless claims',
  // Macro
  'gdp', 'recession', 'economic', 'growth',
  // Politique
  'trump', 'tariff', 'trade war', 'fiscal',
]

export interface FilteredNews {
  headline: string
  url: string
  source: string
  publishedAt: string
  relevance: 'high' | 'medium' | 'low'
  keywords: string[]
}

/**
 * Filtre les news pour le Gold
 * Retourne seulement les news pertinentes avec keywords
 */
export function filterGoldNews(allNews: any[]): FilteredNews[] {
  if (!allNews || allNews.length === 0) return []

  return allNews
    .filter((news) => {
      const headline = (news.headline || news.title || '').toLowerCase()
      const description = (news.description || '').toLowerCase()
      const fullText = `${headline} ${description}`

      // Vérifie que au moins un keyword est présent
      return GOLD_KEYWORDS.some((keyword) => fullText.includes(keyword.toLowerCase()))
    })
    .map((news) => {
      const headline = news.headline || news.title || ''
      const fullText = `${headline} ${news.description || ''}`.toLowerCase()

      // Identifie les keywords présents
      const foundKeywords = GOLD_KEYWORDS.filter((keyword) =>
        fullText.includes(keyword.toLowerCase())
      )

      // Détermine la pertinence basée sur les keywords trouvés
      let relevance: 'high' | 'medium' | 'low' = 'low'
      if (foundKeywords.length >= 3) relevance = 'high'
      else if (foundKeywords.length === 2) relevance = 'medium'

      return {
        headline,
        url: news.url || '',
        source: news.source?.name || news.source || 'Unknown',
        publishedAt: news.publishedAt || new Date().toISOString(),
        relevance,
        keywords: foundKeywords,
      }
    })
    .sort((a, b) => {
      // Trie par relevance puis par date
      const relevanceOrder = { high: 0, medium: 1, low: 2 }
      if (relevanceOrder[a.relevance] !== relevanceOrder[b.relevance]) {
        return relevanceOrder[a.relevance] - relevanceOrder[b.relevance]
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    .slice(0, 15) // Top 15 news
}

/**
 * Analyse l'impact d'une nouvelle sur le Gold
 */
export function analyzeGoldNewsImpact(news: FilteredNews): {
  direction: 'bullish' | 'bearish' | 'neutral'
  strength: 'high' | 'medium' | 'low'
  reason: string
} {
  const text = `${news.headline}`.toLowerCase()

  // USD fort = Or baisse
  if (
    text.includes('dollar strong') ||
    text.includes('usd rally') ||
    text.includes('fed hawk') ||
    text.includes('rate hike')
  ) {
    return {
      direction: 'bearish',
      strength: 'high',
      reason: 'Strong USD reduces gold attractiveness',
    }
  }

  // USD faible = Or monte
  if (
    text.includes('dollar weak') ||
    text.includes('fed cut') ||
    text.includes('rate cut') ||
    text.includes('dovish')
  ) {
    return {
      direction: 'bullish',
      strength: 'high',
      reason: 'Weak USD supports gold prices',
    }
  }

  // Risk off = Or monte (safe haven)
  if (
    text.includes('market crash') ||
    text.includes('risk off') ||
    text.includes('recession') ||
    text.includes('war') ||
    text.includes('sanctions') ||
    text.includes('conflict')
  ) {
    return {
      direction: 'bullish',
      strength: 'high',
      reason: 'Risk-off sentiment favors safe haven gold',
    }
  }

  // Risk on = Or baisse
  if (
    text.includes('market rally') ||
    text.includes('stocks rally') ||
    text.includes('risk on') ||
    text.includes('economic growth')
  ) {
    return {
      direction: 'bearish',
      strength: 'medium',
      reason: 'Risk-on sentiment reduces gold demand',
    }
  }

  // Inflation = Or monte
  if (text.includes('inflation') || text.includes('cpi') || text.includes('pce')) {
    return {
      direction: 'bullish',
      strength: 'medium',
      reason: 'Inflation concerns support gold',
    }
  }

  return {
    direction: 'neutral',
    strength: 'low',
    reason: 'Limited direct impact on gold',
  }
}
