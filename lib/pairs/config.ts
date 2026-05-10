// lib/pairs/config.ts
// Catalogue centralisé de toutes les paires du Macro Desk ORVYNDESK

export type PairCategory = "metal" | "forex" | "commodity" | "index" | "rate" | "volatility";

export interface PairConfig {
  id: string;
  symbol: string;
  displayName: string;
  fullName: string;
  category: PairCategory;
  apiSymbols: {
    yahoo?: string;
    twelveData?: string;
    finnhub?: string;
    alphaVantage?: string;
    fred?: string;
    stooq?: string;
    tradingView?: string;
  };
  newsKeywords: string[];
  macroDrivers: {
    series: string;
    weight: number;
    label: string;
  }[];
  correlatedPairs?: string[];
  precision: number;
  priceSourceOrder: ("goldapi" | "metals" | "twelveData" | "yahoo" | "fred" | "stooq")[];
}

export const PAIRS: Record<string, PairConfig> = {
  XAUUSD: {
    id: "XAUUSD",
    symbol: "XAU/USD",
    displayName: "XAUUSD",
    fullName: "OR / DOLLAR AMÉRICAIN",
    category: "metal",
    apiSymbols: {
      yahoo: "GC=F",
      twelveData: "XAU/USD",
      stooq: "XAUUSD",
      tradingView: "OANDA:XAUUSD",
    },
    newsKeywords: ["gold", "XAU", "precious metals", "fed", "inflation", "real rates", "treasury", "FOMC", "powell", "dollar", "central bank gold", "ETF flows", "GLD", "safe haven", "geopolitical", "China gold", "gold reserves", "TIPS"],
    macroDrivers: [
      { series: "DFII10", weight: -0.55, label: "Real Rates (TIPS)" },  // Driver #1 - correlation -0.85
      { series: "DGS10", weight: -0.20, label: "US 10Y Yield" },
      { series: "DTWEXBGS", weight: -0.35, label: "Dollar Index (DXY)" },
      { series: "T5YIE", weight: 0.30, label: "Inflation Expectations" },
      { series: "VIXCLS", weight: 0.15, label: "VIX (Fear)" },
    ],
    correlatedPairs: ["DXY", "XAGUSD"],
    precision: 3,
    priceSourceOrder: ["goldapi", "metals", "twelveData", "yahoo"],
  },
  DXY: {
    id: "DXY",
    symbol: "DXY",
    displayName: "DXY",
    fullName: "US DOLLAR CURRENCY INDEX",
    category: "forex",
    apiSymbols: {
      yahoo: "DX-Y.NYB",
      twelveData: "DXY",
      fred: "DTWEXBGS",
      tradingView: "TVC:DXY",
    },
    newsKeywords: ["dollar", "DXY", "fed", "FOMC", "powell", "interest rates", "treasury", "ECB", "yen", "euro"],
    macroDrivers: [
      { series: "DGS10", weight: 0.40, label: "US 10Y Yield" },
      { series: "DFF", weight: 0.30, label: "Fed Funds Rate" },
      { series: "DFII10", weight: 0.35, label: "Real Rates" },
      { series: "T10Y2Y", weight: -0.15, label: "Yield Curve" },
    ],
    correlatedPairs: ["XAUUSD", "US10Y"],
    precision: 3,
    priceSourceOrder: ["twelveData", "yahoo", "fred"],
  },
  XAGUSD: {
    id: "XAGUSD",
    symbol: "XAG/USD",
    displayName: "XAGUSD",
    fullName: "ARGENT / DOLLAR AMÉRICAIN",
    category: "metal",
    apiSymbols: {
      yahoo: "SI=F",
      twelveData: "XAG/USD",
      stooq: "XAGUSD",
      tradingView: "OANDA:XAGUSD",
    },
    newsKeywords: ["silver", "XAG", "precious metals", "industrial metals", "fed", "inflation", "dollar", "solar", "photovoltaic", "EV battery", "SLV", "COMEX silver", "silver demand", "industrial demand", "green energy"],
    macroDrivers: [
      { series: "DGS10", weight: -0.25, label: "US 10Y Yield" },
      { series: "DFII10", weight: -0.40, label: "Real Rates" },
      { series: "DTWEXBGS", weight: -0.30, label: "Dollar Index" },
      { series: "INDPRO", weight: 0.20, label: "Industrial Production" },
    ],
    correlatedPairs: ["XAUUSD", "WTI"],
    precision: 5,
    priceSourceOrder: ["metals", "twelveData", "yahoo"],
  },
  WTI: {
    id: "WTI",
    symbol: "WTI",
    displayName: "WTI",
    fullName: "WEST TEXAS INTERMEDIATE CRUDE OIL",
    category: "commodity",
    apiSymbols: {
      yahoo: "CL=F",
      twelveData: "WTI/USD",
      fred: "DCOILWTICO",
      tradingView: "TVC:USOIL",
    },
    newsKeywords: ["oil", "WTI", "crude", "OPEC", "OPEC+", "saudi", "russia", "energy", "petroleum", "barrel", "EIA", "API", "inventories", "crude stocks", "SPR", "Iran", "production cut", "refinery"],
    macroDrivers: [
      { series: "DTWEXBGS", weight: -0.25, label: "Dollar Index" },
      { series: "INDPRO", weight: 0.35, label: "Industrial Production" },
      { series: "PAYEMS", weight: 0.15, label: "Employment" },
      { series: "WTISPLC", weight: 0.25, label: "WTI Spot Price" },
    ],
    correlatedPairs: ["US500", "XAGUSD", "DXY", "US10Y"],
    precision: 3,
    priceSourceOrder: ["twelveData", "yahoo", "fred"],
  },
  US500: {
    id: "US500",
    symbol: "SPX500",
    displayName: "US500",
    fullName: "INDICE S&P 500",
    category: "index",
    apiSymbols: {
      yahoo: "^GSPC",
      twelveData: "SPX",
      stooq: "^spx",
      tradingView: "SP:SPX",
    },
    newsKeywords: ["S&P 500", "SPX", "stocks", "earnings", "fed", "FOMC", "wall street", "equities", "market"],
    macroDrivers: [
      { series: "DGS10", weight: -0.25, label: "US 10Y Yield" },
      { series: "DFF", weight: -0.20, label: "Fed Funds" },
      { series: "VIXCLS", weight: -0.45, label: "VIX" },
      { series: "T10Y2Y", weight: 0.15, label: "Yield Curve" },
    ],
    correlatedPairs: ["US100", "VIX"],
    precision: 1,
    priceSourceOrder: ["twelveData", "yahoo", "stooq"],
  },
  US100: {
    id: "US100",
    symbol: "NAS100",
    displayName: "US100",
    fullName: "US 100 CASH CFD",
    category: "index",
    apiSymbols: {
      yahoo: "^NDX",
      twelveData: "NDX",
      stooq: "^ndx",
      tradingView: "NASDAQ:NDX",
    },
    newsKeywords: ["Nasdaq", "tech stocks", "NDX", "AI", "artificial intelligence", "NVDA", "nvidia", "semiconductors", "chips", "magnificent 7", "mega cap", "earnings", "fed", "rates", "growth stocks"],
    macroDrivers: [
      { series: "DGS10", weight: -0.40, label: "US 10Y Yield" },
      { series: "DFII10", weight: -0.35, label: "Real Rates" },
      { series: "VIXCLS", weight: -0.40, label: "VIX" },
    ],
    correlatedPairs: ["US500", "VIX"],
    precision: 1,
    priceSourceOrder: ["twelveData", "yahoo"],
  },
  US30: {
    id: "US30",
    symbol: "US30",
    displayName: "US30",
    fullName: "INDICE DOW JONES INDUSTRIEL",
    category: "index",
    apiSymbols: {
      yahoo: "^DJI",
      twelveData: "DJI",
      stooq: "^dji",
      tradingView: "DJ:DJI",
    },
    newsKeywords: ["Dow Jones", "DJI", "industrials", "blue chips", "earnings", "fed", "economy"],
    macroDrivers: [
      { series: "DGS10", weight: -0.20, label: "US 10Y Yield" },
      { series: "VIXCLS", weight: -0.40, label: "VIX" },
      { series: "INDPRO", weight: 0.25, label: "Industrial Production" },
      { series: "PAYEMS", weight: 0.20, label: "Employment" },
    ],
    correlatedPairs: ["US500", "WTI"],
    precision: 1,
    priceSourceOrder: ["twelveData", "yahoo"],
  },
  VIX: {
    id: "VIX",
    symbol: "VIX",
    displayName: "VIX",
    fullName: "CBOE VOLATILITY INDEX",
    category: "volatility",
    apiSymbols: {
      yahoo: "^VIX",
      fred: "VIXCLS",
      stooq: "^vix",
      tradingView: "CBOE:VIX",
    },
    newsKeywords: ["VIX", "volatility", "fear", "market stress", "uncertainty", "panic", "crash", "put call ratio", "options", "hedging", "risk off"],
    macroDrivers: [
      { series: "VIXCLS", weight: 1.0, label: "VIX Spot" },
      { series: "T10Y2Y", weight: -0.20, label: "Yield Curve" },
      { series: "DFF", weight: 0.15, label: "Fed Funds" },
      { series: "SP500", weight: -0.45, label: "S&P 500 Inverse" },
    ],
    correlatedPairs: ["US500", "XAUUSD"],
    precision: 2,
    priceSourceOrder: ["yahoo", "fred", "stooq"],
  },
  US10Y: {
    id: "US10Y",
    symbol: "US10Y",
    displayName: "US10Y",
    fullName: "US 10 YEAR TREASURY YIELD",
    category: "rate",
    apiSymbols: {
      yahoo: "^TNX",
      fred: "DGS10",
      tradingView: "TVC:US10Y",
    },
    newsKeywords: ["10 year yield", "treasury", "bond", "fed", "FOMC", "rates", "inflation", "powell"],
    macroDrivers: [
      { series: "DFF", weight: 0.50, label: "Fed Funds Rate" },
      { series: "CPIAUCSL", weight: 0.30, label: "CPI Inflation" },
      { series: "DTWEXBGS", weight: 0.20, label: "Dollar Index" },
    ],
    correlatedPairs: ["DXY", "XAUUSD"],
    precision: 3,
    priceSourceOrder: ["fred", "yahoo"],
  },
  USDJPY: {
    id: "USDJPY",
    symbol: "USD/JPY",
    displayName: "USDJPY",
    fullName: "DOLLAR / YEN JAPONAIS",
    category: "forex",
    apiSymbols: {
      yahoo: "USDJPY=X",
      twelveData: "USD/JPY",
      tradingView: "FX:USDJPY",
    },
    newsKeywords: ["yen", "JPY", "BOJ", "Bank of Japan", "carry trade", "risk sentiment", "japan", "ueda", "intervention"],
    macroDrivers: [
      { series: "DGS10", weight: 0.45, label: "US 10Y Yield" },
      { series: "DFF", weight: 0.35, label: "Fed Funds" },
      { series: "VIXCLS", weight: -0.25, label: "VIX (Risk-off = JPY up)" },
    ],
    correlatedPairs: ["DXY", "US10Y", "XAUUSD"],
    precision: 3,
    priceSourceOrder: ["twelveData", "yahoo"],
  },
  US02Y: {
    id: "US02Y",
    symbol: "US02Y",
    displayName: "US02Y",
    fullName: "US 2 YEAR TREASURY YIELD",
    category: "rate",
    apiSymbols: {
      yahoo: "^IRX",
      fred: "DGS2",
      tradingView: "TVC:US02Y",
    },
    newsKeywords: ["2 year yield", "short term rates", "fed expectations", "FOMC", "rate cuts", "rate hikes", "fed pivot"],
    macroDrivers: [
      { series: "DFF", weight: 0.70, label: "Fed Funds Rate" },
      { series: "CPIAUCSL", weight: 0.20, label: "CPI Inflation" },
      { series: "T10Y2Y", weight: -0.30, label: "Yield Curve 2Y-10Y" },
    ],
    correlatedPairs: ["US10Y", "DXY", "XAUUSD"],
    precision: 3,
    priceSourceOrder: ["fred", "yahoo"],
  },
  GOLDSILVER: {
    id: "GOLDSILVER",
    symbol: "XAU/XAG",
    displayName: "GOLD/SILVER",
    fullName: "RATIO OR / ARGENT",
    category: "metal",
    apiSymbols: {
      tradingView: "TVC:GOLDSILVER",
    },
    newsKeywords: ["gold silver ratio", "precious metals", "silver outperformance", "gold outperformance", "industrial metals"],
    macroDrivers: [
      { series: "INDPRO", weight: -0.40, label: "Industrial Production (Silver use)" },
      { series: "VIXCLS", weight: 0.35, label: "VIX (Fear = Gold outperforms)" },
      { series: "DFII10", weight: 0.25, label: "Real Rates" },
    ],
    correlatedPairs: ["XAUUSD", "XAGUSD"],
    precision: 2,
    priceSourceOrder: ["yahoo"],
  },
};

export const PAIR_IDS = Object.keys(PAIRS);
export const getPair = (id: string): PairConfig | null => PAIRS[id.toUpperCase()] || null;
export const getAllPairs = (): PairConfig[] => Object.values(PAIRS);
export const getPairsByCategory = (cat: PairCategory): PairConfig[] =>
  Object.values(PAIRS).filter(p => p.category === cat);
