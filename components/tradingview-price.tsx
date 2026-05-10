'use client'

import { useEffect, useRef, memo } from 'react'

interface TradingViewPriceProps {
  symbol: string
  showChange?: boolean
  compact?: boolean
}

// Convert symbol to TradingView format - MUST match tradingview-chart.tsx symbols
function getTradingViewSymbol(symbol: string): string {
  const symbolMap: Record<string, string> = {
    // Metals - OANDA CFD prices
    'XAU/USD': 'OANDA:XAUUSD',
    'XAG/USD': 'OANDA:XAGUSD',
    'XPT/USD': 'OANDA:XPTUSD',
    'XPD/USD': 'OANDA:XPDUSD',
    'COPPER': 'COMEX:HG1!',
    // Forex Majors
    'EUR/USD': 'OANDA:EURUSD',
    'GBP/USD': 'OANDA:GBPUSD',
    'USD/JPY': 'OANDA:USDJPY',
    'USD/CHF': 'OANDA:USDCHF',
    'AUD/USD': 'OANDA:AUDUSD',
    'USD/CAD': 'OANDA:USDCAD',
    'NZD/USD': 'OANDA:NZDUSD',
    // Forex Crosses
    'EUR/GBP': 'OANDA:EURGBP',
    'EUR/JPY': 'OANDA:EURJPY',
    'GBP/JPY': 'OANDA:GBPJPY',
    'EUR/CHF': 'OANDA:EURCHF',
    'EUR/AUD': 'OANDA:EURAUD',
    'EUR/CAD': 'OANDA:EURCAD',
    'GBP/CHF': 'OANDA:GBPCHF',
    'GBP/AUD': 'OANDA:GBPAUD',
    'GBP/CAD': 'OANDA:GBPCAD',
    'AUD/JPY': 'OANDA:AUDJPY',
    'AUD/CAD': 'OANDA:AUDCAD',
    'AUD/CHF': 'OANDA:AUDCHF',
    'AUD/NZD': 'OANDA:AUDNZD',
    'NZD/JPY': 'OANDA:NZDJPY',
    'NZD/CAD': 'OANDA:NZDCAD',
    'NZD/CHF': 'OANDA:NZDCHF',
    'CAD/JPY': 'OANDA:CADJPY',
    'CAD/CHF': 'OANDA:CADCHF',
    'CHF/JPY': 'OANDA:CHFJPY',
    'EUR/NZD': 'OANDA:EURNZD',
    'GBP/NZD': 'OANDA:GBPNZD',
    // Exotic Forex
    'USD/MXN': 'OANDA:USDMXN',
    'USD/ZAR': 'OANDA:USDZAR',
    'USD/TRY': 'OANDA:USDTRY',
    'USD/SGD': 'OANDA:USDSGD',
    'USD/SEK': 'OANDA:USDSEK',
    'USD/NOK': 'OANDA:USDNOK',
    'EUR/TRY': 'OANDA:EURTRY',
    'EUR/SEK': 'OANDA:EURSEK',
    'EUR/NOK': 'OANDA:EURNOK',
    // US Indices
    'US30': 'FOREXCOM:DJI',
    'US100': 'FOREXCOM:NSXUSD',
    'US500': 'FOREXCOM:SPXUSD',
    // European Indices
    'GER40': 'FOREXCOM:GER40',
    'UK100': 'FOREXCOM:UKXGBP',
    // Asia Indices
    'JPN225': 'INDEX:NKY',
    // Energy - Using NYMEX/ICE futures (same as chart)
    'USOIL': 'NYMEX:CL1!',      // WTI Crude Oil Futures
    'UKOIL': 'ICEEUR:BRN1!',    // Brent Crude Oil Futures
    'NATGAS': 'NYMEX:NG1!',     // Natural Gas Futures
    'HEAT': 'NYMEX:HO1!',       // Heating Oil Futures
    'GASOLINE': 'NYMEX:RB1!',   // RBOB Gasoline Futures
    // Agriculture
    'WHEAT': 'CBOT:ZW1!',
    'CORN': 'CBOT:ZC1!',
    'SOYBN': 'CBOT:ZS1!',
    'COFFEE': 'ICEUS:KC1!',
    'SUGAR': 'ICEUS:SB1!',
    'COTTON': 'ICEUS:CT1!',
    'COCOA': 'ICEUS:CC1!',
    // Crypto
    'BTC/USD': 'BINANCE:BTCUSDT',
    'ETH/USD': 'BINANCE:ETHUSDT',
    'XRP/USD': 'BINANCE:XRPUSDT',
    'SOL/USD': 'BINANCE:SOLUSDT',
    'ADA/USD': 'BINANCE:ADAUSDT',
    'DOGE/USD': 'BINANCE:DOGEUSDT',
    // Dollar Index
    'DXY': 'INDEX:DXY',
  }
  
  if (symbolMap[symbol]) return symbolMap[symbol]
  if (symbol.includes('/')) return `FX:${symbol.replace('/', '')}`
  return symbol
}

function TradingViewPriceComponent({ symbol, compact = false }: TradingViewPriceProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const tvSymbol = getTradingViewSymbol(symbol)
    containerRef.current.innerHTML = ''
    
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      "symbol": tvSymbol,
      "width": "100%",
      "isTransparent": true,
      "colorTheme": "dark",
      "locale": "fr"
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol])

  return (
    <div 
      ref={containerRef} 
      className="tradingview-widget-container"
      style={{ height: compact ? '36px' : '46px', overflow: 'hidden' }}
    />
  )
}

export const TradingViewPrice = memo(TradingViewPriceComponent)
