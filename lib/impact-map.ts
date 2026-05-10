// ═════════════════════════════════════════════════════════════════════════════
// NEWS KEYWORDS MAPPING - Pour filtrer les news par paire
// ═════════════════════════════════════════════════════════════════════════════

export const NEWS_KEYWORDS_MAP: Record<string, string[]> = {
  'XAU/USD': [
    'gold', 'or', 'xau', 'bullion', 'fed', 'federal reserve',
    'inflation', 'cpi', 'dollar', 'dxy', 'treasury', 'yield',
    'geopolit', 'war', 'guerre', 'iran', 'russia', 'safe haven',
    'central bank', 'banque centrale', 'interest rate', 'taux',
    'real yield', 'inflation expectations', 'monetary policy'
  ],
  'US100': [
    'nasdaq', 'tech', 'technologie', 'fed', 'federal reserve',
    'interest rate', 'nvidia', 'apple', 'microsoft', 'meta',
    'amazon', 'google', 'ai', 'artificial intelligence', 'taux',
    'trump', 'tariff', 'tarif', 'cpi', 'inflation', 'fomc',
    'earnings', 'guidance', 'semiconductor'
  ],
  'US30': [
    'dow', 'jones', 'fed', 'federal reserve', 'interest rate',
    'trump', 'tariff', 'tarif', 'inflation', 'cpi', 'fomc',
    'industrial', 'boeing', 'goldman', 'jpmorgan', 'économie us',
    'earnings', 'trade war', 'trade tensions'
  ],
  'DXY': [
    'dollar', 'dxy', 'usd', 'fed', 'federal reserve', 'fomc',
    'interest rate', 'taux', 'nfp', 'payroll', 'cpi', 'inflation',
    'trump', 'dette us', 'us debt', 'treasury', 'yield',
    'rate hike', 'rate cut', 'dot plot'
  ],
  'EUR/USD': [
    'euro', 'eur', 'bce', 'ecb', 'lagarde', 'fed', 'dollar',
    'cpi', 'inflation', 'pib', 'gdp', 'europe', 'eurozone',
    'germany', 'allemagne', 'france', 'taux', 'interest rate',
    'ecb rate', 'monetary policy', 'draghi'
  ],
  'GBP/USD': [
    'pound', 'sterling', 'gbp', 'boe', 'bank of england', 'bailey',
    'fed', 'dollar', 'uk', 'britain', 'brexit', 'cpi uk',
    'inflation uk', 'interest rate', 'sterling strength'
  ],
  'USD/JPY': [
    'yen', 'jpy', 'boj', 'bank of japan', 'ueda', 'fed', 'dollar',
    'japan', 'japon', 'interest rate', 'yield', 'treasury',
    'risk off', 'safe haven', 'nikkei', 'jgb'
  ],
  'BTC/USD': [
    'bitcoin', 'btc', 'crypto', 'cryptocurrency', 'coinbase',
    'binance', 'sec', 'regulation', 'réglementation', 'etf',
    'blockchain', 'halving', 'fed', 'risk on', 'volatility',
    'ethereum', 'altcoins', 'mining'
  ],
  'WTI': [
    'oil', 'pétrole', 'crude', 'opec', 'opep', 'wti', 'barrel',
    'baril', 'saudi', 'arabie saoudite', 'iran', 'russia',
    'eia', 'inventaires', 'production', 'drilling', 'supply'
  ],
  'US500': [
    'sp500', 'sp 500', 's&p', 'earnings', 'fed', 'fomc',
    'interest rate', 'inflation', 'cpi', 'unemployment',
    'trump', 'tariff', 'gdp', 'nfp'
  ],
  'CAC40': [
    'cac', 'france', 'french', 'paris', 'bce', 'ecb',
    'inflation', 'cpi', 'eurozone'
  ],
  'DAX': [
    'dax', 'germany', 'allemagne', 'berlin', 'bce', 'ecb',
    'inflation', 'gdp', 'siemens', 'volkswagen'
  ],
  'FTSE': [
    'ftse', 'london', 'uk', 'britain', 'boe', 'bank of england',
    'sterling', 'inflation', 'cpi'
  ],
}

export type ImpactCategory = 
  | 'CENTRAL_BANK' | 'INFLATION' | 'EMPLOYMENT' | 'GDP' 
  | 'TRADE' | 'TARIFFS' | 'GEOPOLITICS' | 'RISK_SENTIMENT'
  | 'COMMODITIES' | 'ENERGY' | 'TECH' | 'SECTOR';

export interface EventImpactInfo {
  name: string;
  expectedImpact?: string; // "USD fort → paire baisse" ou "Hausse de l'or"
  direction?: 'up' | 'down' | 'neutral'; // Impact directionnel sur le prix
}

// Mapping: Symbol → Array of event keywords/categories that impact it
export const IMPACT_MAP: Record<string, (ImpactCategory | string)[]> = {
  // ═════ FOREX MAJORS ═════
  'EUR/USD': [
    'CENTRAL_BANK', // ECB rate decisions
    'FED',          // Fed rate decisions
    'CPI_US',       // US inflation
    'CPI_EU',       // Euro inflation
    'NFP',          // Non-farm payroll (US jobs)
    'FOMC',         // Fed meeting
    'BCE',          // ECB meeting
    'ECB',          // ECB decisions
    'TRADE',        // Trade tensions
    'GDP_US',
    'GDP_EU',
  ],
  'GBP/USD': [
    'FED',
    'BOE',          // Bank of England
    'CPI_UK',
    'CPI_US',
    'NFP',
    'FOMC',
    'BOE_RATE',
    'PIB_UK',
    'TRADE',
  ],
  'USD/JPY': [
    'FED',
    'BOJ',          // Bank of Japan
    'CPI_US',
    'NFP',
    'FOMC',
    'BOJ_RATE',
    'GEOPOLITICS', // NK tensions affect JPY
    'RISK_SENTIMENT',
  ],
  'AUD/USD': [
    'FED',
    'RBA',          // Reserve Bank of Australia
    'CPI_AU',
    'CPI_US',
    'NFP',
    'FOMC',
    'RBA_RATE',
    'CHINE',        // China affects commodity demand
    'COMMODITIES',
  ],
  'USD/CAD': [
    'FED',
    'BOC',          // Bank of Canada
    'CPI_CA',
    'CPI_US',
    'NFP',
    'FOMC',
    'BOC_RATE',
    'ENERGY',       // Oil prices (petrodollar)
    'PETROLE',
  ],
  'NZD/USD': [
    'FED',
    'RBNZ',         // Reserve Bank of New Zealand
    'CPI_NZ',
    'CPI_US',
    'NFP',
    'FOMC',
    'RBNZ_RATE',
    'CHINE',
  ],
  'EUR/GBP': [
    'BCE',
    'BOE',
    'ECB',
    'CPI_EU',
    'CPI_UK',
    'PIB_EU',
    'PIB_UK',
  ],
  'GBP/JPY': [
    'BOE',
    'BOJ',
    'CPI_UK',
    'CPI_JP',
    'BOE_RATE',
    'BOJ_RATE',
  ],

  // ═════ INDICES ═════
  'US30': [
    'FED',
    'FOMC',
    'NFP',
    'CPI_US',
    'PIB_US',
    'EARNINGS',
    'TRUMP',        // Trump policies/tariffs
    'TARIFFS',
    'TRADE',
    'TECH',         // Tech sector news
    'SECTOR',
  ],
  'US100': [
    'FED',
    'FOMC',
    'NFP',
    'CPI_US',
    'FOMC',
    'TECH',
    'EARNINGS',
    'TRUMP',
    'TARIFFS',
    'TRADE',
  ],
  'US500': [
    'FED',
    'FOMC',
    'NFP',
    'CPI_US',
    'PIB_US',
    'EARNINGS',
    'TRUMP',
    'TARIFFS',
    'TRADE',
  ],
  'DAX': [
    'BCE',
    'ECB',
    'CPI_EU',
    'PIB_EU',
    'IFO',          // German business sentiment
    'ZEW',          // German economic sentiment
    'TRADE',
  ],
  'CAC40': [
    'BCE',
    'ECB',
    'CPI_EU',
    'PIB_EU',
    'PIB_FR',
    'TRADE',
  ],
  'FTSE': [
    'BOE',
    'CPI_UK',
    'PIB_UK',
    'BOE_RATE',
    'TRADE',
    'BREXIT',       // Brexit-related news
  ],

  // ═════ COMMODITIES ═════
  'XAU/USD': [
    'FED',
    'FOMC',
    'CPI_US',
    'DXY',          // Dollar Index strength
    'US10Y',        // US 10Y Treasury yield
    'RISK_OFF',     // Risk-off sentiment → gold up
    'GEOPOLITICS',  // Wars, tensions → flight to safety
    'NFP',
  ],
  'XAG/USD': [
    'FED',
    'CPI_US',
    'DXY',
    'INDUSTRIE',    // Industrial demand
    'CHINE',        // China industrial demand
    'RISK_SENTIMENT',
  ],
  'WTI': [
    'OPEP',         // OPEC decisions
    'EIA',          // EIA inventory report
    'API',          // American Petroleum Institute
    'DXY',
    'GEOPOLITICS',  // Middle East tensions
    'CHINE',        // China GDP/growth
  ],
  'BRENT': [
    'OPEP',
    'EIA',
    'API',
    'DXY',
    'GEOPOLITICS',
  ],

  // ═════ CRYPTO ═════
  'BTC/USD': [
    'FED',
    'FOMC',
    'CPI_US',
    'REGLEMENTATION', // Regulatory news
    'RISK_ON',      // Risk-on sentiment → crypto up
    'TECH',
  ],
  'ETH/USD': [
    'FED',
    'CPI_US',
    'FOMC',
    'REGLEMENTATION',
    'RISK_ON',
    'TECH',
  ],

  // ═════ OTHER ═════
  'DXY': [
    'FED',
    'FOMC',
    'NFP',
    'CPI_US',
    'PIB_US',
    'TRUMP',
    'TARIFFS',
    'TRADE',
  ],
};

// ═════ Expected Impact Descriptions ═════
// Maps (symbol, event) → human-readable impact description

export const EVENT_IMPACT_DESCRIPTIONS: Record<string, Record<string, string>> = {
  'EUR/USD': {
    'NFP': 'Si NFP > attentes → USD fort → EUR/USD BAISSE',
    'CPI_US': 'CPI plus élevé que prévu → hausse des taux Fed → EUR/USD baisse',
    'FOMC': 'Hausse des taux Fed → USD renforce → EUR/USD baisse',
    'CPI_EU': 'CPI euro supérieur → BCE plus restrictive → support EUR/USD',
    'BCE': 'Si BCE hausse les taux → EUR renforce → EUR/USD monte',
  },
  'GBP/USD': {
    'NFP': 'Si NFP > attentes → USD fort → GBP/USD BAISSE',
    'CPI_UK': 'CPI plus élevé → BOE hausse taux → GBP renforce → monte',
    'BOE_RATE': 'Décision de taux BOE → mouvements directs GBP/USD',
  },
  'USD/JPY': {
    'NFP': 'Si NFP > attentes → USD fort → USD/JPY MONTE',
    'FOMC': 'Hausse Fed → USD fort → USD/JPY monte',
    'BOJ_RATE': 'Si BOJ hausse taux → JPY renforce → USD/JPY baisse',
    'GEOPOLITICS': 'Tensions géopolitiques → fuite vers JPY (valeur refuge)',
  },
  'XAU/USD': {
    'CPI_US': 'Si CPI < attentes → baisse taux Fed → OR MONTE',
    'FED': 'Hausse taux Fed → or moins attrayant → OR BAISSE',
    'DXY': 'Si USD fort (DXY +) → or moins attrayant → OR BAISSE',
    'GEOPOLITIQUES': 'Guerres/tensions → fuite vers or (valeur refuge)',
    'RISK_OFF': 'Marché en baisse → fuite vers or → OR MONTE',
  },
  'US30': {
    'NFP': 'Si NFP > attentes → économie forte → indices MONTENT',
    'EARNINGS': 'Bons résultats entreprises → US30 MONTE',
    'CPI_US': 'Inflation trop haute → fed hausse taux → US30 BAISSE',
    'TRUMP': 'Tarifs/politiques commerciales → impact direct US30',
  },
  'BTC/USD': {
    'CPI_US': 'Si CPI baisse → baisse taux → BTC monte',
    'FOMC': 'Si Fed baisse taux → BTC monte',
    'RISK_ON': 'Sentiment risqué → crypto monte',
  },
};

/**
 * Filter economic events relevant to a symbol
 */
export function filterEventsForSymbol(
  symbol: string,
  events: any[]
): any[] {
  const relevantCategories = IMPACT_MAP[symbol] || [];
  
  return events.filter(event => {
    const eventName = event.name || event.event || event.title || '';
    const eventNameUpper = eventName.toUpperCase();
    
    // Check if event name matches any relevant category
    return relevantCategories.some(category => {
      const categoryUpper = String(category).toUpperCase();
      return eventNameUpper.includes(categoryUpper);
    });
  });
}

/**
 * Filter news relevant to a symbol
 */
export function filterNewsForSymbol(
  symbol: string,
  news: any[],
  options?: { minScore?: number; logDetails?: boolean }
): any[] {
  const { minScore = 0.5, logDetails = false } = options || {}
  
  // Utiliser NEWS_KEYWORDS_MAP en priorité, sinon IMPACT_MAP
  let keywords = NEWS_KEYWORDS_MAP[symbol] || []
  
  // Si pas de keywords spécifiques, utiliser IMPACT_MAP comme fallback
  if (keywords.length === 0) {
    const asset = symbol.split('/')[0]
    keywords = [
      ...(IMPACT_MAP[symbol] || []),
      asset,
      symbol.replace('/', ''),
    ]
  }
  
  // Convertir keywords en lowercase pour matching case-insensitive
  const lowerKeywords = keywords.map(k => String(k).toLowerCase())
  
  const filtered = news.filter(article => {
    const headline = (article.headline || '').toLowerCase()
    const summary = (article.summary || '').toLowerCase()
    const content = `${headline} ${summary}`
    
    // Count keyword matches
    let matchCount = 0
    for (const keyword of lowerKeywords) {
      if (content.includes(keyword)) {
        matchCount++
      }
    }
    
    const matchScore = matchCount / lowerKeywords.length
    
    if (logDetails) {
      console.log(`[FilterNews] ${symbol} - "${headline.substring(0, 60)}"`, {
        matchCount,
        totalKeywords: lowerKeywords.length,
        matchScore: matchScore.toFixed(2),
        passed: matchScore >= minScore
      })
    }
    
    return matchScore >= minScore
  })
  
  if (logDetails) {
    console.log(`[FilterNews] ${symbol}`, {
      totalArticles: news.length,
      filtered: filtered.length,
      keywords: lowerKeywords.length,
      keywords_used: keywords.slice(0, 5) // Show first 5
    })
  }
  
  return filtered
}

/**
 * Get impact description for an event on a specific symbol
 */
export function getEventImpactDescription(symbol: string, eventName: string): string {
  const desc = EVENT_IMPACT_DESCRIPTIONS[symbol]?.[eventName];
  if (desc) return desc;
  
  // Generic fallback
  const isPositiveEvent = eventName.includes('better') || eventName.includes('rise');
  return isPositiveEvent 
    ? `Nouvelle positive pour ${symbol}`
    : `Nouvelle potentiellement négative pour ${symbol}`;
}

/**
 * Check if an asset is affected by event
 */
export function isEventRelevantToAsset(symbol: string, eventKeyword: string): boolean {
  const relevantKeywords = IMPACT_MAP[symbol] || [];
  return relevantKeywords.some(k => 
    String(k).toUpperCase().includes(String(eventKeyword).toUpperCase())
  );
}
