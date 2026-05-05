export const YAHOO_SYMBOLS = {
  XAUUSD: 'GC=F',
  DXY: 'DX-Y.NYB',
  US10Y: '^TNX',
  XAGUSD: 'SI=F',
  VIX: '^VIX',
  SP500: '^GSPC',
  US100: '^NDX',
  US30: '^DJI',
} as const

export const GOLD_KEYWORDS = [
  'gold', 'xau', 'bullion', 'precious metal',
  'federal reserve', 'fed', 'fomc', 'powell',
  'interest rate', 'rate hike', 'rate cut',
  'dollar', 'dxy', 'usd', 'dollar index',
  'inflation', 'cpi', 'pce', 'deflation',
  'war', 'geopolitical', 'sanctions', 'conflict',
  'iran', 'russia', 'ukraine', 'middle east',
  'safe haven', 'risk off', 'flight to safety',
  'central bank', 'gold reserve', 'china gold',
  'treasury', 'bond yield', 'us10y', 'real rate',
  'silver', 'xag', 'precious metals',
  'nfp', 'payroll', 'gdp', 'recession',
  'trump', 'tariff', 'trade war',
  'gold etf', 'gld', 'iau',
  'bitcoin', 'crypto', 'digital gold',
  'store of value', 'inflation hedge',
]

export const CACHE_TTL = {
  PRICES: 30,
  BIAS: 300,
  NEWS: 300,
  CALENDAR: 1800,
  ANALYSIS: 600,
  REPORT: 300,
}

export const TIMEFRAME_CONFIG = {
  WEEKLY: { interval: '1wk', range: '1y',  weight: 0.40, emaFast: 50,  emaSlow: 200, rsiPeriod: 14, candles: 52 },
  DAILY:  { interval: '1d',  range: '9mo', weight: 0.35, emaFast: 50,  emaSlow: 200, rsiPeriod: 14, candles: 200 },
  H4:     { interval: '4h',  range: '15d', weight: 0.25, emaFast: 20,  emaSlow: 50,  rsiPeriod: 14, candles: 90 },
  H1:     { interval: '1h',  range: '2d',  weight: 0.40, emaFast: 9,   emaSlow: 20,  rsiPeriod: 9,  candles: 48 },
  M15:    { interval: '15m', range: '1d',  weight: 0.25, emaFast: 8,   emaSlow: 21,  rsiPeriod: 7,  candles: 96 },
}