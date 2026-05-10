import { NextResponse } from 'next/server'

// TradingView symbol mapping - OANDA CFD prices
const TV_SYMBOLS: Record<string, string> = {
  // Forex - OANDA CFD
  'EUR/USD': 'OANDA:EURUSD', 'GBP/USD': 'OANDA:GBPUSD', 'USD/JPY': 'OANDA:USDJPY',
  'USD/CHF': 'OANDA:USDCHF', 'AUD/USD': 'OANDA:AUDUSD', 'USD/CAD': 'OANDA:USDCAD',
  'NZD/USD': 'OANDA:NZDUSD', 'EUR/GBP': 'OANDA:EURGBP', 'EUR/JPY': 'OANDA:EURJPY',
  'GBP/JPY': 'OANDA:GBPJPY', 'EUR/CHF': 'OANDA:EURCHF', 'EUR/AUD': 'OANDA:EURAUD',
  'EUR/CAD': 'OANDA:EURCAD', 'GBP/CHF': 'OANDA:GBPCHF', 'GBP/AUD': 'OANDA:GBPAUD',
  'GBP/CAD': 'OANDA:GBPCAD', 'AUD/JPY': 'OANDA:AUDJPY', 'AUD/CAD': 'OANDA:AUDCAD',
  'AUD/CHF': 'OANDA:AUDCHF', 'AUD/NZD': 'OANDA:AUDNZD', 'NZD/JPY': 'OANDA:NZDJPY',
  'NZD/CAD': 'OANDA:NZDCAD', 'NZD/CHF': 'OANDA:NZDCHF', 'CAD/JPY': 'OANDA:CADJPY',
  'CAD/CHF': 'OANDA:CADCHF', 'CHF/JPY': 'OANDA:CHFJPY', 'EUR/NZD': 'OANDA:EURNZD',
  'GBP/NZD': 'OANDA:GBPNZD',
  // Exotic
  'USD/MXN': 'OANDA:USDMXN', 'USD/ZAR': 'OANDA:USDZAR', 'USD/TRY': 'OANDA:USDTRY',
  'USD/NOK': 'OANDA:USDNOK', 'USD/SEK': 'OANDA:USDSEK', 'USD/SGD': 'OANDA:USDSGD',
  'USD/HKD': 'OANDA:USDHKD', 'USD/CNH': 'OANDA:USDCNH', 'USD/PLN': 'OANDA:USDPLN',
  'EUR/PLN': 'OANDA:EURPLN', 'EUR/HUF': 'OANDA:EURHUF', 'EUR/CZK': 'OANDA:EURCZK',
  'EUR/NOK': 'OANDA:EURNOK', 'EUR/SEK': 'OANDA:EURSEK', 'EUR/TRY': 'OANDA:EURTRY',
  // Metals - OANDA CFD (real spot prices)
  'XAU/USD': 'OANDA:XAUUSD',
  'XAG/USD': 'OANDA:XAGUSD',
  // Indices - CFD prices
  'US30': 'OANDA:US30USD',
  'US100': 'OANDA:NAS100USD',
  'US500': 'OANDA:SPX500USD',
  'UK100': 'OANDA:UK100GBP',
  'GER40': 'OANDA:DE30EUR',
  'JPN225': 'OANDA:JP225USD',
  'DXY': 'TVC:DXY',
  'VIX': 'TVC:VIX',
  // Commodities - OANDA CFD
  'USOIL': 'OANDA:WTICOUSD',
  'UKOIL': 'OANDA:BCOUSD',
  'NATGAS': 'OANDA:NATGASUSD',
  'COPPER': 'OANDA:XCUUSD',
  // Crypto
  'BTC/USD': 'OANDA:BTCUSD', 'ETH/USD': 'OANDA:ETHUSD',
  'XRP/USD': 'BITSTAMP:XRPUSD', 'SOL/USD': 'COINBASE:SOLUSD',
  'ADA/USD': 'COINBASE:ADAUSD', 'DOGE/USD': 'BINANCE:DOGEUSD',
}

function getTVSymbol(symbol: string): string {
  if (TV_SYMBOLS[symbol]) {
    return TV_SYMBOLS[symbol]
  }
  // Default to OANDA for forex
  if (symbol.includes('/')) {
    return `OANDA:${symbol.replace('/', '')}`
  }
  return symbol
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  
  try {
    const tvSymbol = getTVSymbol(symbol)
    
    // Use TradingView's unofficial data API (same data as their charts)
    // This scrapes the symbol page for real-time data
    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(tvSymbol)}&hl=1&exchange=&lang=en&search_type=undefined&domain=production&sort_by_country=US`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 5 } // Cache for 5 seconds
    })
    
    if (!res.ok) {
      // Fallback to Yahoo Finance
      return await fallbackToYahoo(symbol)
    }
    
    const data = await res.json()
    
    // TradingView symbol search doesn't return prices directly
    // We need to use their quote API or fallback
    return await fallbackToYahoo(symbol)
    
  } catch (error) {
    console.error('[TV Price Error]', error)
    return await fallbackToYahoo(symbol)
  }
}

// Yahoo Finance fallback with CFD-like symbol mapping
async function fallbackToYahoo(symbol: string) {
  const yahooMap: Record<string, string> = {
    // Metals - Spot prices (closest to OANDA CFD)
    'XAU/USD': 'GC=F', 'XAG/USD': 'SI=F',
    // Indices - Futures (closest to CFD prices)
    'US30': 'YM=F', 'US100': 'NQ=F', 'US500': 'ES=F',
    'DXY': 'DX-Y.NYB', 'UK100': '^FTSE', 'GER40': '^GDAXI',
    'JPN225': '^N225', 'VIX': '^VIX',
    // Commodities
    'USOIL': 'CL=F', 'UKOIL': 'BZ=F', 'NATGAS': 'NG=F',
    // Crypto
    'BTC/USD': 'BTC-USD', 'ETH/USD': 'ETH-USD',
  }
  
  let yahooSymbol = yahooMap[symbol]
  if (!yahooSymbol && symbol.includes('/')) {
    yahooSymbol = symbol.replace('/', '') + '=X'
  }
  if (!yahooSymbol) {
    yahooSymbol = symbol
  }
  
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 5 }
    })
    
    if (!res.ok) {
      return NextResponse.json({ price: 0, change: 0, changePercent: 0 })
    }
    
    const data = await res.json()
    const quote = data.chart?.result?.[0]?.meta
    
    if (quote) {
      const price = quote.regularMarketPrice || 0
      const prevClose = quote.previousClose || quote.chartPreviousClose || price
      const change = price - prevClose
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
      
      return NextResponse.json({
        price,
        change,
        changePercent,
        high: quote.regularMarketDayHigh || price,
        low: quote.regularMarketDayLow || price,
        symbol: symbol,
        source: 'yahoo'
      })
    }
    
    return NextResponse.json({ price: 0, change: 0, changePercent: 0 })
  } catch {
    return NextResponse.json({ price: 0, change: 0, changePercent: 0 })
  }
}
