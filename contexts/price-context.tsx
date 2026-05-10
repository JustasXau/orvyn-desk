"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

interface PriceData {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

interface PriceContextType {
  prices: Record<string, PriceData>
  updatePrice: (symbol: string, data: PriceData) => void
  getPrice: (symbol: string) => PriceData | null
  subscribeToSymbol: (symbol: string) => void
  subscribedSymbols: string[]
}

const PriceContext = createContext<PriceContextType | null>(null)

// Yahoo Finance symbol mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  // Metals
  'XAU/USD': 'GC=F', 'XAG/USD': 'SI=F', 'XPT/USD': 'PL=F', 'XPD/USD': 'PA=F',
  'COPPER': 'HG=F',
  // Forex
  'EUR/USD': 'EURUSD=X', 'GBP/USD': 'GBPUSD=X', 'USD/JPY': 'USDJPY=X',
  'USD/CHF': 'USDCHF=X', 'AUD/USD': 'AUDUSD=X', 'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X', 'EUR/GBP': 'EURGBP=X', 'EUR/JPY': 'EURJPY=X',
  'GBP/JPY': 'GBPJPY=X', 'EUR/CHF': 'EURCHF=X', 'EUR/AUD': 'EURAUD=X',
  'EUR/CAD': 'EURCAD=X', 'GBP/CHF': 'GBPCHF=X', 'GBP/AUD': 'GBPAUD=X',
  'GBP/CAD': 'GBPCAD=X', 'AUD/JPY': 'AUDJPY=X', 'AUD/CAD': 'AUDCAD=X',
  'AUD/CHF': 'AUDCHF=X', 'AUD/NZD': 'AUDNZD=X', 'NZD/JPY': 'NZDJPY=X',
  'NZD/CAD': 'NZDCAD=X', 'NZD/CHF': 'NZDCHF=X', 'CAD/JPY': 'CADJPY=X',
  'CAD/CHF': 'CADCHF=X', 'CHF/JPY': 'CHFJPY=X', 'EUR/NZD': 'EURNZD=X',
  'GBP/NZD': 'GBPNZD=X',
  // Exotic
  'USD/MXN': 'USDMXN=X', 'USD/ZAR': 'USDZAR=X', 'USD/TRY': 'USDTRY=X',
  'USD/SGD': 'USDSGD=X', 'USD/SEK': 'USDSEK=X', 'USD/NOK': 'USDNOK=X',
  // Indices - E-mini futures
  'US30': 'YM=F', 'US100': 'NQ=F', 'US500': 'ES=F',
  'DXY': 'DX-Y.NYB', 'GER40': '^GDAXI', 'UK100': '^FTSE', 'JPN225': '^N225',
  // Energy
  'USOIL': 'CL=F', 'UKOIL': 'BZ=F', 'NATGAS': 'NG=F',
  'HEAT': 'HO=F', 'GASOLINE': 'RB=F',
  // Crypto
  'BTC/USD': 'BTC-USD', 'ETH/USD': 'ETH-USD', 'XRP/USD': 'XRP-USD',
  'SOL/USD': 'SOL-USD', 'ADA/USD': 'ADA-USD', 'DOGE/USD': 'DOGE-USD',
  // Agriculture
  'WHEAT': 'ZW=F', 'CORN': 'ZC=F', 'SOYBN': 'ZS=F',
  'COFFEE': 'KC=F', 'SUGAR': 'SB=F', 'COTTON': 'CT=F', 'COCOA': 'CC=F',
}

function getYahooSymbol(symbol: string): string {
  if (YAHOO_SYMBOLS[symbol]) return YAHOO_SYMBOLS[symbol]
  if (symbol.includes('/')) return symbol.replace('/', '') + '=X'
  return symbol
}

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([])

  const updatePrice = useCallback((symbol: string, data: PriceData) => {
    setPrices(prev => ({
      ...prev,
      [symbol]: data
    }))
  }, [])

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null
  }, [prices])

  const subscribeToSymbol = useCallback((symbol: string) => {
    setSubscribedSymbols(prev => {
      if (prev.includes(symbol)) return prev
      return [...prev, symbol]
    })
  }, [])

  // Fetch prices for all subscribed symbols
  useEffect(() => {
    if (subscribedSymbols.length === 0) return

    const fetchPrices = async () => {
      // Batch fetch - up to 10 symbols at a time
      const batches: string[][] = []
      for (let i = 0; i < subscribedSymbols.length; i += 10) {
        batches.push(subscribedSymbols.slice(i, i + 10))
      }

      for (const batch of batches) {
        const yahooSymbols = batch.map(s => getYahooSymbol(s))
        const symbolsParam = yahooSymbols.join(',')
        
        try {
          const res = await fetch(`/api/batch-prices?symbols=${encodeURIComponent(symbolsParam)}`)
          if (res.ok) {
            const data = await res.json()
            
            // Map back to original symbols
            batch.forEach((originalSymbol, idx) => {
              const yahooSymbol = yahooSymbols[idx]
              const priceData = data[yahooSymbol]
              
              if (priceData && priceData.price > 0) {
                updatePrice(originalSymbol, {
                  price: priceData.price,
                  change: priceData.change || 0,
                  changePercent: priceData.changePercent || 0,
                  timestamp: Date.now()
                })
              }
            })
          }
        } catch (e) {
          console.error('[v0] Error fetching batch prices:', e)
        }
      }
    }

    // Initial fetch
    fetchPrices()
    
    // Refresh every 3 seconds
    const interval = setInterval(fetchPrices, 3000)
    
    return () => clearInterval(interval)
  }, [subscribedSymbols, updatePrice])

  return (
    <PriceContext.Provider value={{ prices, updatePrice, getPrice, subscribeToSymbol, subscribedSymbols }}>
      {children}
    </PriceContext.Provider>
  )
}

export function usePriceContext() {
  const context = useContext(PriceContext)
  if (!context) {
    throw new Error('usePriceContext must be used within PriceProvider')
  }
  return context
}

// Hook to subscribe and get price for a specific symbol
export function useSharedPrice(symbol: string) {
  const { getPrice, subscribeToSymbol } = usePriceContext()
  
  useEffect(() => {
    subscribeToSymbol(symbol)
  }, [symbol, subscribeToSymbol])
  
  const priceData = getPrice(symbol)
  
  return {
    price: priceData?.price || 0,
    change: priceData?.change || 0,
    changePercent: priceData?.changePercent || 0,
    lastUpdate: priceData?.timestamp || 0,
    isLoading: !priceData
  }
}
