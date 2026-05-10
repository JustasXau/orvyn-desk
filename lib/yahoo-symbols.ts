// Mappage des symboles ORVYN vers Yahoo Finance
// Stratégie adaptée par timeframe pour gérer les données incomplètes des futures intraday

// Pour les futures (XAU/USD, XAG/USD, WTI): utiliser le contrat futures pour swing (W/D)
// mais le spot price pour les intraday (H4/H1/M15) qui ont des données plus complètes
export const TIMEFRAME_SYMBOLS_MAP: Record<string, Record<string, string>> = {
  'XAU/USD': {
    weekly: 'GC=F',      // Futures OK pour timeframes longs
    daily: 'GC=F',       
    h4: 'GC=F',          // Utiliser futures aussi pour H4 (données plus complètes que spot)
    h1: 'GC=F',          
    m15: 'GC=F',
  },
  'XAG/USD': {
    weekly: 'SI=F',
    daily: 'SI=F',
    h4: 'SI=F',          // Utiliser futures pour tous les timeframes
    h1: 'SI=F',
    m15: 'SI=F',
  },
  'WTI': {
    weekly: 'CL=F',
    daily: 'CL=F',
    h4: 'CL=F',
    h1: 'CL=F',
    m15: 'CL=F',
  },
  'BRENT': {
    weekly: 'BZ=F',
    daily: 'BZ=F',
    h4: 'BZ=F',
    h1: 'BZ=F',
    m15: 'BZ=F',
  },
  // Indices: symbole unique pour tous les timeframes
  'US30': {
    weekly: '^DJI',
    daily: '^DJI',
    h4: '^DJI',
    h1: '^DJI',
    m15: '^DJI',
  },
  'US100': {
    weekly: '^NDX',
    daily: '^NDX',
    h4: '^NDX',
    h1: '^NDX',
    m15: '^NDX',
  },
  'US500': {
    weekly: '^GSPC',
    daily: '^GSPC',
    h4: '^GSPC',
    h1: '^GSPC',
    m15: '^GSPC',
  },
  'DAX': {
    weekly: '^GDAXI',
    daily: '^GDAXI',
    h4: '^GDAXI',
    h1: '^GDAXI',
    m15: '^GDAXI',
  },
  'CAC40': {
    weekly: '^FCHI',
    daily: '^FCHI',
    h4: '^FCHI',
    h1: '^FCHI',
    m15: '^FCHI',
  },
  'FTSE': {
    weekly: '^FTSE',
    daily: '^FTSE',
    h4: '^FTSE',
    h1: '^FTSE',
    m15: '^FTSE',
  },
  'DXY': {
    weekly: 'DX-Y.NYB',
    daily: 'DX-Y.NYB',
    h4: 'DX-Y.NYB',
    h1: 'DX-Y.NYB',
    m15: 'DX-Y.NYB',
  },
  'VIX': {
    weekly: '^VIX',
    daily: '^VIX',
    h4: '^VIX',
    h1: '^VIX',
    m15: '^VIX',
  },
  'US10Y': {
    weekly: '^TNX',
    daily: '^TNX',
    h4: '^TNX',
    h1: '^TNX',
    m15: '^TNX',
  },
  'USDJPY': {
    weekly: 'USDJPY=X',
    daily: 'USDJPY=X',
    h4: 'USDJPY=X',
    h1: 'USDJPY=X',
    m15: 'USDJPY=X',
  },
  'USD/JPY': {
    weekly: 'USDJPY=X',
    daily: 'USDJPY=X',
    h4: 'USDJPY=X',
    h1: 'USDJPY=X',
    m15: 'USDJPY=X',
  },
  'US02Y': {
    weekly: '^IRX',
    daily: '^IRX',
    h4: '^IRX',
    h1: '^IRX',
    m15: '^IRX',
  },
  'GOLDSILVER': {
    weekly: 'GC=F',  // Will calculate ratio from GC/SI
    daily: 'GC=F',
    h4: 'GC=F',
    h1: 'GC=F',
    m15: 'GC=F',
  },
}

// Pour les paires forex: symbole unique sur tous les timeframes
export const FOREX_SYMBOLS_MAP: Record<string, string> = {
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'AUD/USD': 'AUDUSD=X',
  'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X',
  'EUR/GBP': 'EURGBP=X',
  'GBP/JPY': 'GBPJPY=X',
}

// Crypto: symbole unique
export const CRYPTO_SYMBOLS_MAP: Record<string, string> = {
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
}

// Pour compatibilité: mapping global simple (retourne le premier symbole trouvé)
export const YAHOO_SYMBOLS_MAP: Record<string, string> = {
  // Forex (même symbole pour tous les timeframes)
  ...FOREX_SYMBOLS_MAP,
  
  // Métaux (prennent le futures par défaut)
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  
  // Indices
  'US30': '^DJI',
  'US100': '^NDX',
  'US500': '^GSPC',
  'DAX': '^GDAXI',
  'CAC40': '^FCHI',
  'FTSE': '^FTSE',
  
  // Pétrole
  'WTI': 'CL=F',
  'BRENT': 'BZ=F',
  
  // Crypto
  ...CRYPTO_SYMBOLS_MAP,
  
  // Volatilité & Rates
  'VIX': '^VIX',
  'US10Y': '^TNX',
  'US02Y': '^IRX',
  
  // Forex
  'USDJPY': 'USDJPY=X',
  'USD/JPY': 'USDJPY=X',
  
  // Ratios
  'GOLDSILVER': 'GC=F', // Calculate ratio from GC/SI
}

// Récupérer le symbole Yahoo pour un ORVYN symbol et un timeframe spécifique
export function getYahooSymbolByTimeframe(symbol: string, timeframe: string): string {
  // Chercher d'abord dans les timeframe-specific mappings
  const timeframeMap = TIMEFRAME_SYMBOLS_MAP[symbol]
  if (timeframeMap) {
    // Normaliser le timeframe
    const tf = timeframe.toLowerCase().replace('m', 'm').replace('h', 'h')
    const result = timeframeMap[tf] || timeframeMap[timeframe]
    if (result) {
      return result
    }
  }
  
  // Sinon utiliser le mapping global
  const yahoo = YAHOO_SYMBOLS_MAP[symbol]
  if (yahoo) {
    return yahoo
  }
  
  throw new Error(`Symbol "${symbol}" not found in Yahoo Finance mapping`)
}

// Vérifier qu'un symbole ORVYN existe dans Yahoo Finance (compatibilité)
export function getYahooSymbol(symbol: string): string {
  return getYahooSymbolByTimeframe(symbol, '1d') // Par défaut, timeframe daily
}
