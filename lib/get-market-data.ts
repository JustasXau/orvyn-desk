export type MarketSnapshot = {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  timestamp: number;
  source: string;
};

// Symbol mapping for different APIs
const SYMBOL_MAP: Record<string, { finnhub?: string; twelvedata?: string; goldapi?: string; yahoo?: string }> = {
  // Precious Metals (XAU/USD main trading asset)
  'XAU/USD': { goldapi: 'XAU', twelvedata: 'XAU/USD', yahoo: 'GC=F' },
  'XAG/USD': { goldapi: 'XAG', twelvedata: 'XAG/USD', yahoo: 'SI=F' },
  // Dollar Index (inverse correlation with gold)
  'DXY': { twelvedata: 'DXY', yahoo: 'DX-Y.NYB' },
  // US Treasury yields (correlation with gold)
  'US10Y': { yahoo: '^TNX' },
  // Volatility Index (risk sentiment)
  'VIX': { yahoo: '^VIX' },
  // Forex
  'EUR/USD': { finnhub: 'OANDA:EUR_USD', twelvedata: 'EUR/USD', yahoo: 'EURUSD=X' },
  'GBP/USD': { finnhub: 'OANDA:GBP_USD', twelvedata: 'GBP/USD', yahoo: 'GBPUSD=X' },
  'USD/JPY': { finnhub: 'OANDA:USD_JPY', twelvedata: 'USD/JPY', yahoo: 'USDJPY=X' },
  // Energy (WTI crude oil)
  'WTI': { twelvedata: 'WTI/USD', yahoo: 'CL=F' },
  'USOIL': { twelvedata: 'WTI/USD', yahoo: 'CL=F' },
  'UKOIL': { twelvedata: 'BRENT/USD', yahoo: 'BZ=F' },
  'BRENT': { twelvedata: 'BRENT/USD', yahoo: 'BZ=F' },
  // US Indices
  'US30': { finnhub: 'FOREXCOM:DJI', twelvedata: 'DJI', yahoo: '^DJI' },
  'US100': { finnhub: 'FOREXCOM:NDX', twelvedata: 'NDX', yahoo: '^NDX' },
  'US500': { finnhub: 'FOREXCOM:SPX', twelvedata: 'SPX', yahoo: '^GSPC' },
  'SP500': { finnhub: 'FOREXCOM:SPX', twelvedata: 'SPX', yahoo: '^GSPC' },
  // Crypto
  'BTC/USD': { finnhub: 'BINANCE:BTCUSDT', twelvedata: 'BTC/USD', yahoo: 'BTC-USD' },
  'ETH/USD': { finnhub: 'BINANCE:ETHUSDT', twelvedata: 'ETH/USD', yahoo: 'ETH-USD' },
};

// Fetch from Finnhub
async function fetchFinnhub(symbol: string): Promise<MarketSnapshot | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  
  const mappedSymbol = SYMBOL_MAP[symbol]?.finnhub || symbol;
  
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(mappedSymbol)}&token=${apiKey}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data || data.c === 0) return null;
    
    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      timestamp: Date.now(),
      source: "finnhub",
    };
  } catch {
    return null;
  }
}

// Fetch from TwelveData
async function fetchTwelveData(symbol: string): Promise<MarketSnapshot | null> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return null;
  
  const mappedSymbol = SYMBOL_MAP[symbol]?.twelvedata || symbol;
  
  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(mappedSymbol)}&apikey=${apiKey}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data || data.status === 'error' || !data.price) return null;
    
    return {
      symbol,
      price: parseFloat(data.price),
      timestamp: Date.now(),
      source: "twelvedata",
    };
  } catch {
    return null;
  }
}

// Fetch from Gold API (for precious metals)
async function fetchGoldApi(symbol: string): Promise<MarketSnapshot | null> {
  const apiKey = process.env.GOLDAPI_KEY;
  if (!apiKey) return null;
  
  const metalSymbol = SYMBOL_MAP[symbol]?.goldapi;
  if (!metalSymbol) return null; // Only for metals
  
  try {
    const res = await fetch(
      `https://www.goldapi.io/api/${metalSymbol}/USD`,
      { 
        headers: { 'x-access-token': apiKey },
        next: { revalidate: 60 } 
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data || !data.price) return null;
    
    return {
      symbol,
      price: data.price,
      change: data.ch,
      changePercent: data.chp,
      high: data.high_price,
      low: data.low_price,
      open: data.open_price,
      timestamp: Date.now(),
      source: "goldapi",
    };
  } catch {
    return null;
  }
}

// Fetch from Yahoo Finance (fallback)
async function fetchYahoo(symbol: string): Promise<MarketSnapshot | null> {
  const yahooSymbol = SYMBOL_MAP[symbol]?.yahoo || symbol;
  
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`,
      { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 } 
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    const result = data?.chart?.result?.[0];
    if (!result?.meta?.regularMarketPrice) return null;
    
    const meta = result.meta;
    const previousClose = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
    const change = meta.regularMarketPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;
    
    return {
      symbol,
      price: meta.regularMarketPrice,
      change,
      changePercent,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
      volume: meta.regularMarketVolume,
      timestamp: Date.now(),
      source: "yahoo",
    };
  } catch {
    return null;
  }
}

// Main function: fetch from all sources in parallel
export async function getMarketData(symbol: string): Promise<MarketSnapshot[]> {
  const results = await Promise.all([
    fetchFinnhub(symbol),
    fetchTwelveData(symbol),
    fetchGoldApi(symbol),
    fetchYahoo(symbol),
  ]);
  
  // Filter out null results
  return results.filter((r): r is MarketSnapshot => r !== null);
}

// Get best price (priority: GoldAPI for metals, then TwelveData, Finnhub, Yahoo)
export async function getBestPrice(symbol: string): Promise<MarketSnapshot | null> {
  const results = await getMarketData(symbol);
  
  if (results.length === 0) return null;
  
  // Priority order based on symbol type
  const isMetalOrEnergy = symbol.includes('XAU') || symbol.includes('XAG') || symbol.includes('OIL');
  
  const priorityOrder = isMetalOrEnergy
    ? ['goldapi', 'twelvedata', 'yahoo', 'finnhub']
    : ['twelvedata', 'finnhub', 'yahoo'];
  
  for (const source of priorityOrder) {
    const result = results.find(r => r.source === source);
    if (result) return result;
  }
  
  return results[0];
}

// Get aggregated price (average from multiple sources)
export async function getAggregatedPrice(symbol: string): Promise<MarketSnapshot | null> {
  const results = await getMarketData(symbol);
  
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  
  // Calculate weighted average (more recent = higher weight)
  const avgPrice = results.reduce((sum, r) => sum + r.price, 0) / results.length;
  const avgChange = results.reduce((sum, r) => sum + (r.change || 0), 0) / results.length;
  const avgChangePercent = results.reduce((sum, r) => sum + (r.changePercent || 0), 0) / results.length;
  
  return {
    symbol,
    price: avgPrice,
    change: avgChange,
    changePercent: avgChangePercent,
    timestamp: Date.now(),
    source: `aggregated (${results.map(r => r.source).join(', ')})`,
  };
}

// Signal types
export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

export interface Signal {
  action: SignalAction;
  confidence: number;
}

// Compute trading signal based on price data
export function computeSignal(data: number[]): Signal {
  if (data.length === 0) {
    return { action: 'HOLD', confidence: 0 };
  }
  
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const last = data[data.length - 1];
  
  // If price is 0.5% below average -> BUY signal
  if (last < avg * 0.995) {
    return { action: 'BUY', confidence: 0.7 };
  }
  
  // If price is 0.5% above average -> SELL signal
  if (last > avg * 1.005) {
    return { action: 'SELL', confidence: 0.7 };
  }
  
  // Otherwise -> HOLD
  return { action: 'HOLD', confidence: 0.5 };
}

// Enhanced signal with more indicators
export function computeEnhancedSignal(
  prices: number[],
  volumes?: number[]
): Signal & { reason: string } {
  if (prices.length < 5) {
    return { action: 'HOLD', confidence: 0, reason: 'Insufficient data' };
  }
  
  const last = prices[prices.length - 1];
  const avg5 = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avg20 = prices.length >= 20 
    ? prices.slice(-20).reduce((a, b) => a + b, 0) / 20 
    : avg5;
  
  // Calculate momentum
  const momentum = (last - prices[prices.length - 5]) / prices[prices.length - 5];
  
  // Volume analysis (if available)
  let volumeSignal = 0;
  if (volumes && volumes.length >= 5) {
    const avgVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const lastVol = volumes[volumes.length - 1];
    volumeSignal = lastVol > avgVol * 1.5 ? 0.1 : 0;
  }
  
  // Trend analysis
  const shortAboveLong = avg5 > avg20;
  const priceBelowShort = last < avg5 * 0.995;
  const priceAboveShort = last > avg5 * 1.005;
  
  // BUY conditions
  if (priceBelowShort && shortAboveLong) {
    return { 
      action: 'BUY', 
      confidence: Math.min(0.85, 0.7 + volumeSignal + Math.abs(momentum) * 0.5),
      reason: 'Pullback in uptrend' 
    };
  }
  
  if (momentum > 0.02 && shortAboveLong) {
    return { 
      action: 'BUY', 
      confidence: Math.min(0.8, 0.65 + volumeSignal),
      reason: 'Strong momentum with trend' 
    };
  }
  
  // SELL conditions
  if (priceAboveShort && !shortAboveLong) {
    return { 
      action: 'SELL', 
      confidence: Math.min(0.85, 0.7 + volumeSignal + Math.abs(momentum) * 0.5),
      reason: 'Rally in downtrend' 
    };
  }
  
  if (momentum < -0.02 && !shortAboveLong) {
    return { 
      action: 'SELL', 
      confidence: Math.min(0.8, 0.65 + volumeSignal),
      reason: 'Strong momentum with trend' 
    };
  }
  
  // HOLD
  return { 
    action: 'HOLD', 
    confidence: 0.5,
    reason: 'No clear signal' 
  };
}

// Macro score calculation
// Combines news sentiment and interest rate to determine macro environment
// newsSentiment: -1 (bearish) to 1 (bullish)
// rate: current interest rate (higher rate = negative for risk assets)
export function macroScore(newsSentiment: number, rate: number): number {
  let score = 0;
  // News sentiment has 60% weight
  score += newsSentiment * 0.6;
  // Higher rates are negative for markets (40% weight)
  score -= rate * 0.4;
  return score;
}

// Enhanced macro analysis with multiple factors
export interface MacroAnalysis {
  score: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  factors: {
    newsSentiment: number;
    interestRate: number;
    inflation?: number;
    gdpGrowth?: number;
  };
}

export function analyzeMacro(
  newsSentiment: number,
  rate: number,
  inflation?: number,
  gdpGrowth?: number
): MacroAnalysis {
  let score = macroScore(newsSentiment, rate);
  
  // Add inflation impact (if available)
  if (inflation !== undefined) {
    // High inflation is negative
    score -= (inflation > 3 ? 0.1 : 0);
  }
  
  // Add GDP growth impact (if available)
  if (gdpGrowth !== undefined) {
    // Positive GDP growth is bullish
    score += gdpGrowth * 0.1;
  }
  
  // Normalize score to -1 to 1 range
  score = Math.max(-1, Math.min(1, score));
  
  return {
    score,
    sentiment: score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral',
    factors: {
      newsSentiment,
      interestRate: rate,
      inflation,
      gdpGrowth,
    },
  };
}
