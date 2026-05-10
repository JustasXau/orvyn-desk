// Configuration du systeme d'analyse IA ORVYNDESK
// Definit les 4 agents Groq + parametres de cache + timeouts

export const GROQ_MODELS = {
  // Le plus puissant — pour les analyses complexes
  POWERFUL: 'llama-3.3-70b-versatile',
  // Ultra rapide — pour les taches simples
  FAST: 'llama-3.1-8b-instant',
  // Excellent contexte long 32K — pour les syntheses
  LONG_CONTEXT: 'mixtral-8x7b-32768',
  // Rapide, bon en synthese
  SYNTHESIS: 'gemma2-9b-it',
} as const

// Configuration des 4 agents du chain-of-thought
export const AGENTS = {
  technical: {
    name: 'Technical Analyst',
    model: GROQ_MODELS.POWERFUL,
    maxTokens: 2048,
    temperature: 0.2,           // Bas = plus factuel
    description: 'Analyse pure technique sur les 3 timeframes',
  },
  macro: {
    name: 'Macro Strategist',
    model: GROQ_MODELS.LONG_CONTEXT,
    maxTokens: 2048,
    temperature: 0.3,
    description: 'Analyse macro (Fed, taux, DXY, VIX, calendrier)',
  },
  news: {
    name: 'News Sentiment Analyst',
    model: GROQ_MODELS.FAST,
    maxTokens: 1536,
    temperature: 0.3,
    description: 'Analyse sentiment des news + Trump risk',
  },
  synthesis: {
    name: 'Senior Strategist',
    model: GROQ_MODELS.POWERFUL,
    maxTokens: 4096,
    temperature: 0.25,          // Equilibre entre creativite et factualite
    description: 'Synthese finale — reçoit les 3 analyses precedentes',
  },
} as const

// Parametres de cache (en secondes)
export const CACHE_TTL = {
  YAHOO_PRICE: 60,         // 1 min — prix en temps reel
  YAHOO_OHLC: 300,         // 5 min — donnees historiques
  FRED_DATA: 3600,         // 1h — donnees macro FRED
  NEWS_RSS: 600,           // 10 min — flux RSS
  CALENDAR: 3600,          // 1h — calendrier economique
  FEAR_GREED: 1800,        // 30 min — Fear & Greed
  REDDIT: 600,             // 10 min — sentiment Reddit
  GDELT: 300,              // 5 min — geopolitique
  COINGECKO: 300,          // 5 min — crypto
  GROQ_STEP: 300,          // 5 min — chaque etape Groq
  GROQ_FINAL: 300,         // 5 min — rapport final
} as const

// Timeouts (en ms)
export const TIMEOUTS = {
  GROQ_CALL: 20000,        // 20s par appel Groq
  EXTERNAL_SOURCE: 8000,   // 8s pour sources externes
  TOTAL_CHAIN: 90000,      // 90s max pour la chaine complete
} as const

// Rate limiting Groq (requetes/minute)
export const GROQ_RATE_LIMIT = {
  RPM_POWERFUL: 30,
  RPM_FAST: 60,
  DAILY_LIMIT: 14400,
} as const

// Symboles Yahoo Finance par paire ORVYN
export const PAIR_CONFIG: Record<string, {
  yahooSymbol: string
  fullName: string
  category: string
  correlated: string[]
}> = {
  'XAU/USD': {
    yahooSymbol: 'GC=F',
    fullName: 'Gold / US Dollar',
    category: 'Metaux precieux',
    correlated: ['DXY', 'US10Y', 'VIX', 'BTC/USD', 'US500'],
  },
  'XAUUSD': {
    yahooSymbol: 'GC=F',
    fullName: 'Gold / US Dollar',
    category: 'Metaux precieux',
    correlated: ['DXY', 'US10Y', 'VIX', 'BTC/USD', 'US500'],
  },
  'XAG/USD': {
    yahooSymbol: 'SI=F',
    fullName: 'Silver / US Dollar',
    category: 'Metaux precieux',
    correlated: ['XAU/USD', 'DXY', 'US10Y'],
  },
  'DXY': {
    yahooSymbol: 'DX-Y.NYB',
    fullName: 'US Dollar Index',
    category: 'Forex',
    correlated: ['EUR/USD', 'XAU/USD', 'US10Y', 'USDJPY'],
  },
  'WTI': {
    yahooSymbol: 'CL=F',
    fullName: 'WTI Crude Oil',
    category: 'Matieres premieres',
    correlated: ['DXY', 'US500', 'BRENT'],
  },
  'US500': {
    yahooSymbol: '^GSPC',
    fullName: 'S&P 500',
    category: 'Indices',
    correlated: ['VIX', 'DXY', 'US10Y', 'US100'],
  },
  'US100': {
    yahooSymbol: '^NDX',
    fullName: 'Nasdaq 100',
    category: 'Indices',
    correlated: ['VIX', 'US500', 'BTC/USD'],
  },
  'US30': {
    yahooSymbol: '^DJI',
    fullName: 'Dow Jones Industrial',
    category: 'Indices',
    correlated: ['VIX', 'US500', 'US10Y'],
  },
  'VIX': {
    yahooSymbol: '^VIX',
    fullName: 'CBOE Volatility Index',
    category: 'Volatilite',
    correlated: ['US500', 'XAU/USD'],
  },
  'US10Y': {
    yahooSymbol: '^TNX',
    fullName: 'US 10Y Treasury Yield',
    category: 'Taux',
    correlated: ['DXY', 'XAU/USD', 'US500'],
  },
  'USDJPY': {
    yahooSymbol: 'USDJPY=X',
    fullName: 'US Dollar / Japanese Yen',
    category: 'Forex',
    correlated: ['DXY', 'US10Y', 'VIX'],
  },
  'EUR/USD': {
    yahooSymbol: 'EURUSD=X',
    fullName: 'Euro / US Dollar',
    category: 'Forex',
    correlated: ['DXY', 'US10Y', 'XAU/USD'],
  },
  'GBP/USD': {
    yahooSymbol: 'GBPUSD=X',
    fullName: 'British Pound / US Dollar',
    category: 'Forex',
    correlated: ['DXY', 'EUR/USD'],
  },
  'BTC/USD': {
    yahooSymbol: 'BTC-USD',
    fullName: 'Bitcoin / US Dollar',
    category: 'Crypto',
    correlated: ['US100', 'XAU/USD', 'VIX'],
  },
}

// Normalise un symbole ORVYN (XAUUSD → XAU/USD)
export function normalizeSymbol(symbol: string): string {
  const map: Record<string, string> = {
    'XAUUSD': 'XAU/USD',
    'XAGUSD': 'XAG/USD',
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD',
    'NZDUSD': 'NZD/USD',
    'BTCUSD': 'BTC/USD',
  }
  return map[symbol] || symbol
}
