// ═══════════════════════════════════════════════════════════════════════════
// MULTI-TIMEFRAME OHLC FETCHER
// Récupère les données OHLC pour Weekly, Daily et H4 depuis Yahoo Finance
// ═══════════════════════════════════════════════════════════════════════════

// Types pour les données OHLC par timeframe
export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MultiTimeframeData {
  symbol: string;
  weekly: OHLCData[];  // Derniers 52 bougies (1 an)
  daily: OHLCData[];   // Derniers 252 bougies (1 an trading)
  h4: OHLCData[];      // Derniers 90 bougies (~15 jours)
}

// Cache pour OHLC (30 min TTL pour éviter trop d'appels Yahoo)
const ohlcCache = new Map<string, { data: MultiTimeframeData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch OHLC data from Yahoo Finance
 * Utilise l'API publique Yahoo Finance (yfinance equivalent)
 */
async function fetchYahooOHLC(
  symbol: string,
  interval: '1wk' | '1d' | '1h',
  range: string
): Promise<OHLCData[]> {
  try {
    // Use Yahoo Finance chart API for real OHLC data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }
    })
    
    if (!response.ok) {
      console.warn(`[OHLC] Yahoo returned ${response.status} for ${symbol}`)
      return []
    }
    
    const data = await response.json()
    const result = data?.chart?.result?.[0]
    
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return []
    }
    
    const quotes = result.indicators.quote[0]
    const bars: OHLCData[] = []
    
    for (let i = 0; i < result.timestamp.length; i++) {
      if (quotes.close[i] && quotes.close[i] > 0) {
        bars.push({
          timestamp: result.timestamp[i],
          open: quotes.open[i] || quotes.close[i],
          high: quotes.high[i] || quotes.close[i],
          low: quotes.low[i] || quotes.close[i],
          close: quotes.close[i],
          volume: quotes.volume?.[i] || 0
        })
      }
    }
    
    return bars
  } catch (error) {
    console.error(`[OHLC] Failed to fetch for ${symbol}:`, error)
    return []
  }
}

/**
 * Fetch multi-timeframe OHLC data for an asset
 * Avec cache pour éviter trop d'appels
 */
export async function fetchMultiTimeframeOHLC(
  yahooSymbol: string,
  forceRefresh: boolean = false
): Promise<MultiTimeframeData> {
  // Check cache
  const cached = ohlcCache.get(yahooSymbol);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch en parallèle pour les 3 timeframes
  const [weekly, daily, h4] = await Promise.all([
    fetchYahooOHLC(yahooSymbol, '1wk', '1y'),
    fetchYahooOHLC(yahooSymbol, '1d', '1y'),
    fetchYahooOHLC(yahooSymbol, '1h', '30d'),
  ]);

  const data: MultiTimeframeData = {
    symbol: yahooSymbol,
    weekly,
    daily,
    h4,
  };

  // Cache le résultat
  ohlcCache.set(yahooSymbol, { data, timestamp: Date.now() });

  return data;
}

/**
 * Calcule les indicateurs sur un timeframe spécifique
 */
export function calculateTimeframeIndicators(ohlc: OHLCData[]) {
  if (ohlc.length === 0) return null;

  const closes = ohlc.map(c => c.close);
  const highs = ohlc.map(c => c.high);
  const lows = ohlc.map(c => c.low);

  return {
    close: closes[closes.length - 1],
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    rsi: calculateRSI(closes, 14),
    highestHigh: Math.max(...highs.slice(-20)),
    lowestLow: Math.min(...lows.slice(-20)),
  };
}

// Fonctions helper - copiées de indicatorFetcher.ts
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
