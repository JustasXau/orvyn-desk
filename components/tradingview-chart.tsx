'use client'

import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { X, Clock, Loader2, ExternalLink, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts'

interface MarketEvent {
  id: string
  timestamp: Date
  unixTime: number      // Unix timestamp in seconds for chart positioning
  price: number         // Price level for chart positioning
  type: 'fed' | 'economic' | 'geopolitical' | 'technical'
  title: string
  description: string
  impact: 'bullish' | 'bearish' | 'neutral'
  session: string
  details: string[]
  technicalAnalysis: string
  url?: string
  source?: string
}

interface NewsItem {
  id: string
  headline: string
  summary?: string
  source: string
  url?: string
  datetime: number
  category?: string
  importance?: number
  isBreaking?: boolean
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface TradingViewChartProps {
  symbol: string
  height?: number
}

// Get the best interval for each symbol (some don't support H1)
function getBestInterval(symbol: string): string {
  // Symbols that need Daily timeframe
  const dailyOnly = [
    'DXY', 'VIX', 'US100', 'WTI', 'USOIL',
    // Some indices that don't support intraday
    'EU50', 'SPA35', 'ITA40', 'NED25', 'SUI20', 'SGP20', 'KOR200', 'CHN50',
    // Some commodities futures
    'WHEAT', 'CORN', 'SOYBEAN', 'COFFEE', 'SUGAR', 'COTTON',
  ]
  
  // Symbols that work better with H4
  const h4Preferred = [
    // Indices with limited intraday data
    'FRA40', 'HK50', 'AUS200', 'JPN225', 'US30', 'US500',
    // Some exotic forex pairs
    'USD/TRY', 'EUR/TRY', 'USD/ZAR', 'USD/MXN', 'USD/PLN', 'EUR/PLN',
    // Metals with futures
    'COPPER', 'XPT/USD', 'XPD/USD',
    // Energy futures
    'UKOIL', 'NATGAS', 'HEAT', 'GASOLINE',
  ]
  
  // Symbols that work better with 30min
  const m30Preferred = [
    'US2000',
  ]
  
  if (dailyOnly.includes(symbol)) return 'D'
  if (h4Preferred.includes(symbol)) return '240' // H4
  if (m30Preferred.includes(symbol)) return '30'
  
  // Default H1 for most forex, major indices, crypto, stocks
  return '60'
}

// Convert symbol to Yahoo Finance format for candle data
function getYahooSymbol(symbol: string): string {
  const map: Record<string, string> = {
    'XAU/USD': 'GC=F',
    'XAG/USD': 'SI=F',
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'JPY=X',
    'USD/CHF': 'CHF=X',
    'AUD/USD': 'AUDUSD=X',
    'USD/CAD': 'CAD=X',
    'NZD/USD': 'NZDUSD=X',
    'EUR/GBP': 'EURGBP=X',
    'EUR/JPY': 'EURJPY=X',
    'GBP/JPY': 'GBPJPY=X',
    'US30': 'YM=F',
    'US100': 'NQ=F',
    'US500': 'ES=F',
    'US2000': 'RTY=F',
    'DXY': 'DX-Y.NYB',
    'VIX': '^VIX',
    'BTC/USD': 'BTC-USD',
    'ETH/USD': 'ETH-USD',
    'USOIL': 'CL=F',
    'UKOIL': 'BZ=F',
    'NATGAS': 'NG=F',
    'COPPER': 'HG=F',
  }
  return map[symbol] || symbol
}

// Convert symbol to TradingView format - Complete mapping for all CFD instruments
function getTradingViewSymbol(symbol: string): string {
  const symbolMap: Record<string, string> = {
    // Forex Majors
    'EUR/USD': 'OANDA:EURUSD',
    'GBP/USD': 'OANDA:GBPUSD',
    'USD/JPY': 'OANDA:USDJPY',
    'USD/CHF': 'OANDA:USDCHF',
    'AUD/USD': 'OANDA:AUDUSD',
    'USD/CAD': 'OANDA:USDCAD',
    'NZD/USD': 'OANDA:NZDUSD',
    // EUR Crosses
    'EUR/GBP': 'OANDA:EURGBP',
    'EUR/JPY': 'OANDA:EURJPY',
    'EUR/CHF': 'OANDA:EURCHF',
    'EUR/AUD': 'OANDA:EURAUD',
    'EUR/CAD': 'OANDA:EURCAD',
    'EUR/NZD': 'OANDA:EURNZD',
    // GBP Crosses
    'GBP/JPY': 'OANDA:GBPJPY',
    'GBP/CHF': 'OANDA:GBPCHF',
    'GBP/AUD': 'OANDA:GBPAUD',
    'GBP/CAD': 'OANDA:GBPCAD',
    'GBP/NZD': 'OANDA:GBPNZD',
    // AUD Crosses
    'AUD/JPY': 'OANDA:AUDJPY',
    'AUD/CHF': 'OANDA:AUDCHF',
    'AUD/CAD': 'OANDA:AUDCAD',
    'AUD/NZD': 'OANDA:AUDNZD',
    // CAD Crosses
    'CAD/JPY': 'OANDA:CADJPY',
    'CAD/CHF': 'OANDA:CADCHF',
    // NZD Crosses
    'NZD/JPY': 'OANDA:NZDJPY',
    'NZD/CHF': 'OANDA:NZDCHF',
    'NZD/CAD': 'OANDA:NZDCAD',
    // CHF Crosses
    'CHF/JPY': 'OANDA:CHFJPY',
    // Forex Exotics
    'USD/MXN': 'OANDA:USDMXN',
    'USD/ZAR': 'OANDA:USDZAR',
    'USD/TRY': 'OANDA:USDTRY',
    'USD/SGD': 'OANDA:USDSGD',
    'USD/HKD': 'OANDA:USDHKD',
    'USD/SEK': 'OANDA:USDSEK',
    'USD/NOK': 'OANDA:USDNOK',
    'USD/DKK': 'OANDA:USDDKK',
    'USD/PLN': 'OANDA:USDPLN',
    'EUR/TRY': 'OANDA:EURTRY',
    'EUR/PLN': 'OANDA:EURPLN',
    'EUR/SEK': 'OANDA:EURSEK',
    'EUR/NOK': 'OANDA:EURNOK',
    // US Indices - Using FOREXCOM which is more reliable
    'US30': 'FOREXCOM:DJI',
    'US100': 'FOREXCOM:NSXUSD',
    'US500': 'FOREXCOM:SPXUSD',
    'US2000': 'AMEX:IWM',
    // European Indices
    'GER40': 'FOREXCOM:GER40',
    'UK100': 'FOREXCOM:UKXGBP',
    'FRA40': 'EURONEXT:PX1',
    'EU50': 'EUREX:FESX1!',
    'SPA35': 'BME:IBC',
    'ITA40': 'INDEX:FTSEMIB',
    'NED25': 'EURONEXT:AEX',
    'SUI20': 'SIX:SMI',
    // Asia Pacific Indices
    'JPN225': 'INDEX:NKY',
    'HK50': 'HSI:HSI',
    'AUS200': 'ASX:XJO',
    'CHN50': 'SSE:000001',
    'SGP20': 'SGX:ES3',
    'KOR200': 'KRX:KOSPI200',
    // Precious Metals - OANDA is most reliable
    'XAU/USD': 'OANDA:XAUUSD',
    'XAG/USD': 'OANDA:XAGUSD',
    'XPT/USD': 'OANDA:XPTUSD',
    'XPD/USD': 'OANDA:XPDUSD',
    'COPPER': 'COMEX:HG1!',
    // Energy - Using standard CFD names
    'USOIL': 'NYMEX:CL1!',
    'UKOIL': 'ICEEUR:BRN1!',
    'NATGAS': 'NYMEX:NG1!',
    'HEAT': 'NYMEX:HO1!',
    'GASOLINE': 'NYMEX:RB1!',
    // Agriculture
    'WHEAT': 'CBOT:ZW1!',
    'CORN': 'CBOT:ZC1!',
    'SOYBEAN': 'CBOT:ZS1!',
    'COFFEE': 'ICEUS:KC1!',
    'SUGAR': 'ICEUS:SB1!',
    'COTTON': 'ICEUS:CT1!',
    // Crypto - Using BINANCE for better availability
    'BTC/USD': 'BINANCE:BTCUSDT',
    'ETH/USD': 'BINANCE:ETHUSDT',
    'XRP/USD': 'BINANCE:XRPUSDT',
    'SOL/USD': 'BINANCE:SOLUSDT',
    'ADA/USD': 'BINANCE:ADAUSDT',
    'DOGE/USD': 'BINANCE:DOGEUSDT',
    'AVAX/USD': 'BINANCE:AVAXUSDT',
    'DOT/USD': 'BINANCE:DOTUSDT',
    'LINK/USD': 'BINANCE:LINKUSDT',
    'MATIC/USD': 'BINANCE:MATICUSDT',
    'LTC/USD': 'BINANCE:LTCUSDT',
    'UNI/USD': 'BINANCE:UNIUSDT',
    'BNB/USD': 'BINANCE:BNBUSDT',
    'SHIB/USD': 'BINANCE:SHIBUSDT',
    'TRX/USD': 'BINANCE:TRXUSDT',
    'ATOM/USD': 'BINANCE:ATOMUSDT',
    'XLM/USD': 'BINANCE:XLMUSDT',
    'NEAR/USD': 'BINANCE:NEARUSDT',
    'APT/USD': 'BINANCE:APTUSDT',
    'ARB/USD': 'BINANCE:ARBUSDT',
    'OP/USD': 'BINANCE:OPUSDT',
    'IMX/USD': 'BINANCE:IMXUSDT',
    'INJ/USD': 'BINANCE:INJUSDT',
    'FTM/USD': 'BINANCE:FTMUSDT',
    'ALGO/USD': 'BINANCE:ALGOUSDT',
    'VET/USD': 'BINANCE:VETUSDT',
    'SAND/USD': 'BINANCE:SANDUSDT',
    'MANA/USD': 'BINANCE:MANAUSDT',
    'AXS/USD': 'BINANCE:AXSUSDT',
    'AAVE/USD': 'BINANCE:AAVEUSDT',
    'CRV/USD': 'BINANCE:CRVUSDT',
    'MKR/USD': 'BINANCE:MKRUSDT',
    'SNX/USD': 'BINANCE:SNXUSDT',
    'COMP/USD': 'BINANCE:COMPUSDT',
    'SUSHI/USD': 'BINANCE:SUSHIUSDT',
    'YFI/USD': 'BINANCE:YFIUSDT',
    '1INCH/USD': 'BINANCE:1INCHUSDT',
    // US Stocks
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'GOOGL': 'NASDAQ:GOOGL',
    'GOOG': 'NASDAQ:GOOG',
    'AMZN': 'NASDAQ:AMZN',
    'NVDA': 'NASDAQ:NVDA',
    'META': 'NASDAQ:META',
    'TSLA': 'NASDAQ:TSLA',
    'AMD': 'NASDAQ:AMD',
    'INTC': 'NASDAQ:INTC',
    'NFLX': 'NASDAQ:NFLX',
    'PYPL': 'NASDAQ:PYPL',
    'ADBE': 'NASDAQ:ADBE',
    'CSCO': 'NASDAQ:CSCO',
    'CRM': 'NYSE:CRM',
    'ORCL': 'NYSE:ORCL',
    'IBM': 'NYSE:IBM',
    'JPM': 'NYSE:JPM',
    'BAC': 'NYSE:BAC',
    'GS': 'NYSE:GS',
    'MS': 'NYSE:MS',
    'WFC': 'NYSE:WFC',
    'C': 'NYSE:C',
    'V': 'NYSE:V',
    'MA': 'NYSE:MA',
    'DIS': 'NYSE:DIS',
    'NKE': 'NYSE:NKE',
    'KO': 'NYSE:KO',
    'PEP': 'NASDAQ:PEP',
    'MCD': 'NYSE:MCD',
    'WMT': 'NYSE:WMT',
    'HD': 'NYSE:HD',
    'XOM': 'NYSE:XOM',
    'CVX': 'NYSE:CVX',
    'PFE': 'NYSE:PFE',
    'JNJ': 'NYSE:JNJ',
    'UNH': 'NYSE:UNH',
    'ABBV': 'NYSE:ABBV',
    'MRK': 'NYSE:MRK',
    'LLY': 'NYSE:LLY',
    // Dollar Index - Using INDEX prefix
    'DXY': 'INDEX:DXY',
  }
  
  const mappedSymbol = symbolMap[symbol]
  if (mappedSymbol) return mappedSymbol
  
  // Fallback for forex pairs
  if (symbol.includes('/')) {
    return `FX:${symbol.replace('/', '')}`
  }
  
  // Fallback for stocks (assume NASDAQ)
  if (symbol.match(/^[A-Z]{1,5}$/)) {
    return `NASDAQ:${symbol}`
  }
  
  return `PEPPERSTONE:${symbol}`
}

// Convert news to MarketEvent format with price and unixTime for chart positioning
function newsToMarketEvent(news: NewsItem, symbol: string, priceAtTime?: number): MarketEvent {
  const datetimeMs = news.datetime > 9999999999 ? news.datetime : news.datetime * 1000
  const timestamp = new Date(datetimeMs)
  const unixTime = Math.floor(datetimeMs / 1000)
  
  // Detect impact based on content
  const text = (news.headline + ' ' + (news.summary || '')).toLowerCase()
  let impact: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'climb', 'jump', 'soar', 'breakout', 'bullish', 'record', 'support', 'hausse', 'monte']
  const bearishWords = ['drop', 'fall', 'plunge', 'crash', 'decline', 'sink', 'bearish', 'risk', 'fear', 'tension', 'war', 'conflict', 'sanction', 'baisse', 'chute']
  
  const bullishScore = bullishWords.filter(w => text.includes(w)).length
  const bearishScore = bearishWords.filter(w => text.includes(w)).length
  
  if (bullishScore > bearishScore) impact = 'bullish'
  else if (bearishScore > bullishScore) impact = 'bearish'
  
  // Determine session based on hour
  const hour = timestamp.getHours()
  let session = 'Seance New York'
  if (hour >= 0 && hour < 8) session = 'Seance Asie'
  else if (hour >= 8 && hour < 14) session = 'Seance Londres'
  
  return {
    id: news.id,
    timestamp,
    unixTime,
    price: priceAtTime || 0, // Will be set when we have candle data
    type: news.category === 'geopolitical' ? 'geopolitical' : news.category === 'fed' || text.includes('fed') || text.includes('rate') ? 'fed' : 'economic',
    title: news.headline,
    description: news.summary || '',
    impact,
    session,
    details: news.summary ? [news.summary] : [],
    technicalAnalysis: `Impact sur ${symbol} suite a cette actualite.`,
    url: news.url,
    source: news.source
  }
}

// Event Marker on Chart - Now uses pixel coordinates from chart
function EventMarker({ 
  event, 
  position, 
  onClick,
  visible = true
}: { 
  event: MarketEvent
  position: { x: number; y: number } | null  // Pixel coordinates from chart
  onClick: () => void 
  visible?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
  }

  // Don't render if position is null (out of visible range) or not visible
  if (!position || !visible) return null

  return (
    <div 
      className="absolute z-30 cursor-pointer group"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        transform: 'translate(-50%, -50%)' 
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
    >
      {/* Pulse animation */}
      <div className="absolute inset-0 w-5 h-5 -m-0.5 rounded-full animate-ping opacity-40 bg-violet-500" 
           style={{ animationDuration: '2s' }} />
      
      {/* Main marker */}
      <div className="relative w-4 h-4 rounded-full bg-violet-500 border-2 border-violet-300 
        shadow-lg shadow-violet-500/50 group-hover:scale-150 transition-all duration-200
        flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-card/95 backdrop-blur-sm border border-violet-500/40 rounded-xl shadow-2xl shadow-violet-500/20 z-50">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            </div>
            <div>
              <p className="text-[11px] text-violet-400 mb-0.5">Cliquez ici pour decouvrir ce qui a motive cette decision</p>
              <p className="text-sm font-semibold">{formatTime(event.timestamp)} - {formatDate(event.timestamp)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-2">{event.session}</p>
          <p className="text-sm font-medium line-clamp-2">{event.title}</p>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card/95 border-r border-b border-violet-500/40 rotate-45" />
        </div>
      )}
    </div>
  )
}

// Event Detail Modal with AI Analysis
function EventDetailModal({ 
  event, 
  onClose,
  analysisLoading,
  analysisData 
}: { 
  event: MarketEvent
  onClose: () => void
  analysisLoading?: boolean
  analysisData?: any
}) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
        {/* Header with main news */}
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Analyse des chandeliers</h2>
              <p className="text-sm text-muted-foreground">{formatDate(event.timestamp)}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Main news banner */}
          <div className="px-4 py-3 bg-primary/10 border-t border-primary/20">
            <p className="text-sm font-medium text-primary line-clamp-2">{event.title}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Loading state */}
          {analysisLoading && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Analyse IA en cours...</span>
            </div>
          )}

          {/* AI Analysis Summary */}
          {analysisData?.summary && (
            <div>
              <h3 className="text-primary font-semibold mb-3">Que s&apos;est-il passe ?</h3>
              <p className="text-sm leading-relaxed">{analysisData.summary}</p>
            </div>
          )}

          {/* Event details if no AI analysis yet */}
          {!analysisData?.summary && !analysisLoading && (
            <div>
              <h3 className="text-primary font-semibold mb-3">Que s&apos;est-il passe ?</h3>
              <p className="font-medium mb-3">{event.title}</p>
              {event.description && (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              )}
              {event.details.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {event.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                        event.impact === 'bullish' ? 'bg-emerald-500' : event.impact === 'bearish' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Technical Analysis */}
          {analysisData?.technicalAnalysis && (
            <div>
              <h3 className="text-primary font-semibold mb-3">Donnees techniques</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysisData.technicalAnalysis}</p>
            </div>
          )}

          {/* Related news from AI analysis */}
          {analysisData?.news && analysisData.news.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">News liees ({analysisData.news.length})</h3>
              </div>
              <div className="space-y-2">
                {analysisData.news.slice(0, 5).map((news: any, i: number) => (
                  <a
                    key={i}
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      news.sentiment === 'bullish' ? 'bg-emerald-500' :
                      news.sentiment === 'bearish' ? 'bg-red-500' : 'bg-muted-foreground'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm group-hover:text-primary transition-colors line-clamp-2">{news.headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{news.source}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{event.session}</span>
              <span className="mx-2">|</span>
              <span className={event.impact === 'bullish' ? 'text-emerald-500' : event.impact === 'bearish' ? 'text-red-500' : 'text-amber-500'}>
                Impact {event.impact === 'bullish' ? 'haussier' : event.impact === 'bearish' ? 'baissier' : 'neutre'}
              </span>
            </div>
            {event.url && (
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Voir l&apos;article <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Interface for marker positions calculated from chart coordinates
interface MarkerPosition {
  eventId: string
  x: number
  y: number
}

function TradingViewChartComponent({ symbol, height = 450 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [chartLoaded, setChartLoaded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [markerPositions, setMarkerPositions] = useState<Map<string, { x: number; y: number } | null>>(new Map())
  const [candleData, setCandleData] = useState<CandlestickData<Time>[]>([])
  const [events, setEvents] = useState<MarketEvent[]>([])
  
  // Fetch live news from API
  const { data: newsData } = useSWR<{ news: NewsItem[] }>('/api/news?limit=30', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false
  })
  
  // Calculate all marker positions from chart coordinates
  const recalculateAllMarkers = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || events.length === 0) return
    
    const chart = chartRef.current
    const series = seriesRef.current
    const newPositions = new Map<string, { x: number; y: number } | null>()
    
    events.forEach(event => {
      try {
        // Convert timestamp to x coordinate
        const x = chart.timeScale().timeToCoordinate(event.unixTime as Time)
        // Convert price to y coordinate
        const y = series.priceToCoordinate(event.price)
        
        if (x !== null && y !== null && x >= 0 && y >= 0) {
          newPositions.set(event.id, { x, y })
        } else {
          newPositions.set(event.id, null) // Out of visible range
        }
      } catch {
        newPositions.set(event.id, null)
      }
    })
    
    setMarkerPositions(newPositions)
  }, [events])
  
  // Handle event click - fetch AI analysis
  const handleEventClick = async (event: MarketEvent) => {
    setSelectedEvent(event)
    setAnalysisLoading(true)
    setAnalysisData(null)
    
    try {
      const candle = {
        time: event.unixTime,
        open: event.price, high: event.price, low: event.price, close: event.price,
        symbol
      }
      
      // TEMPORARILY DISABLED: candle-analysis uses Groq causing 429 errors
      // Skipping technical analysis to prevent rate limiting
      // Using only price data for chart display
      setAnalysisLoading(false)
      
      /* DISABLED - CAUSING 429 ERRORS
      const res = await fetch('/api/candle-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candle)
      })
      
      if (res.ok) {
        const data = await res.json()
        setAnalysisData(data)
      }
      */
    } catch (e) {
      console.error('[v0] Analysis fetch error:', e)
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Fetch candle data from Yahoo Finance via our API
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const yahooSymbol = getYahooSymbol(symbol)
        const res = await fetch(`/api/candles?symbol=${yahooSymbol}&interval=1h&range=5d`)
        if (res.ok) {
          const data = await res.json()
          if (data.candles && data.candles.length > 0) {
            setCandleData(data.candles)
          }
        }
      } catch (e) {
        console.error('[v0] Failed to fetch candles:', e)
      }
    }
    fetchCandles()
  }, [symbol])

  // Convert news to events with price from candle data
  useEffect(() => {
    if (!newsData?.news || candleData.length === 0) return
    
    const filteredNews = newsData.news
      .filter(n => (n.importance && n.importance >= 3) || n.isBreaking || n.category === 'geopolitical')
      .slice(0, 6)
    
    // Map news to events with price from nearest candle
    const newEvents = filteredNews.map(news => {
      const newsUnixTime = news.datetime > 9999999999 ? Math.floor(news.datetime / 1000) : news.datetime
      
      // Find closest candle to news time
      let closestCandle = candleData[0]
      let minDiff = Math.abs((closestCandle.time as number) - newsUnixTime)
      
      for (const candle of candleData) {
        const diff = Math.abs((candle.time as number) - newsUnixTime)
        if (diff < minDiff) {
          minDiff = diff
          closestCandle = candle
        }
      }
      
      // Use high or low based on impact
      const text = (news.headline + ' ' + (news.summary || '')).toLowerCase()
      const isBearish = ['drop', 'fall', 'plunge', 'crash', 'decline', 'risk', 'fear', 'war'].some(w => text.includes(w))
      const priceAtTime = isBearish ? closestCandle.low : closestCandle.high
      
      return newsToMarketEvent(news, symbol, priceAtTime as number)
    })
    
    setEvents(newEvents)
  }, [newsData, candleData, symbol])

  // Create lightweight-charts instance
  useEffect(() => {
    if (!containerRef.current || candleData.length === 0) return
    
    // Clear previous chart
    containerRef.current.innerHTML = ''
    
    // Create chart
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.06)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(139, 92, 246, 0.5)', width: 1, style: 2 },
        horzLine: { color: 'rgba(139, 92, 246, 0.5)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: true,
      handleScroll: true,
    })
    
    chartRef.current = chart
    
    // Add candlestick series
    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })
    
    seriesRef.current = series
    series.setData(candleData)
    
    // Fit content
    chart.timeScale().fitContent()
    
    // Subscribe to range changes to recalculate marker positions
    chart.timeScale().subscribeVisibleTimeRangeChange(recalculateAllMarkers)
    chart.timeScale().subscribeVisibleLogicalRangeChange(recalculateAllMarkers)
    
    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
        recalculateAllMarkers()
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    // Initial marker calculation
    setTimeout(() => {
      setChartLoaded(true)
      recalculateAllMarkers()
    }, 100)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [candleData, height, recalculateAllMarkers])
  
  // Recalculate markers when events change
  useEffect(() => {
    if (chartLoaded && events.length > 0) {
      recalculateAllMarkers()
    }
  }, [events, chartLoaded, recalculateAllMarkers])

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border bg-card" style={{ height }}>
      {/* Lightweight Charts */}
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Event Markers Overlay - positions are now 100% dynamic */}
      {chartLoaded && (
        <div className="absolute inset-0 pointer-events-none">
          {events.map(event => {
            const position = markerPositions.get(event.id)
            return (
              <div key={event.id} className="pointer-events-auto">
                <EventMarker
                  event={event}
                  position={position || null}
                  onClick={() => handleEventClick(event)}
                  visible={position !== null}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {!chartLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Modal with AI analysis */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => {
            setSelectedEvent(null)
            setAnalysisData(null)
          }}
          analysisLoading={analysisLoading}
          analysisData={analysisData}
        />
      )}
    </div>
  )
}

export const TradingViewChart = memo(TradingViewChartComponent)
