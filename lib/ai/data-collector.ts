// Data Collector — agrege TOUTES les sources en parallele
// C'est lui qui nourrit les 4 agents Groq

import { PAIR_CONFIG, normalizeSymbol, CACHE_TTL } from './config'
import { fetchYahooOHLC, fetchYahooSpotPrice, resampleTo4H, type OHLCBar } from '@/lib/sources/yahoo-extended'
import { fetchMacroDataBundle, type MacroDataBundle } from '@/lib/sources/fred-extended'
import { fetchAllRSSFeeds, type AggregatedNews } from '@/lib/sources/rss-feeds'
import { fetchFearGreedData, type FearGreedData } from '@/lib/sources/fear-greed'
import { fetchCryptoData, type CryptoData } from '@/lib/sources/coingecko'
import { fetchGeopoliticalData, type GeopoliticalData } from '@/lib/sources/gdelt-enriched'
import { fetchEconomicCalendar, type EconomicCalendarData } from '@/lib/sources/trading-economics-rss'
import { fetchRedditSentiment, type RedditSentimentData } from '@/lib/sources/reddit-sentiment'
import { calcEMABundle, type EMABundle } from './indicators/ema'
import { getLatestRSI, interpretRSI } from './indicators/rsi'
import { calcMACD, type MACDResult } from './indicators/macd'
import { calcADX, type ADXResult } from './indicators/adx'
import { calcBollinger, type BollingerResult } from './indicators/bollinger'
import { calcPivots, detectStructure, type PivotLevels } from './indicators/pivots'
import type { DataSourceInfo } from '@/types/ai-analysis'

export interface TimeframeData {
  bars: OHLCBar[]
  ema: EMABundle
  rsi: number | null
  rsiDescription: string
  macd: MACDResult | null
  adx: ADXResult | null
  bollinger: BollingerResult | null
  pivots: PivotLevels | null
  structure: { trend: string; description: string }
  atr: number | null             // Average True Range
  volumeRatio: number | null     // Volume actuel / moyenne 20 periodes
}

export interface CollectedData {
  // Infos de base
  symbol: string
  normalizedSymbol: string
  yahooSymbol: string
  fullName: string
  category: string

  // Prix spot
  currentPrice: number | null
  priceChange24h: number | null
  priceChangePct24h: number | null
  high24h: number | null
  low24h: number | null
  volume24h: number | null

  // Donnees techniques par timeframe
  weekly: TimeframeData | null
  daily: TimeframeData | null
  h4: TimeframeData | null

  // Donnees macro
  macro: MacroDataBundle

  // News et sentiment
  rssNews: AggregatedNews
  fearGreed: FearGreedData
  crypto: CryptoData
  geopolitical: GeopoliticalData
  calendar: EconomicCalendarData
  reddit: RedditSentimentData

  // Sources utilisees
  sources: DataSourceInfo[]

  // Score de completude (0-100)
  dataCompleteness: number
  collectedAt: number
}

function calcATR(bars: OHLCBar[], period = 14): number | null {
  if (bars.length < period + 1) return null
  const trs = bars.slice(1).map((bar, i) =>
    Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - bars[i].close),
      Math.abs(bar.low - bars[i].close)
    )
  )
  const recent = trs.slice(-period)
  return Math.round((recent.reduce((a, b) => a + b, 0) / period) * 100) / 100
}

function calcVolumeRatio(bars: OHLCBar[], period = 20): number | null {
  if (bars.length < period + 1) return null
  const avgVol = bars.slice(-period - 1, -1).reduce((a, b) => a + b.volume, 0) / period
  const lastVol = bars[bars.length - 1].volume
  if (avgVol === 0) return null
  return Math.round((lastVol / avgVol) * 100) / 100
}

function buildTimeframeData(bars: OHLCBar[]): TimeframeData | null {
  if (bars.length < 20) return null

  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)

  const rsi = getLatestRSI(closes)
  const lastBar = bars[bars.length - 1]

  return {
    bars,
    ema: calcEMABundle(closes),
    rsi,
    rsiDescription: rsi != null ? interpretRSI(rsi) : 'RSI non disponible',
    macd: calcMACD(closes),
    adx: calcADX(highs, lows, closes),
    bollinger: calcBollinger(closes),
    pivots: bars.length >= 2
      ? calcPivots(lastBar.high, lastBar.low, lastBar.close, lastBar.close)
      : null,
    structure: detectStructure(closes),
    atr: calcATR(bars),
    volumeRatio: calcVolumeRatio(bars),
  }
}

function sourceInfo(name: string, hasData: boolean, latency?: number): DataSourceInfo {
  return {
    name,
    status: hasData ? 'ok' : 'down',
    latency,
  }
}

export async function collectAllData(rawSymbol: string): Promise<CollectedData> {
  const symbol = normalizeSymbol(rawSymbol)
  const config = PAIR_CONFIG[symbol] || {
    yahooSymbol: symbol,
    fullName: symbol,
    category: 'Autre',
    correlated: [],
  }

  const start = Date.now()

  // ─── FETCH PARALLELE DE TOUTES LES SOURCES ────────────────────────────────
  const [
    spotPrice,
    weeklyRaw,
    dailyRaw,
    hourlyRaw,
    macro,
    rssNews,
    fearGreed,
    crypto,
    geopolitical,
    calendar,
    reddit,
  ] = await Promise.all([
    fetchYahooSpotPrice(config.yahooSymbol),
    fetchYahooOHLC(config.yahooSymbol, '1wk', '2y'),
    fetchYahooOHLC(config.yahooSymbol, '1d', '1y'),
    fetchYahooOHLC(config.yahooSymbol, '1h', '30d'),
    fetchMacroDataBundle(),
    fetchAllRSSFeeds(symbol),
    fetchFearGreedData(),
    fetchCryptoData(),
    fetchGeopoliticalData(symbol),
    fetchEconomicCalendar(),
    fetchRedditSentiment(symbol),
  ])

  // Resampler 1h → 4h
  const h4Bars = hourlyRaw.bars.length > 0 ? resampleTo4H(hourlyRaw.bars) : []

  const weekly = buildTimeframeData(weeklyRaw.bars)
  const daily = buildTimeframeData(dailyRaw.bars)
  const h4 = buildTimeframeData(h4Bars)

  // ─── SOURCES ──────────────────────────────────────────────────────────────
  const sources: DataSourceInfo[] = [
    sourceInfo('Yahoo Finance (Weekly)', weeklyRaw.bars.length > 0, Date.now() - start),
    sourceInfo('Yahoo Finance (Daily)', dailyRaw.bars.length > 0),
    sourceInfo('Yahoo Finance (H4)', h4Bars.length > 0),
    sourceInfo('Yahoo Finance (Spot)', spotPrice != null),
    sourceInfo('FRED (Macro)', macro.completeness > 0),
    sourceInfo('RSS Feeds', rssNews.sourcesAvailable.length > 0),
    sourceInfo('CNN Fear & Greed', fearGreed.cnn.value != null),
    sourceInfo('Crypto Fear & Greed', fearGreed.crypto.value != null),
    sourceInfo('CoinGecko', crypto.btcPrice != null),
    sourceInfo('GDELT (Geopolitique)', geopolitical.events.length > 0),
    sourceInfo('Calendrier Eco', calendar.events.length > 0),
    sourceInfo('Reddit Sentiment', reddit.posts.length > 0),
  ]

  // ─── COMPLETUDE ───────────────────────────────────────────────────────────
  const scores = [
    spotPrice != null ? 10 : 0,
    weekly != null ? 15 : 0,
    daily != null ? 15 : 0,
    h4 != null ? 10 : 0,
    macro.completeness > 50 ? 20 : macro.completeness > 20 ? 10 : 0,
    rssNews.sourcesAvailable.length > 0 ? 10 : 0,
    fearGreed.cnn.value != null ? 5 : 0,
    geopolitical.events.length > 0 ? 5 : 0,
    calendar.events.length > 0 ? 5 : 0,
    crypto.btcPrice != null ? 5 : 0,
  ]
  const dataCompleteness = scores.reduce((a, b) => a + b, 0)

  return {
    symbol,
    normalizedSymbol: symbol,
    yahooSymbol: config.yahooSymbol,
    fullName: config.fullName,
    category: config.category,
    currentPrice: spotPrice?.price ?? null,
    priceChange24h: spotPrice?.change ?? null,
    priceChangePct24h: spotPrice?.changePct ?? null,
    high24h: spotPrice?.high24h ?? null,
    low24h: spotPrice?.low24h ?? null,
    volume24h: spotPrice?.volume ?? null,
    weekly,
    daily,
    h4,
    macro,
    rssNews,
    fearGreed,
    crypto,
    geopolitical,
    calendar,
    reddit,
    sources,
    dataCompleteness,
    collectedAt: start,
  }
}
