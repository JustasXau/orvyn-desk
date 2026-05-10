// lib/pairs/types.ts
// Types partagés pour le Macro Desk ORVYNDESK

export interface PairPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
  open?: number;
  previousClose?: number;
  volume?: number;
  timestamp: number;
  source: string;
}

export type BiasLevel =
  | "Strongly Bullish"
  | "Bullish"
  | "Slightly Bullish"
  | "Neutral"
  | "Slightly Bearish"
  | "Bearish"
  | "Strongly Bearish";

export interface PairBias {
  swing: {
    level: BiasLevel;
    confidence: number;
    direction: "up" | "down" | "neutral";
  };
  day: {
    level: BiasLevel;
    confidence: number;
    direction: "up" | "down" | "neutral";
  };
}

export interface PairAnalysis {
  pairId: string;
  edgeFactor: number;       // 0-100
  bias: PairBias;
  mood: {
    score: number;          // 0-100
    label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  };
  pulse: {
    level: "Calme" | "Tradable" | "Sauvage";
    score: number;
  };
  flow: {
    level: "Mince" | "Sain" | "Chargé";
    score: number;
  };
  trend: {
    level: "Variation" | "Emergence" | "Continuation" | "Cassure";
    direction: "up" | "down" | "sideways" | "neutral";
  };
  aiInsight?: string;
  updatedAt: number;
}

export interface PairCorrelation {
  pairId: string;
  correlation: number;      // -100 à 100
  trend: "positive" | "negative" | "neutral" | "increasing" | "decreasing" | "stable";
}

export interface PairNewsItem {
  uuid: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceCategory: "GEO" | "FED" | "MARKET" | "EARNINGS" | "GENERAL";
  publishedAt: string;
  publishedAgo: string;
  sentiment?: number;
  impact: "low" | "medium" | "high";
  relevanceScore: number;
}

export interface MacroContext {
  fedFundsRate: number | null;
  cpi: number | null;
  us10y: number | null;
  realRate10y: number | null;
  dxy: number | null;
  vix: number | null;
  yieldCurve2y10y: number | null;
}

export interface FullPairData {
  config: {
    id: string;
    symbol: string;
    fullName: string;
    category: string;
    correlatedPairs: string[];
    precision: number;
  };
  price: PairPrice;
  analysis: PairAnalysis;
  correlations: PairCorrelation[];
  news: PairNewsItem[];
  macro: MacroContext;
}

export interface DeskOverview {
  pairs: {
    id: string;
    symbol: string;
    fullName: string;
    category: string;
    price: PairPrice;
    swingBias: { level: BiasLevel; confidence: number };
    dayBias: { level: BiasLevel; confidence: number };
    edgeFactor: number;
  }[];
  macro: MacroContext;
  updatedAt: number;
}
