// ═══════════════════════════════════════════════════════════════════════════
// ORVYN DESK — CENTRALIZED ASSETS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// 
// SINGLE SOURCE OF TRUTH for all tradable assets
// Add a new asset here → it automatically appears everywhere in the app
// Modify indicator weights → all assets use the new weights
// 
// ═══════════════════════════════════════════════════════════════════════════

// Asset categories
export type AssetCategory = 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks';
export type AssetSubtype = 'major' | 'cross' | 'exotic' | 'us' | 'europe' | 'asia' | 'metal' | 'energy' | 'agriculture' | 'crypto';

// Asset definition
export interface Asset {
  symbol: string;
  description: string;
  category: AssetCategory;
  subtype: AssetSubtype;
  // Yahoo Finance symbol mapping (for data fetching)
  yahooSymbol: string;
  // TradingView symbol mapping (for charts)
  tradingViewSymbol: string;
  // Correlation keywords for news matching
  keywords: string[];
  // Primary correlations (symbols that affect this asset)
  correlations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// BIAS ENGINE CONFIGURATION — GLOBAL INDICATOR WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════
// 
// Modify these weights ONCE → applies to ALL assets automatically
// 
export const BIAS_WEIGHTS = {
  // SWING TRADING (Daily TF) - Total: 100%
  // Ces cles DOIVENT matcher celles utilisees dans biasEngine.ts
  swing: {
    structure: 30,     // HH/HL/LH/LL/BOS/CHoCH (optionnel, si candles dispo)
    emaCross: 25,      // EMA50/200 Golden/Death Cross
    macd: 20,          // MACD Daily histogram
    rsi: 15,           // RSI(14) - position relative to 50
    momentum: 5,       // Price momentum 1M/3M
    sentiment: 5,      // News sentiment
  },
  // DAY TRADING (H4/H1 TF) - Total: 100%
  day: {
    macd: 28,          // MACD 1H
    emaCross: 22,      // EMA9/21 1H
    rsi: 20,           // RSI(14) 1H
    stochastic: 15,    // Stochastic %K/%D
    bollingerBands: 10, // BB position
    sentiment: 5,      // Sentiment
  },
  // GLOBAL SCORE COMPOSITION
  global: {
    technical: 70,     // Technical indicators weight
    sentiment: 20,     // News sentiment weight
    macro: 10,         // Macro factors weight
  },
  // THRESHOLDS
  thresholds: {
    bullish: 15,       // Score >= 15 = Haussier
    strongBullish: 50, // Score >= 50 = Fort Haussier
    bearish: -15,      // Score <= -15 = Baissier
    strongBearish: -50, // Score <= -50 = Fort Baissier
    holdConfidence: 65, // Confidence < 65 = HOLD action
  },
  // ADX MULTIPLIERS (trend strength filter)
  adxMultipliers: {
    veryWeak: { threshold: 15, multiplier: 0.65 },
    weak: { threshold: 20, multiplier: 0.80 },
    developing: { threshold: 25, multiplier: 0.90 },
    normal: { threshold: 30, multiplier: 1.00 },
    strong: { threshold: 40, multiplier: 1.10 },
    veryStrong: { threshold: Infinity, multiplier: 1.20 },
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MASTER ASSET LIST — Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════════

export const ASSETS: Asset[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // FOREX — MAJORS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'EUR/USD',
    description: 'Euro / U.S. Dollar',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'EURUSD=X',
    tradingViewSymbol: 'FX:EURUSD',
    keywords: ['euro', 'eur', 'ecb', 'bce', 'europe', 'eurozone', 'lagarde'],
    correlations: ['DXY', 'GBP/USD', 'XAU/USD'],
  },
  {
    symbol: 'GBP/USD',
    description: 'British Pound / U.S. Dollar',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'GBPUSD=X',
    tradingViewSymbol: 'FX:GBPUSD',
    keywords: ['pound', 'sterling', 'gbp', 'boe', 'bank of england', 'uk', 'britain'],
    correlations: ['DXY', 'EUR/USD', 'XAU/USD'],
  },
  {
    symbol: 'USD/JPY',
    description: 'U.S. Dollar / Japanese Yen',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'USDJPY=X',
    tradingViewSymbol: 'FX:USDJPY',
    keywords: ['yen', 'jpy', 'boj', 'japan', 'japon', 'ueda'],
    correlations: ['DXY', 'US10Y', 'VIX'],
  },
  {
    symbol: 'USD/CHF',
    description: 'U.S. Dollar / Swiss Franc',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'USDCHF=X',
    tradingViewSymbol: 'FX:USDCHF',
    keywords: ['franc', 'chf', 'swiss', 'snb', 'switzerland'],
    correlations: ['DXY', 'EUR/CHF', 'XAU/USD'],
  },
  {
    symbol: 'AUD/USD',
    description: 'Australian Dollar / U.S. Dollar',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'AUDUSD=X',
    tradingViewSymbol: 'FX:AUDUSD',
    keywords: ['aussie', 'aud', 'rba', 'australia', 'iron ore', 'china'],
    correlations: ['DXY', 'COPPER', 'CHN50'],
  },
  {
    symbol: 'USD/CAD',
    description: 'U.S. Dollar / Canadian Dollar',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'USDCAD=X',
    tradingViewSymbol: 'FX:USDCAD',
    keywords: ['loonie', 'cad', 'boc', 'canada', 'oil'],
    correlations: ['DXY', 'WTI', 'BRENT'],
  },
  {
    symbol: 'NZD/USD',
    description: 'New Zealand Dollar / U.S. Dollar',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'NZDUSD=X',
    tradingViewSymbol: 'FX:NZDUSD',
    keywords: ['kiwi', 'nzd', 'rbnz', 'new zealand', 'dairy'],
    correlations: ['DXY', 'AUD/USD'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FOREX — CROSSES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'EUR/GBP',
    description: 'Euro / British Pound',
    category: 'forex',
    subtype: 'cross',
    yahooSymbol: 'EURGBP=X',
    tradingViewSymbol: 'FX:EURGBP',
    keywords: ['euro', 'pound', 'ecb', 'boe', 'europe', 'uk'],
    correlations: ['EUR/USD', 'GBP/USD'],
  },
  {
    symbol: 'EUR/JPY',
    description: 'Euro / Japanese Yen',
    category: 'forex',
    subtype: 'cross',
    yahooSymbol: 'EURJPY=X',
    tradingViewSymbol: 'FX:EURJPY',
    keywords: ['euro', 'yen', 'ecb', 'boj'],
    correlations: ['EUR/USD', 'USD/JPY'],
  },
  {
    symbol: 'GBP/JPY',
    description: 'British Pound / Japanese Yen',
    category: 'forex',
    subtype: 'cross',
    yahooSymbol: 'GBPJPY=X',
    tradingViewSymbol: 'FX:GBPJPY',
    keywords: ['pound', 'yen', 'boe', 'boj'],
    correlations: ['GBP/USD', 'USD/JPY'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INDICES — US
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'US30',
    description: 'Dow Jones Industrial Average',
    category: 'indices',
    subtype: 'us',
    yahooSymbol: '^DJI',
    tradingViewSymbol: 'FOREXCOM:DJI',
    keywords: ['dow', 'djia', 'us30', 'dow jones', 'wall street', 'stock market', 'indices'],
    correlations: ['US100', 'US500', 'VIX'],
  },
  {
    symbol: 'US100',
    description: 'NASDAQ 100',
    category: 'indices',
    subtype: 'us',
    yahooSymbol: '^NDX',
    tradingViewSymbol: 'FOREXCOM:USTEC',
    keywords: ['nasdaq', 'tech', 'us100', 'technology', 'tech stocks', 'nvda', 'apple', 'microsoft', 'mag7'],
    correlations: ['US30', 'US500', 'VIX', 'BTC/USD'],
  },
  {
    symbol: 'US500',
    description: 'S&P 500',
    category: 'indices',
    subtype: 'us',
    yahooSymbol: '^GSPC',
    tradingViewSymbol: 'FOREXCOM:SPX500',
    keywords: ['s&p', 'sp500', 'us500', 's&p 500', 'spx'],
    correlations: ['US30', 'US100', 'VIX'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INDICES — EUROPE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'GER40',
    description: 'DAX 40 Germany',
    category: 'indices',
    subtype: 'europe',
    yahooSymbol: '^GDAXI',
    tradingViewSymbol: 'XETR:DAX',
    keywords: ['dax', 'germany', 'german', 'europe'],
    correlations: ['EU50', 'EUR/USD'],
  },
  {
    symbol: 'UK100',
    description: 'FTSE 100 UK',
    category: 'indices',
    subtype: 'europe',
    yahooSymbol: '^FTSE',
    tradingViewSymbol: 'FTSE:UKX',
    keywords: ['ftse', 'uk', 'britain', 'london'],
    correlations: ['GBP/USD', 'GER40'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INDICES — ASIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'JPN225',
    description: 'Nikkei 225 Japan',
    category: 'indices',
    subtype: 'asia',
    yahooSymbol: '^N225',
    tradingViewSymbol: 'TVC:NI225',
    keywords: ['nikkei', 'japan', 'tokyo'],
    correlations: ['USD/JPY', 'US100'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMODITIES — PRECIOUS METALS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'XAU/USD',
    description: 'Gold Spot / U.S. Dollar',
    category: 'commodities',
    subtype: 'metal',
    yahooSymbol: 'GC=F',
    tradingViewSymbol: 'OANDA:XAUUSD',
    keywords: ['gold', 'or', 'xau', 'bullion', 'safe haven', 'valeur refuge', 'precious metal', 'iran', 'war', 'conflict', 'geopolitical'],
    correlations: ['DXY', 'XAG/USD', 'US10Y'],
  },
  {
    symbol: 'XAG/USD',
    description: 'Silver Spot / U.S. Dollar',
    category: 'commodities',
    subtype: 'metal',
    yahooSymbol: 'SI=F',
    tradingViewSymbol: 'OANDA:XAGUSD',
    keywords: ['silver', 'argent', 'xag'],
    correlations: ['XAU/USD', 'DXY', 'COPPER'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMODITIES — ENERGY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'WTI',
    description: 'WTI Crude Oil',
    category: 'commodities',
    subtype: 'energy',
    yahooSymbol: 'CL=F',
    tradingViewSymbol: 'NYMEX:CL1!',
    keywords: ['wti', 'crude', 'oil', 'petrole', 'opec', 'iran', 'saudi'],
    correlations: ['BRENT', 'USD/CAD', 'XAU/USD'],
  },
  {
    symbol: 'BRENT',
    description: 'Brent Crude Oil',
    category: 'commodities',
    subtype: 'energy',
    yahooSymbol: 'BZ=F',
    tradingViewSymbol: 'NYMEX:BB1!',
    keywords: ['brent', 'crude', 'oil', 'petrole', 'opec'],
    correlations: ['WTI', 'USD/CAD'],
  },
  {
    symbol: 'NGAS',
    description: 'Natural Gas',
    category: 'commodities',
    subtype: 'energy',
    yahooSymbol: 'NG=F',
    tradingViewSymbol: 'NYMEX:NG1!',
    keywords: ['natural gas', 'gaz', 'lng'],
    correlations: ['WTI'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    symbol: 'BTC/USD',
    description: 'Bitcoin / U.S. Dollar',
    category: 'crypto',
    subtype: 'crypto',
    yahooSymbol: 'BTC-USD',
    tradingViewSymbol: 'BITSTAMP:BTCUSD',
    keywords: ['bitcoin', 'btc', 'crypto', 'cryptocurrency', 'halving', 'etf'],
    correlations: ['ETH/USD', 'US100', 'DXY'],
  },
  {
    symbol: 'ETH/USD',
    description: 'Ethereum / U.S. Dollar',
    category: 'crypto',
    subtype: 'crypto',
    yahooSymbol: 'ETH-USD',
    tradingViewSymbol: 'BITSTAMP:ETHUSD',
    keywords: ['ethereum', 'eth', 'crypto', 'defi'],
    correlations: ['BTC/USD', 'US100'],
  },
  {
    symbol: 'SOL/USD',
    description: 'Solana / U.S. Dollar',
    category: 'crypto',
    subtype: 'crypto',
    yahooSymbol: 'SOL-USD',
    tradingViewSymbol: 'BINANCE:SOLUSD',
    keywords: ['solana', 'sol', 'crypto'],
    correlations: ['BTC/USD', 'ETH/USD'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL — DOLLAR INDEX
  // ════════════════════════════════════════��══════════════════════════════════
  {
    symbol: 'DXY',
    description: 'U.S. Dollar Index',
    category: 'forex',
    subtype: 'major',
    yahooSymbol: 'DX-Y.NYB',
    tradingViewSymbol: 'TVC:DXY',
    keywords: ['dollar', 'dxy', 'usd', 'greenback', 'fed', 'federal reserve', 'rate', 'taux', 'powell'],
    correlations: ['EUR/USD', 'XAU/USD', 'US10Y'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Get all symbols
export function getAllSymbols(): string[] {
  return ASSETS.map(a => a.symbol);
}

// Get assets by category
export function getAssetsByCategory(category: AssetCategory): Asset[] {
  return ASSETS.filter(a => a.category === category);
}

// Get asset by symbol
export function getAsset(symbol: string): Asset | undefined {
  return ASSETS.find(a => a.symbol === symbol);
}

// Get Yahoo symbol for an asset
export function getYahooSymbol(symbol: string): string {
  const asset = getAsset(symbol);
  if (asset) return asset.yahooSymbol;
  
  // Fallback conversion for unknown symbols
  return symbol.replace('/', '').replace('-', '') + '=X';
}

// Get TradingView symbol
export function getTradingViewSymbol(symbol: string): string {
  const asset = getAsset(symbol);
  if (asset) return asset.tradingViewSymbol;
  return symbol;
}

// Get correlation symbols for an asset
export function getCorrelations(symbol: string): string[] {
  const asset = getAsset(symbol);
  return asset?.correlations || [];
}

// Get keywords for news matching
export function getKeywords(symbol: string): string[] {
  const asset = getAsset(symbol);
  return asset?.keywords || [symbol.split('/')[0].toLowerCase()];
}

// Group assets by category for UI
export function getGroupedAssets(): Record<AssetCategory, Asset[]> {
  return {
    forex: getAssetsByCategory('forex'),
    indices: getAssetsByCategory('indices'),
    commodities: getAssetsByCategory('commodities'),
    crypto: getAssetsByCategory('crypto'),
    stocks: getAssetsByCategory('stocks'),
  };
}

// Check if a symbol exists
export function isValidSymbol(symbol: string): boolean {
  return ASSETS.some(a => a.symbol === symbol);
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

// Process all assets with a function
export async function processAllAssets<T>(
  processor: (asset: Asset) => Promise<T>
): Promise<Map<string, T>> {
  const results = new Map<string, T>();
  
  await Promise.all(
    ASSETS.map(async (asset) => {
      try {
        const result = await processor(asset);
        results.set(asset.symbol, result);
      } catch (error) {
        console.error(`[BiasEngine] Error processing ${asset.symbol}:`, error);
      }
    })
  );
  
  return results;
}
