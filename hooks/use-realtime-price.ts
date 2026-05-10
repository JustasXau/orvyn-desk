"use client"

import { useEffect, useState, useCallback, useRef } from "react"

interface RealtimePrice {
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  timestamp: number
  isLive: boolean
}

// TradingView/OANDA symbol mapping - EXACT same symbols as TradingView chart uses
const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  // Forex Majors - OANDA CFD
  'EUR/USD': 'OANDA:EURUSD', 'GBP/USD': 'OANDA:GBPUSD', 'USD/JPY': 'OANDA:USDJPY',
  'USD/CHF': 'OANDA:USDCHF', 'AUD/USD': 'OANDA:AUDUSD', 'USD/CAD': 'OANDA:USDCAD',
  'NZD/USD': 'OANDA:NZDUSD',
  // EUR Crosses
  'EUR/GBP': 'OANDA:EURGBP', 'EUR/JPY': 'OANDA:EURJPY', 'EUR/CHF': 'OANDA:EURCHF',
  'EUR/AUD': 'OANDA:EURAUD', 'EUR/CAD': 'OANDA:EURCAD', 'EUR/NZD': 'OANDA:EURNZD',
  // GBP Crosses
  'GBP/JPY': 'OANDA:GBPJPY', 'GBP/CHF': 'OANDA:GBPCHF', 'GBP/AUD': 'OANDA:GBPAUD',
  'GBP/CAD': 'OANDA:GBPCAD', 'GBP/NZD': 'OANDA:GBPNZD',
  // Other Crosses
  'AUD/JPY': 'OANDA:AUDJPY', 'AUD/CAD': 'OANDA:AUDCAD', 'AUD/CHF': 'OANDA:AUDCHF',
  'AUD/NZD': 'OANDA:AUDNZD', 'NZD/JPY': 'OANDA:NZDJPY', 'NZD/CAD': 'OANDA:NZDCAD',
  'NZD/CHF': 'OANDA:NZDCHF', 'CAD/JPY': 'OANDA:CADJPY', 'CAD/CHF': 'OANDA:CADCHF',
  'CHF/JPY': 'OANDA:CHFJPY',
  // Exotics
  'USD/MXN': 'OANDA:USDMXN', 'USD/ZAR': 'OANDA:USDZAR', 'USD/TRY': 'OANDA:USDTRY',
  'USD/SGD': 'OANDA:USDSGD', 'USD/HKD': 'OANDA:USDHKD', 'USD/CNH': 'OANDA:USDCNH',
  'USD/PLN': 'OANDA:USDPLN', 'USD/SEK': 'OANDA:USDSEK', 'USD/NOK': 'OANDA:USDNOK',
  'USD/DKK': 'OANDA:USDDKK', 'USD/CZK': 'OANDA:USDCZK', 'USD/HUF': 'OANDA:USDHUF',
  'USD/THB': 'OANDA:USDTHB', 'USD/INR': 'OANDA:USDINR',
  'EUR/PLN': 'OANDA:EURPLN', 'EUR/SEK': 'OANDA:EURSEK', 'EUR/NOK': 'OANDA:EURNOK',
  'EUR/DKK': 'OANDA:EURDKK', 'EUR/CZK': 'OANDA:EURCZK', 'EUR/HUF': 'OANDA:EURHUF',
  'EUR/TRY': 'OANDA:EURTRY', 'GBP/SGD': 'OANDA:GBPSGD', 'GBP/ZAR': 'OANDA:GBPZAR',
  // Metals - OANDA CFD
  'XAU/USD': 'OANDA:XAUUSD', // Gold CFD
  'XAG/USD': 'OANDA:XAGUSD', // Silver CFD
  // Indices - OANDA CFD
  'US30': 'OANDA:US30USD',   // Dow Jones CFD
  'US100': 'OANDA:NAS100USD', // NASDAQ 100 CFD
  'US500': 'OANDA:SPX500USD', // S&P 500 CFD
  'UK100': 'OANDA:UK100GBP',  // FTSE 100 CFD
  'GER40': 'OANDA:DE30EUR',   // DAX CFD
  'JPN225': 'OANDA:JP225USD', // Nikkei 225 CFD
  'FRA40': 'OANDA:FR40EUR',   // CAC 40 CFD
  'AUS200': 'OANDA:AU200AUD', // ASX 200 CFD
  'HK50': 'OANDA:HK50HKD',    // Hang Seng CFD
  'EU50': 'OANDA:EU50EUR',    // Euro Stoxx 50 CFD
  'DXY': 'TVC:DXY',           // Dollar Index
  'VIX': 'TVC:VIX',           // Volatility Index
  // Crypto
  'BTC/USD': 'COINBASE:BTCUSD', 'ETH/USD': 'COINBASE:ETHUSD',
  'XRP/USD': 'BITSTAMP:XRPUSD', 'SOL/USD': 'COINBASE:SOLUSD',
  'ADA/USD': 'COINBASE:ADAUSD', 'DOGE/USD': 'COINBASE:DOGEUSD',
  'DOT/USD': 'KRAKEN:DOTUSD', 'AVAX/USD': 'COINBASE:AVAXUSD',
  'MATIC/USD': 'COINBASE:MATICUSD', 'LINK/USD': 'COINBASE:LINKUSD',
  'LTC/USD': 'COINBASE:LTCUSD',
  // Commodities - OANDA CFD
  'USOIL': 'OANDA:WTICOUSD',  // WTI Crude Oil CFD
  'UKOIL': 'OANDA:BCOUSD',    // Brent Crude Oil CFD
  'NATGAS': 'OANDA:NATGASUSD', // Natural Gas CFD
  'COPPER': 'OANDA:XCUUSD',   // Copper CFD
  'HEAT': 'NYMEX:HO1!',       // Heating Oil Futures
  'GASOLINE': 'NYMEX:RB1!',   // RBOB Gasoline Futures
  // Agriculture
  'WHEAT': 'CBOT:ZW1!',       // Wheat Futures
  'CORN': 'CBOT:ZC1!',        // Corn Futures
  'SOYBN': 'CBOT:ZS1!',       // Soybeans Futures
  'COFFEE': 'ICEUS:KC1!',     // Coffee Futures
  'SUGAR': 'ICEUS:SB1!',      // Sugar Futures
  'COCOA': 'ICEUS:CC1!',      // Cocoa Futures
  'COTTON': 'ICEUS:CT1!',     // Cotton Futures
  'ALUM': 'COMEX:ALI1!',      // Aluminum Futures
  // Stocks (US)
  'AAPL': 'NASDAQ:AAPL', 'MSFT': 'NASDAQ:MSFT', 'GOOGL': 'NASDAQ:GOOGL',
  'AMZN': 'NASDAQ:AMZN', 'TSLA': 'NASDAQ:TSLA', 'NVDA': 'NASDAQ:NVDA',
  'META': 'NASDAQ:META', 'NFLX': 'NASDAQ:NFLX', 'AMD': 'NASDAQ:AMD',
  'INTC': 'NASDAQ:INTC', 'DIS': 'NYSE:DIS', 'BA': 'NYSE:BA',
  'JPM': 'NYSE:JPM', 'V': 'NYSE:V', 'MA': 'NYSE:MA',
  'KO': 'NYSE:KO', 'PEP': 'NASDAQ:PEP', 'NKE': 'NYSE:NKE',
}

// Finnhub symbol for quotes (different format than TradingView)
function getFinnhubSymbol(symbol: string): string {
  // For forex, Finnhub uses OANDA:XXX_YYY format
  if (symbol.includes('/')) {
    const [base, quote] = symbol.split('/')
    return `OANDA:${base}_${quote}`
  }
  
  // For indices, use specific mappings
  const indexMap: Record<string, string> = {
    'US30': 'FOREXCOM:DJI',
    'US100': 'FOREXCOM:NSXUSD',
    'US500': 'FOREXCOM:SPXUSD',
    'UK100': 'FOREXCOM:UKXGBP',
    'GER40': 'FOREXCOM:GRXEUR',
    'DXY': 'FOREXCOM:DXY',
    'VIX': 'CBOE:VIX',
  }
  if (indexMap[symbol]) return indexMap[symbol]
  
  // For commodities
  const commodityMap: Record<string, string> = {
    'USOIL': 'OANDA:WTICO_USD',
    'UKOIL': 'OANDA:BCO_USD',
    'NATGAS': 'OANDA:NATGAS_USD',
    'COPPER': 'OANDA:XCU_USD',
  }
  if (commodityMap[symbol]) return commodityMap[symbol]
  
  // For stocks
  return symbol
}

// Cached API key
let cachedApiKey: string | null = null
let keyFetchPromise: Promise<string> | null = null

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey
  
  if (!keyFetchPromise) {
    keyFetchPromise = fetch('/api/config/finnhub-key')
      .then(res => res.json())
      .then(data => {
        cachedApiKey = data.key || ''
        return cachedApiKey
      })
      .catch(() => {
        cachedApiKey = ''
        return cachedApiKey
      })
  }
  
  return keyFetchPromise
}

// Fetch price from Finnhub for CFD prices
async function fetchFinnhubPrice(symbol: string, apiKey: string): Promise<RealtimePrice | null> {
  if (!apiKey) return null
  
  const finnhubSymbol = getFinnhubSymbol(symbol)
  
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`
    const res = await fetch(url)
    
    if (!res.ok) return null
    
    const data = await res.json()
    if (data.c && data.c > 0) {
      return {
        price: data.c,
        change: data.d || 0,
        changePercent: data.dp || 0,
        high: data.h || data.c,
        low: data.l || data.c,
        timestamp: Date.now(),
        isLive: true
      }
    }
    return null
  } catch {
    return null
  }
}

// Fallback: Fetch from our Yahoo API
async function fetchYahooPrice(symbol: string): Promise<RealtimePrice | null> {
  // Yahoo symbol mapping - ORDER MATTERS! Check specific symbols first
  const yahooSymbol = (() => {
    // Metals - MUST be checked BEFORE generic forex check
    if (symbol === 'XAU/USD') return 'GC=F'  // Gold Futures
    if (symbol === 'XAG/USD') return 'SI=F'  // Silver Futures
    // Crypto - check before forex
    if (symbol === 'BTC/USD' || symbol.includes('BTC')) return 'BTC-USD'
    if (symbol === 'ETH/USD' || symbol.includes('ETH')) return 'ETH-USD'
    if (symbol === 'XRP/USD') return 'XRP-USD'
    if (symbol === 'SOL/USD') return 'SOL-USD'
    if (symbol === 'ADA/USD') return 'ADA-USD'
    if (symbol === 'DOGE/USD') return 'DOGE-USD'
    // Forex - generic handler
    if (symbol.includes('/')) {
      return symbol.replace('/', '') + '=X'
    }
    // Indices - E-mini Futures (closer to CFD prices)
    if (symbol === 'US30') return 'YM=F'    // Dow Jones E-mini
    if (symbol === 'US100') return 'NQ=F'   // Nasdaq E-mini
    if (symbol === 'US500') return 'ES=F'   // S&P 500 E-mini
    if (symbol === 'DXY') return 'DX-Y.NYB'
    if (symbol === 'UK100') return '^FTSE'
    if (symbol === 'GER40') return '^GDAXI'
    if (symbol === 'JPN225') return '^N225'
    if (symbol === 'VIX') return '^VIX'
    // Energy
    if (symbol === 'USOIL') return 'CL=F'   // WTI Crude
    if (symbol === 'UKOIL') return 'BZ=F'   // Brent Crude
    if (symbol === 'NATGAS') return 'NG=F'  // Natural Gas
    if (symbol === 'HEAT') return 'HO=F'    // Heating Oil
    if (symbol === 'GASOLINE') return 'RB=F' // RBOB Gasoline
    // Metals
    if (symbol === 'XPT/USD') return 'PL=F' // Platinum
    if (symbol === 'XPD/USD') return 'PA=F' // Palladium
    if (symbol === 'COPPER') return 'HG=F'  // Copper
    if (symbol === 'ALUM') return 'ALI=F'   // Aluminum
    // Agriculture
    if (symbol === 'WHEAT') return 'ZW=F'
    if (symbol === 'CORN') return 'ZC=F'
    if (symbol === 'SOYBN') return 'ZS=F'
    if (symbol === 'COFFEE') return 'KC=F'
    if (symbol === 'SUGAR') return 'SB=F'
    if (symbol === 'COCOA') return 'CC=F'
    if (symbol === 'COTTON') return 'CT=F'
    return symbol
  })()
  
  try {
    const res = await fetch(`/api/yahoo-price?symbol=${encodeURIComponent(yahooSymbol)}`)
    if (!res.ok) return null
    
    const data = await res.json()
    if (data.price && data.price > 0) {
      return {
        price: data.price,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        high: data.high || data.price,
        low: data.low || data.price,
        timestamp: Date.now(),
        isLive: true
      }
    }
    return null
  } catch {
    return null
  }
}

export function useRealtimePrice(symbol: string) {
  const [priceData, setPriceData] = useState<RealtimePrice | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchLatestPrice = useCallback(async () => {
    if (!mountedRef.current) return
    
    // Try Finnhub first (for CFD prices)
    const apiKey = await getApiKey()
    let data = await fetchFinnhubPrice(symbol, apiKey)
    
    // Fallback to Yahoo if Finnhub fails
    if (!data) {
      data = await fetchYahooPrice(symbol)
    }
    
    if (!mountedRef.current) return
    
    if (data) {
      setPriceData(data)
      setIsConnected(true)
      setError(null)
    }
  }, [symbol])

  useEffect(() => {
    mountedRef.current = true
    setPriceData(null)
    
    // Initial fetch
    fetchLatestPrice()

    // Poll every 3 seconds
    intervalRef.current = setInterval(fetchLatestPrice, 3000)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [symbol, fetchLatestPrice])

  return {
    price: priceData?.price ?? 0,
    change: priceData?.change ?? 0,
    changePercent: priceData?.changePercent ?? 0,
    high: priceData?.high ?? 0,
    low: priceData?.low ?? 0,
    isConnected,
    isLive: priceData?.isLive ?? false,
    lastUpdate: priceData?.timestamp ?? 0,
    error
  }
}
