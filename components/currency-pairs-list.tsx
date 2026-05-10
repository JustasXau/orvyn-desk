"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { Search, Star, ChevronDown, Filter, FileText, AlertTriangle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { StructuredReportModal } from "./structured-report-modal"

const fetcher = (url: string) => fetch(url).then(res => res.json())

// localStorage key for watchlist
const WATCHLIST_STORAGE_KEY = 'tradepro_watchlist'

// Default watchlist for new users
const DEFAULT_WATCHLIST = ['XAU/USD', 'EUR/USD', 'US100', 'BTC/USD']

// Load watchlist from localStorage
function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST
  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Error loading watchlist:', e)
  }
  return DEFAULT_WATCHLIST
}

// Save watchlist to localStorage
function saveWatchlist(watchlist: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist))
  } catch (e) {
    console.error('Error saving watchlist:', e)
  }
}

// All CFD tradable pairs organized by category
const allPairs = {
  forex: {
    label: "Forex",
    pairs: [
      // Majors
      { symbol: "EUR/USD", description: "Euro / US Dollar", type: "major" },
      { symbol: "GBP/USD", description: "British Pound / US Dollar", type: "major" },
      { symbol: "USD/JPY", description: "US Dollar / Japanese Yen", type: "major" },
      { symbol: "USD/CHF", description: "US Dollar / Swiss Franc", type: "major" },
      { symbol: "AUD/USD", description: "Australian Dollar / US Dollar", type: "major" },
      { symbol: "USD/CAD", description: "US Dollar / Canadian Dollar", type: "major" },
      { symbol: "NZD/USD", description: "New Zealand Dollar / US Dollar", type: "major" },
      // Crosses EUR
      { symbol: "EUR/GBP", description: "Euro / British Pound", type: "cross" },
      { symbol: "EUR/JPY", description: "Euro / Japanese Yen", type: "cross" },
      { symbol: "EUR/CHF", description: "Euro / Swiss Franc", type: "cross" },
      { symbol: "EUR/AUD", description: "Euro / Australian Dollar", type: "cross" },
      { symbol: "EUR/CAD", description: "Euro / Canadian Dollar", type: "cross" },
      { symbol: "EUR/NZD", description: "Euro / New Zealand Dollar", type: "cross" },
      // Crosses GBP
      { symbol: "GBP/JPY", description: "British Pound / Japanese Yen", type: "cross" },
      { symbol: "GBP/CHF", description: "British Pound / Swiss Franc", type: "cross" },
      { symbol: "GBP/AUD", description: "British Pound / Australian Dollar", type: "cross" },
      { symbol: "GBP/CAD", description: "British Pound / Canadian Dollar", type: "cross" },
      { symbol: "GBP/NZD", description: "British Pound / New Zealand Dollar", type: "cross" },
      // Crosses AUD/NZD/CAD
      { symbol: "AUD/JPY", description: "Australian Dollar / Japanese Yen", type: "cross" },
      { symbol: "AUD/NZD", description: "Australian Dollar / New Zealand Dollar", type: "cross" },
      { symbol: "AUD/CAD", description: "Australian Dollar / Canadian Dollar", type: "cross" },
      { symbol: "AUD/CHF", description: "Australian Dollar / Swiss Franc", type: "cross" },
      { symbol: "NZD/JPY", description: "New Zealand Dollar / Japanese Yen", type: "cross" },
      { symbol: "NZD/CAD", description: "New Zealand Dollar / Canadian Dollar", type: "cross" },
      { symbol: "NZD/CHF", description: "New Zealand Dollar / Swiss Franc", type: "cross" },
      { symbol: "CAD/JPY", description: "Canadian Dollar / Japanese Yen", type: "cross" },
      { symbol: "CAD/CHF", description: "Canadian Dollar / Swiss Franc", type: "cross" },
      { symbol: "CHF/JPY", description: "Swiss Franc / Japanese Yen", type: "cross" },
      // Exotics
      { symbol: "USD/SGD", description: "US Dollar / Singapore Dollar", type: "exotic" },
      { symbol: "USD/HKD", description: "US Dollar / Hong Kong Dollar", type: "exotic" },
      { symbol: "USD/THB", description: "US Dollar / Thai Baht", type: "exotic" },
      { symbol: "USD/MXN", description: "US Dollar / Mexican Peso", type: "exotic" },
      { symbol: "USD/ZAR", description: "US Dollar / South African Rand", type: "exotic" },
      { symbol: "USD/TRY", description: "US Dollar / Turkish Lira", type: "exotic" },
      { symbol: "USD/PLN", description: "US Dollar / Polish Zloty", type: "exotic" },
      { symbol: "USD/SEK", description: "US Dollar / Swedish Krona", type: "exotic" },
      { symbol: "USD/NOK", description: "US Dollar / Norwegian Krone", type: "exotic" },
      { symbol: "USD/DKK", description: "US Dollar / Danish Krone", type: "exotic" },
      { symbol: "USD/CZK", description: "US Dollar / Czech Koruna", type: "exotic" },
      { symbol: "USD/HUF", description: "US Dollar / Hungarian Forint", type: "exotic" },
      { symbol: "USD/CNH", description: "US Dollar / Chinese Yuan Offshore", type: "exotic" },
      { symbol: "USD/INR", description: "US Dollar / Indian Rupee", type: "exotic" },
      { symbol: "EUR/TRY", description: "Euro / Turkish Lira", type: "exotic" },
      { symbol: "EUR/PLN", description: "Euro / Polish Zloty", type: "exotic" },
      { symbol: "EUR/SEK", description: "Euro / Swedish Krona", type: "exotic" },
      { symbol: "EUR/NOK", description: "Euro / Norwegian Krone", type: "exotic" },
      { symbol: "EUR/DKK", description: "Euro / Danish Krone", type: "exotic" },
      { symbol: "EUR/HUF", description: "Euro / Hungarian Forint", type: "exotic" },
      { symbol: "EUR/CZK", description: "Euro / Czech Koruna", type: "exotic" },
      { symbol: "GBP/SGD", description: "British Pound / Singapore Dollar", type: "exotic" },
      { symbol: "GBP/ZAR", description: "British Pound / South African Rand", type: "exotic" },
    ]
  },
  indices: {
    label: "Indices",
    pairs: [
      // US
      { symbol: "US30", description: "Dow Jones Industrial Average", type: "us" },
      { symbol: "US100", description: "NASDAQ 100", type: "us" },
      { symbol: "US500", description: "S&P 500", type: "us" },
      { symbol: "US2000", description: "Russell 2000", type: "us" },
      // Europe
      { symbol: "GER40", description: "DAX 40 (Germany)", type: "europe" },
      { symbol: "UK100", description: "FTSE 100 (UK)", type: "europe" },
      { symbol: "FRA40", description: "CAC 40 (France)", type: "europe" },
      { symbol: "EU50", description: "Euro Stoxx 50", type: "europe" },
      { symbol: "ESP35", description: "IBEX 35 (Spain)", type: "europe" },
      { symbol: "ITA40", description: "FTSE MIB (Italy)", type: "europe" },
      { symbol: "SUI20", description: "SMI (Switzerland)", type: "europe" },
      { symbol: "NED25", description: "AEX (Netherlands)", type: "europe" },
      // Asia Pacific
      { symbol: "JPN225", description: "Nikkei 225 (Japan)", type: "asia" },
      { symbol: "HK50", description: "Hang Seng (Hong Kong)", type: "asia" },
      { symbol: "AUS200", description: "ASX 200 (Australia)", type: "asia" },
      { symbol: "CHN50", description: "China A50", type: "asia" },
      { symbol: "SGP20", description: "Straits Times (Singapore)", type: "asia" },
      { symbol: "KOR200", description: "KOSPI 200 (South Korea)", type: "asia" },
      { symbol: "TWN", description: "Taiwan Weighted", type: "asia" },
      { symbol: "IND50", description: "Nifty 50 (India)", type: "asia" },
      // Other
      { symbol: "VIX", description: "Volatility Index", type: "other" },
      { symbol: "DXY", description: "US Dollar Index", type: "other" },
    ]
  },
  commodities: {
    label: "Commodities",
    pairs: [
      // Precious Metals
      { symbol: "XAU/USD", description: "Gold / US Dollar", type: "metal" },
      { symbol: "XAG/USD", description: "Silver / US Dollar", type: "metal" },
      { symbol: "XPT/USD", description: "Platinum / US Dollar", type: "metal" },
      { symbol: "XPD/USD", description: "Palladium / US Dollar", type: "metal" },
      { symbol: "XAU/EUR", description: "Gold / Euro", type: "metal" },
      { symbol: "XAU/GBP", description: "Gold / British Pound", type: "metal" },
      { symbol: "XAU/AUD", description: "Gold / Australian Dollar", type: "metal" },
      { symbol: "XAU/CHF", description: "Gold / Swiss Franc", type: "metal" },
      { symbol: "XAG/EUR", description: "Silver / Euro", type: "metal" },
      // Energy - Using standard CFD symbols
      { symbol: "USOIL", description: "Petrole Brut WTI", type: "energy" },
      { symbol: "UKOIL", description: "Petrole Brent", type: "energy" },
      { symbol: "NATGAS", description: "Gaz Naturel", type: "energy" },
      { symbol: "HEAT", description: "Fioul", type: "energy" },
      { symbol: "GASOLINE", description: "Essence RBOB", type: "energy" },
      // Agriculture
      { symbol: "WHEAT", description: "Wheat", type: "agriculture" },
      { symbol: "CORN", description: "Corn", type: "agriculture" },
      { symbol: "SOYBN", description: "Soybeans", type: "agriculture" },
      { symbol: "COFFEE", description: "Coffee", type: "agriculture" },
      { symbol: "SUGAR", description: "Sugar", type: "agriculture" },
      { symbol: "COCOA", description: "Cocoa", type: "agriculture" },
      { symbol: "COTTON", description: "Cotton", type: "agriculture" },
      // Industrial Metals
      { symbol: "COPPER", description: "Copper", type: "industrial" },
      { symbol: "ALUM", description: "Aluminum", type: "industrial" },
      { symbol: "ZINC", description: "Zinc", type: "industrial" },
      { symbol: "NICKEL", description: "Nickel", type: "industrial" },
    ]
  },
  crypto: {
    label: "Crypto",
    pairs: [
      { symbol: "BTC/USD", description: "Bitcoin / US Dollar", type: "major" },
      { symbol: "ETH/USD", description: "Ethereum / US Dollar", type: "major" },
      { symbol: "BTC/EUR", description: "Bitcoin / Euro", type: "major" },
      { symbol: "ETH/EUR", description: "Ethereum / Euro", type: "major" },
      { symbol: "XRP/USD", description: "Ripple / US Dollar", type: "alt" },
      { symbol: "LTC/USD", description: "Litecoin / US Dollar", type: "alt" },
      { symbol: "BCH/USD", description: "Bitcoin Cash / US Dollar", type: "alt" },
      { symbol: "ADA/USD", description: "Cardano / US Dollar", type: "alt" },
      { symbol: "DOT/USD", description: "Polkadot / US Dollar", type: "alt" },
      { symbol: "LINK/USD", description: "Chainlink / US Dollar", type: "alt" },
      { symbol: "SOL/USD", description: "Solana / US Dollar", type: "alt" },
      { symbol: "AVAX/USD", description: "Avalanche / US Dollar", type: "alt" },
      { symbol: "MATIC/USD", description: "Polygon / US Dollar", type: "alt" },
      { symbol: "UNI/USD", description: "Uniswap / US Dollar", type: "alt" },
      { symbol: "ATOM/USD", description: "Cosmos / US Dollar", type: "alt" },
      { symbol: "DOGE/USD", description: "Dogecoin / US Dollar", type: "meme" },
      { symbol: "SHIB/USD", description: "Shiba Inu / US Dollar", type: "meme" },
    ]
  },
  stocks: {
    label: "Stocks CFD",
    pairs: [
      // US Tech
      { symbol: "AAPL", description: "Apple Inc.", type: "tech" },
      { symbol: "MSFT", description: "Microsoft Corporation", type: "tech" },
      { symbol: "GOOGL", description: "Alphabet Inc.", type: "tech" },
      { symbol: "AMZN", description: "Amazon.com Inc.", type: "tech" },
      { symbol: "META", description: "Meta Platforms Inc.", type: "tech" },
      { symbol: "NVDA", description: "NVIDIA Corporation", type: "tech" },
      { symbol: "TSLA", description: "Tesla Inc.", type: "tech" },
      { symbol: "AMD", description: "Advanced Micro Devices", type: "tech" },
      { symbol: "NFLX", description: "Netflix Inc.", type: "tech" },
      { symbol: "INTC", description: "Intel Corporation", type: "tech" },
      // Finance
      { symbol: "JPM", description: "JPMorgan Chase & Co.", type: "finance" },
      { symbol: "BAC", description: "Bank of America Corp.", type: "finance" },
      { symbol: "GS", description: "Goldman Sachs Group", type: "finance" },
      { symbol: "V", description: "Visa Inc.", type: "finance" },
      { symbol: "MA", description: "Mastercard Inc.", type: "finance" },
      // Energy
      { symbol: "XOM", description: "Exxon Mobil Corp.", type: "energy" },
      { symbol: "CVX", description: "Chevron Corporation", type: "energy" },
      // Consumer
      { symbol: "KO", description: "Coca-Cola Company", type: "consumer" },
      { symbol: "PEP", description: "PepsiCo Inc.", type: "consumer" },
      { symbol: "MCD", description: "McDonald's Corporation", type: "consumer" },
      { symbol: "NKE", description: "Nike Inc.", type: "consumer" },
      // Healthcare
      { symbol: "JNJ", description: "Johnson & Johnson", type: "healthcare" },
      { symbol: "PFE", description: "Pfizer Inc.", type: "healthcare" },
      { symbol: "UNH", description: "UnitedHealth Group", type: "healthcare" },
    ]
  }
}



type Category = keyof typeof allPairs | 'watchlist' | 'all'

interface CurrencyPairsListProps {
  onPairClick?: (symbol: string) => void
}

export function CurrencyPairsList({ onPairClick }: CurrencyPairsListProps = {}) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('forex')
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST)
  const [isWatchlistLoaded, setIsWatchlistLoaded] = useState(false)
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  
  // Load watchlist from localStorage on mount
  useEffect(() => {
    const stored = loadWatchlist()
    setWatchlist(stored)
    setIsWatchlistLoaded(true)
  }, [])
  
  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (isWatchlistLoaded) {
      saveWatchlist(watchlist)
    }
  }, [watchlist, isWatchlistLoaded])
  
  // Toggle watchlist with persistence
  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol)
      } else {
        return [...prev, symbol]
      }
    })
  }, [])

  const categories: { id: Category; label: string }[] = [
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'forex', label: 'Forex' },
    { id: 'indices', label: 'Indices' },
    { id: 'commodities', label: 'Commodities' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'stocks', label: 'Stocks' },
    { id: 'all', label: 'All' },
  ]

  // Get unique types for current category
  const availableTypes = useMemo(() => {
    if (activeCategory === 'watchlist' || activeCategory === 'all') return []
    const pairs = allPairs[activeCategory]?.pairs || []
    return [...new Set(pairs.map(p => p.type))]
  }, [activeCategory])

  // Filter pairs based on search and category
  const filteredPairs = useMemo(() => {
    let pairs: { symbol: string; description: string; type: string; category: string }[] = []
    
    if (activeCategory === 'watchlist') {
      // Get all pairs that are in watchlist
      Object.entries(allPairs).forEach(([cat, data]) => {
        data.pairs.forEach(pair => {
          if (watchlist.includes(pair.symbol)) {
            pairs.push({ ...pair, category: cat })
          }
        })
      })
    } else if (activeCategory === 'all') {
      // Get all pairs from all categories
      Object.entries(allPairs).forEach(([cat, data]) => {
        data.pairs.forEach(pair => {
          pairs.push({ ...pair, category: cat })
        })
      })
    } else {
      // Get pairs from specific category
      pairs = (allPairs[activeCategory]?.pairs || []).map(p => ({ ...p, category: activeCategory }))
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      pairs = pairs.filter(p => 
        p.symbol.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      )
    }

    // Filter by type
    if (selectedTypes.length > 0) {
      pairs = pairs.filter(p => selectedTypes.includes(p.type))
    }

    return pairs
  }, [activeCategory, searchQuery, watchlist, selectedTypes])

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Circular Power Gauge Component
  const PowerGauge = ({ value, label, size = 32 }: { value: number; label: string; size?: number }) => {
    // value: -100 to 100, where negative is bearish and positive is bullish
    const normalizedValue = Math.max(-100, Math.min(100, value))
    const absValue = Math.abs(normalizedValue)
    const isBullish = normalizedValue > 0
    const isNeutral = normalizedValue === 0
    
    // Calculate stroke properties
    const strokeWidth = 3
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const progress = (absValue / 100) * circumference
    
    // Color based on value
    const color = isNeutral ? '#eab308' : isBullish ? '#22c55e' : '#ef4444'
    const bgColor = '#27272a'
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={bgColor}
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          {/* Percentage text in center */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ color }}
          >
            <span className="text-[9px] font-bold">
              {normalizedValue > 0 ? '+' : ''}{normalizedValue.toFixed(0)}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    )
  }

  // Mini Sparkline Component
  const MiniSparkline = ({ data, width = 60, height = 24 }: { data: number[]; width?: number; height?: number }) => {
    if (!data || data.length < 2) {
      return <div className="bg-muted/30 rounded" style={{ width, height }} />
    }
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    
    // Generate path
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    
    const isUp = data[data.length - 1] >= data[0]
    const color = isUp ? '#22c55e' : '#ef4444'
    
    return (
      <svg width={width} height={height} className="shrink-0">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // Percentage Change Cell with proper null handling and arrows
  const PercentCell = ({ value, label }: { value: number | null; label: string }) => {
    if (value === null) {
      return (
        <div className="flex flex-col items-center min-w-[50px]" title="Donnees temporairement indisponibles">
          <span className="text-[10px] text-muted-foreground mb-0.5">{label}</span>
          <div className="flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">--</span>
          </div>
        </div>
      )
    }
    
    const isPositive = value > 0
    const isNegative = value < 0
    const isZero = value === 0
    
    return (
      <div className="flex flex-col items-center min-w-[50px]">
        <span className="text-[10px] text-muted-foreground mb-0.5">{label}</span>
        <span className={cn(
          "text-xs font-semibold flex items-center gap-0.5",
          isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"
        )}>
          {isPositive && <span>▲</span>}
          {isNegative && <span>▼</span>}
          {isPositive ? '+' : ''}{value.toFixed(2)}%
        </span>
      </div>
    )
  }

  // Strength Arrow Indicator
  const StrengthArrow = ({ strength }: { strength: number }) => {
    // strength: -100 to 100
    const rotation = ((strength + 100) / 200) * 180 - 90 // -90 to 90 degrees
    const color = strength > 20 ? '#22c55e' : strength < -20 ? '#ef4444' : '#eab308'
    
    return (
      <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-[10px] text-muted-foreground mb-0.5">Force</span>
        <div 
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: color }}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none"
            style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s' }}
          >
            <path 
              d="M12 4L20 12L12 20" 
              stroke={color} 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    )
  }

  // Typical spreads for instruments
  const SPREADS: Record<string, { value: number; unit: string }> = {
    'EUR/USD': { value: 0.8, unit: 'pips' },
    'GBP/USD': { value: 1.2, unit: 'pips' },
    'USD/JPY': { value: 1.0, unit: 'pips' },
    'AUD/USD': { value: 1.0, unit: 'pips' },
    'USD/CHF': { value: 1.2, unit: 'pips' },
    'USD/CAD': { value: 1.5, unit: 'pips' },
    'NZD/USD': { value: 1.5, unit: 'pips' },
    'XAU/USD': { value: 0.35, unit: 'USD' },
    'XAG/USD': { value: 0.03, unit: 'USD' },
    'US30': { value: 1.5, unit: 'pts' },
    'US100': { value: 1.0, unit: 'pts' },
    'US500': { value: 0.4, unit: 'pts' },
    'BTC/USD': { value: 25, unit: 'USD' },
    'ETH/USD': { value: 1.5, unit: 'USD' },
  }
  
  const getSpread = (symbol: string) => {
    const spread = SPREADS[symbol] || { value: 2.0, unit: 'pips' }
    return `${spread.value} ${spread.unit}`
  }

  // Bias Badge Component
  const BiasBadge = ({ bias, confidence, label }: { bias: string; confidence: number; label: string }) => {
    const getBiasColor = () => {
      if (bias === 'bull') {
        if (confidence > 60) return 'bg-success text-success-foreground'
        return 'bg-success/20 text-success'
      }
      if (bias === 'bear') {
        if (confidence > 60) return 'bg-destructive text-destructive-foreground'
        return 'bg-destructive/20 text-destructive'
      }
      return 'bg-muted text-muted-foreground'
    }
    
    const getBiasText = () => {
      if (bias === 'bull') return confidence > 60 ? 'Fort Haussier' : 'Haussier'
      if (bias === 'bear') return confidence > 60 ? 'Fort Baissier' : 'Baissier'
      return 'Neutre'
    }
    
    return (
      <div className="flex flex-col items-center min-w-[70px]">
        <span className="text-[9px] text-muted-foreground mb-0.5">{label}</span>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getBiasColor())}>
          {getBiasText()}
        </span>
        <span className="text-[8px] text-muted-foreground">{confidence}%</span>
      </div>
    )
  }

  // RSI Cell Component  
  const RSICell = ({ value }: { value: number | null }) => {
    if (value === null) return <div className="w-[50px] text-center text-xs text-muted-foreground">--</div>
    
    const getColor = () => {
      if (value >= 70) return 'text-destructive'
      if (value <= 30) return 'text-success'
      return 'text-muted-foreground'
    }
    
    const getTooltip = () => {
      if (value >= 70) return 'Surachete'
      if (value <= 30) return 'Survendu'
      return 'Neutre'
    }
    
    return (
      <div className="flex flex-col items-center min-w-[50px]" title={getTooltip()}>
        <span className="text-[9px] text-muted-foreground">RSI</span>
        <span className={cn("text-xs font-semibold", getColor())}>{value.toFixed(0)}</span>
      </div>
    )
  }

  // MACD Cell Component
  const MACDCell = ({ histogram }: { histogram: number | null }) => {
    if (histogram === null) return <div className="w-[40px] text-center text-xs text-muted-foreground">--</div>
    
    const isPositive = histogram > 0
    
    return (
      <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-[9px] text-muted-foreground">MACD</span>
        <div className={cn(
          "w-4 h-4 rounded-sm",
          isPositive ? "bg-success" : "bg-destructive"
        )} />
      </div>
    )
  }

  // Volatility Badge
  const VolatilityBadge = ({ level }: { level: 'low' | 'medium' | 'high' | null }) => {
    if (!level) return <div className="w-[50px] text-center text-xs text-muted-foreground">--</div>
    
    const config = {
      low: { label: 'Faible', color: 'bg-muted text-muted-foreground' },
      medium: { label: 'Moyenne', color: 'bg-warning/20 text-warning' },
      high: { label: 'Élevée', color: 'bg-destructive/20 text-destructive' }
    }
    
    const { label, color } = config[level]
    
    return (
      <div className="flex flex-col items-center min-w-[50px]">
        <span className="text-[9px] text-muted-foreground">Vol.</span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", color)}>{label}</span>
      </div>
    )
  }

  // ===== LARGE VERSIONS FOR NEW TABLE LAYOUT =====

  // Large Percentage Cell
  const PercentCellLarge = ({ value }: { value: number | null }) => {
    if (value === null) {
      return (
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          <AlertTriangle className="w-4 h-4 opacity-50" />
          <span className="text-sm">--</span>
        </div>
      )
    }
    
    const isPositive = value > 0
    const isNegative = value < 0
    
    return (
      <div className={cn(
        "text-sm font-semibold flex items-center justify-center gap-1",
        isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"
      )}>
        {isPositive && <span className="text-xs">▲</span>}
        {isNegative && <span className="text-xs">▼</span>}
        <span>{isPositive ? '+' : ''}{value.toFixed(2)}%</span>
      </div>
    )
  }

  // Large RSI Cell
  const RSICellLarge = ({ value }: { value: number | null }) => {
    if (value === null) return <div className="text-center text-sm text-muted-foreground">--</div>
    
    const getColor = () => {
      if (value >= 70) return 'text-destructive font-bold'
      if (value <= 30) return 'text-success font-bold'
      return 'text-foreground'
    }
    
    const getLabel = () => {
      if (value >= 70) return 'Surachete'
      if (value <= 30) return 'Survendu'
      return ''
    }
    
    return (
      <div className="text-center">
        <span className={cn("text-base font-semibold", getColor())}>{value.toFixed(0)}</span>
        {getLabel() && <div className="text-[10px] text-muted-foreground">{getLabel()}</div>}
      </div>
    )
  }

  // Large MACD Cell
  const MACDCellLarge = ({ histogram }: { histogram: number | null }) => {
    if (histogram === null) return <div className="text-center text-sm text-muted-foreground">--</div>
    
    const isPositive = histogram > 0
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "w-8 h-3 rounded-full",
          isPositive ? "bg-success" : "bg-destructive"
        )} />
        <span className="text-[10px] text-muted-foreground">
          {isPositive ? 'Haussier' : 'Baissier'}
        </span>
      </div>
    )
  }

  // Large Volatility Badge
  const VolatilityBadgeLarge = ({ level }: { level: 'low' | 'medium' | 'high' | null }) => {
    if (!level) return <div className="text-center text-sm text-muted-foreground">--</div>
    
    const config = {
      low: { label: 'Faible', color: 'bg-emerald-500/20 text-emerald-400', icon: '○' },
      medium: { label: 'Moyenne', color: 'bg-amber-500/20 text-amber-400', icon: '◐' },
      high: { label: 'Elevee', color: 'bg-red-500/20 text-red-400', icon: '●' }
    }
    
    const { label, color, icon } = config[level]
    
    return (
      <div className="flex justify-center">
        <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5", color)}>
          <span>{icon}</span>
          {label}
        </span>
      </div>
    )
  }

  // Large Bias Badge - Updated for professional bias engine
  const BiasBadgeLarge = ({ 
    bias, 
    confidence, 
    label: biasLabel,
    reliable = true,
    reliabilityReason 
  }: { 
    bias: string
    confidence: number
    label?: string
    reliable?: boolean
    reliabilityReason?: string
  }) => {
    const getBiasConfig = () => {
      // Use the label from API if available (new format)
      if (biasLabel) {
        if (biasLabel === 'Fort Haussier') return { label: 'Fort Haussier', color: 'bg-[#00e5a0] text-zinc-900', icon: '▲▲' }
        if (biasLabel === 'Haussier') return { label: 'Haussier', color: 'bg-[#1D9E75] text-white', icon: '▲' }
        if (biasLabel === 'Fort Baissier') return { label: 'Fort Baissier', color: 'bg-[#ff4d6d] text-white', icon: '▼▼' }
        if (biasLabel === 'Baissier') return { label: 'Baissier', color: 'bg-[#e05252] text-white', icon: '▼' }
        return { label: 'Neutre', color: 'bg-[#ffc400] text-zinc-900', icon: '—' }
      }
      // Fallback to old format
      if (bias === 'bull') {
        if (confidence >= 55) return { label: 'Fort Haussier', color: 'bg-[#00e5a0] text-zinc-900', icon: '▲▲' }
        return { label: 'Haussier', color: 'bg-[#1D9E75] text-white', icon: '���' }
      }
      if (bias === 'bear') {
        if (confidence >= 55) return { label: 'Fort Baissier', color: 'bg-[#ff4d6d] text-white', icon: '▼▼' }
        return { label: 'Baissier', color: 'bg-[#e05252] text-white', icon: '▼' }
      }
      return { label: 'Neutre', color: 'bg-[#ffc400] text-zinc-900', icon: '—' }
    }
    
    const { label, color, icon } = getBiasConfig()
    
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-1">
        <span className={cn("text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 whitespace-nowrap", color)}>
          <span>{icon}</span>
          {label}
          {!reliable && (
            <span title={reliabilityReason} className="ml-0.5 cursor-help">⚠️</span>
          )}
        </span>
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{confidence}% confiance</span>
      </div>
    )
  }

  // PairRow component - uses single API for all data
  const PairRow = ({ pair, isInWatchlist, onToggleWatchlist, onDeepDive }: { 
    pair: { symbol: string; description: string; type: string; category: string }
    isInWatchlist: boolean
    onToggleWatchlist: (symbol: string) => void
    onDeepDive?: (symbol: string) => void
  }) => {
    const [showReport, setShowReport] = useState(false)
    
    // Fetch ALL data from single API
    const { data: pairData } = useSWR<{
      price: number
      change: number
      changePercent: number
      change1M: number | null
      change3M: number | null
      change12M: number | null
      rsi: number | null
      macdHistogram: number | null
      volatility: 'low' | 'medium' | 'high' | null
      swingBias: { 
        bias: 'bull' | 'bear' | 'neu'
        confidence: number
        label?: string
        reliable?: boolean
        reliabilityReason?: string
      }
      dayBias: { 
        bias: 'bull' | 'bear' | 'neu'
        confidence: number
        label?: string
        reliable?: boolean
        reliabilityReason?: string
      }
      spread: string
    }>(
      `/api/pair-data?symbol=${encodeURIComponent(pair.symbol)}`,
      fetcher,
      { refreshInterval: 300000, revalidateOnFocus: false, dedupingInterval: 60000 } // 5 min refresh for bias
    )
    
    // Extract data with defaults
    const price = pairData?.price || 0
    const changePercent = pairData?.changePercent || 0
    const isPositive = changePercent >= 0
    
    // Multi-period changes
    const change1m = pairData?.change1M ?? null
    const change3m = pairData?.change3M ?? null
    const change12m = pairData?.change12M ?? null
    
    // Bias data - new professional format
    const swingBiasData = pairData?.swingBias || { bias: 'neu', confidence: 50 }
    const dayBiasData = pairData?.dayBias || { bias: 'neu', confidence: 50 }
    
    // Technical indicators
    const rsi = pairData?.rsi ?? null
    const macdHistogram = pairData?.macdHistogram ?? null
    const volatility = pairData?.volatility ?? null
    const spread = pairData?.spread || getSpread(pair.symbol)
    
    // Format price based on symbol type
    const formatPrice = (p: number) => {
      if (p === 0) return '---'
      if (pair.symbol.includes('JPY')) return p.toFixed(3)
      if (pair.symbol.includes('XAU') || pair.symbol.includes('GOLD')) return p.toFixed(2)
      if (pair.symbol.includes('BTC') || pair.symbol.includes('ETH')) return p.toFixed(2)
      if (pair.category === 'indices') return p.toFixed(2)
      return p.toFixed(5)
    }
    
    return (
      <div 
        className="grid grid-cols-[50px_1fr_90px_90px_90px_90px_70px_70px_90px_130px_130px_110px] items-center gap-2 px-6 py-5 hover:bg-accent/30 transition-colors cursor-pointer border-b border-border/50 text-sm"
        onClick={() => onDeepDive?.(pair.symbol)}
      >
        {/* Watchlist Star */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleWatchlist(pair.symbol) }}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Star 
            className={cn(
              "w-5 h-5 transition-colors",
              isInWatchlist 
                ? "fill-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )} 
          />
        </button>

        {/* Symbol & Price */}
        <div className="pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-base">{pair.symbol}</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              pair.category === 'forex' ? 'bg-blue-500/20 text-blue-400' :
              pair.category === 'indices' ? 'bg-purple-500/20 text-purple-400' :
              pair.category === 'commodities' ? 'bg-amber-500/20 text-amber-400' :
              pair.category === 'crypto' ? 'bg-orange-500/20 text-orange-400' :
              'bg-muted text-muted-foreground'
            )}>
              {pair.category === 'forex' ? 'Forex' : 
               pair.category === 'indices' ? 'Indice' :
               pair.category === 'commodities' ? 'Matiere' :
               pair.category === 'crypto' ? 'Crypto' : pair.type}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-medium text-foreground">
              {formatPrice(price)}
            </span>
            <span className={cn(
              "text-sm font-bold px-2 py-1 rounded-md",
              isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
            )}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Spread */}
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">{spread}</span>
        </div>

        {/* Period Changes - Expanded */}
        <div className="text-center">
          <PercentCellLarge value={change1m} />
        </div>
        <div className="text-center">
          <PercentCellLarge value={change3m} />
        </div>
        <div className="text-center">
          <PercentCellLarge value={change12m} />
        </div>

        {/* RSI */}
        <RSICellLarge value={rsi} />

        {/* MACD */}
        <MACDCellLarge histogram={macdHistogram} />

        {/* Volatility */}
        <VolatilityBadgeLarge level={volatility} />

        {/* Swing Bias */}
        <BiasBadgeLarge 
          bias={swingBiasData.bias} 
          confidence={swingBiasData.confidence}
          label={swingBiasData.label}
          reliable={swingBiasData.reliable}
          reliabilityReason={swingBiasData.reliabilityReason}
        />

        {/* Day Bias */}
        <BiasBadgeLarge 
          bias={dayBiasData.bias} 
          confidence={dayBiasData.confidence}
          label={dayBiasData.label}
          reliable={dayBiasData.reliable}
          reliabilityReason={dayBiasData.reliabilityReason}
        />

        {/* Report Button */}
        <div className="flex justify-center pl-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReport(true) }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors shadow-sm whitespace-nowrap"
            title="Voir le rapport complet"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="text-xs">Rapport</span>
          </button>
        </div>

        {/* Report Modal - Structured format with real data */}
        {showReport && (
          <StructuredReportModal
            key={`report-${pair.symbol}`}
            symbol={pair.symbol}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background w-full">
      {/* Search Bar */}
      <div className="p-6 border-b border-border bg-card/50">
        <div className="flex items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un symbole, nom ou ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-background border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredPairs.length}</span> paires trouvees
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border overflow-x-auto bg-muted/30">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSelectedTypes([]) }}
            className={cn(
              "px-5 py-2.5 text-sm font-medium whitespace-nowrap rounded-xl transition-all",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/80"
            )}
          >
            {cat.label}
            {cat.id === 'watchlist' && watchlist.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary-foreground/20 rounded-full">
                {watchlist.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Type Filter (for specific categories) */}
      {availableTypes.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <button 
            onClick={() => setShowTypeFilter(!showTypeFilter)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Filter className="w-4 h-4" />
            Filter by type
            <ChevronDown className={cn("w-4 h-4 transition-transform", showTypeFilter && "rotate-180")} />
          </button>
          {showTypeFilter && (
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition-colors capitalize",
                    selectedTypes.includes(type)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {type}
                </button>
              ))}
              {selectedTypes.length > 0 && (
                <button
                  onClick={() => setSelectedTypes([])}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header Row */}
      <div className="grid grid-cols-[50px_1fr_90px_90px_90px_90px_70px_70px_90px_130px_130px_110px] items-center gap-2 px-6 py-4 text-xs text-muted-foreground border-b-2 border-border bg-muted/50 font-semibold uppercase tracking-wider">
        <div></div>
        <div>Symbole / Prix</div>
        <div className="text-center">Spread</div>
        <div className="text-center">1 Mois</div>
        <div className="text-center">3 Mois</div>
        <div className="text-center">12 Mois</div>
        <div className="text-center">RSI</div>
        <div className="text-center">MACD</div>
        <div className="text-center">Volatilite</div>
        <div className="text-center">Swing Bias</div>
        <div className="text-center">Day Bias</div>
        <div className="text-center">Analyse</div>
      </div>

      {/* Pairs List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No pairs found</p>
            {activeCategory === 'watchlist' && (
              <p className="text-xs mt-1">Click the star icon to add pairs to your watchlist</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPairs.map((pair) => {
              const isInWatchlist = watchlist.includes(pair.symbol)
              
              return (
                <PairRow 
                  key={pair.symbol}
                  pair={pair}
                  isInWatchlist={isInWatchlist}
                  onToggleWatchlist={toggleWatchlist}
                  onDeepDive={onPairClick}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-4 border-t border-border bg-card/50 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredPairs.length}</span> paires affichees
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span><span className="font-semibold text-foreground">{watchlist.length}</span> dans la watchlist</span>
          </div>
        </div>
      </div>
    </div>
  )
}
