'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { MarketCard, MarketCardSkeleton } from './market-card'
import { RiskSentimentGauge } from './risk-sentiment-gauge'
import { SessionStatus } from './session-status'
import { NewsFeed } from './news-feed'
import { NewsNotification } from './news-notification'
import { TrumpRiskTracker } from './trump-risk-tracker'
import { EconomicCalendar } from './economic-calendar'
import { CurrencyPairsList } from './currency-pairs-list'
import { COTReport } from './cot-report'
import { EconomicsView } from './economics-view'
import { InterestRatesView } from './interest-rates-view'
import { MetalsPrices } from './metals-prices'
import { AdminDashboard } from './admin-dashboard'
import { MacroDeskView } from './desk/MacroDeskView'
import { TrendingUp, ChevronRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { AssetDeepDive } from './asset-deep-dive'



interface AssetData {
  price: number
  prev: number
  chg: number
  chgPts: number
  bias: 'bull' | 'bear' | 'neu'
  confidence: number
  summary: string
  factors: string[]
}

interface ApiResponse {
  data: Record<string, AssetData>
  timestamp: string
  assets: Array<{ key: string; label: string }>
}

// Default symbols: Gold optimized dashboard
// XAU/USD = Gold (main trading asset - HERO)
// DXY, XAG/USD, WTI, US500, US100, US30, VIX, US10Y = Correlations (compact grid)
const DEFAULT_SYMBOLS = ['XAU/USD', 'DXY', 'XAG/USD', 'WTI', 'US500', 'US100', 'US30', 'VIX', 'US10Y']

async function fetchMarketData(): Promise<ApiResponse> {
  // First try unified API for consistent data
  const unifiedRes = await fetch(`/api/unified-data?symbols=${DEFAULT_SYMBOLS.join(',')}`)
  if (unifiedRes.ok) {
    const unifiedData = await unifiedRes.json()
    if (unifiedData.data) {
      // Transform unified data to match expected format
      const assets = Object.keys(unifiedData.data).map(key => ({
        key,
        label: key
      }))
      const data: Record<string, AssetData> = {}
      for (const [symbol, d] of Object.entries(unifiedData.data) as [string, { price: number; changePercent: number; swing: { bias: string; confidence: number }; day: { bias: string } }][]) {
        data[symbol] = {
          price: d.price,
          changePercent: d.changePercent,
          bias: d.swing?.bias as 'bull' | 'bear' | 'neu' || 'neu',
          confidence: d.swing?.confidence || 50,
          summary: '',
          factors: []
        }
      }
      return { data, timestamp: unifiedData.timestamp, assets }
    }
  }
  
  // Fallback to market-data API
  const res = await fetch('/api/market-data')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

interface TradingDashboardProps {
  activeView: string
  onViewChange: (view: string) => void
}
  
export function TradingDashboard({ activeView, onViewChange }: TradingDashboardProps) {
  const { t } = useI18n()
  const [selectedSymbols, setSelectedSymbols] = useState(['XAU/USD', 'DXY', 'XAG/USD', 'WTI', 'US500', 'US100', 'US30', 'VIX', 'US10Y'])
  
  // Deep Dive view state - when set, shows detailed view for that symbol
  const [deepDiveSymbol, setDeepDiveSymbol] = useState<string | null>(null)
  
  // BULK ANALYSIS: Fetch all analyses with ONE API call instead of per-card
  const [bulkAnalyses, setBulkAnalyses] = useState<Record<string, string>>({})
  const [bulkLoading, setBulkLoading] = useState(false)
  
  // Fetch bulk analyses for all selected symbols
  useEffect(() => {
    const fetchBulkAnalyses = async () => {
      try {
        setBulkLoading(true)
        
        // TEMPORARILY DISABLED: ALL Groq calls disabled to prevent 429 errors
        // The app is being rate-limited due to multiple simultaneous Groq requests
        // Fallback: show simple waiting text
        const fallbackAnalyses: Record<string, string> = {}
        selectedSymbols.forEach(symbol => {
          fallbackAnalyses[symbol] = `${symbol} - Chargement...`
        })
        setBulkAnalyses(fallbackAnalyses)
        return
        
        /* DISABLED - ALL Groq DISABLED TO PREVENT 429 ERRORS
        // Get market data first to extract biases and prices
        const marketRes = await fetch(`/api/unified-data?symbols=${selectedSymbols.join(',')}`)
        if (!marketRes.ok) {
          console.warn('[Dashboard] Failed to fetch market data for bulk analysis')
          return
        }
        
        const marketData = await marketRes.json()
        
        // Extract symbols, biases, and prices for bulk API
        const biases = selectedSymbols.map(symbol => ({
          swing: marketData.data?.[symbol]?.swing || { direction: 'Neutral', confidence: 50 },
          day: marketData.data?.[symbol]?.day || { direction: 'Neutral', confidence: 50 }
        }))
        
        const prices = selectedSymbols.map(symbol => ({
          price: marketData.data?.[symbol]?.price || 0,
          change: marketData.data?.[symbol]?.changePercent || 0
        }))
        
        // Call BULK analysis API (1 Groq call for ALL symbols)
        const bulkRes = await fetch('/api/bulk-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbols: selectedSymbols,
            biases,
            prices
          })
        })
        
        if (!bulkRes.ok) {
          console.error('[Dashboard] Bulk analysis API error')
          return
        }
        
        const bulkData = await bulkRes.json()
        console.log('[Dashboard] Bulk analyses fetched:', {
          count: Object.keys(bulkData.analyses).length,
          source: bulkData.source,
          symbols: selectedSymbols
        })
        setBulkAnalyses(bulkData.analyses)
        */
      } catch (error) {
        console.error('[Dashboard] Error fetching bulk analyses:', error)
      } finally {
        setBulkLoading(false)
      }
    }
    
    if (selectedSymbols.length > 0) {
      fetchBulkAnalyses()
      // Refresh every 10 minutes (matching bulk cache TTL)
      const interval = setInterval(fetchBulkAnalyses, 10 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [selectedSymbols])
  
  const { data, isLoading, error, isValidating, mutate } = useSWR<ApiResponse>(
    'market-data',
    fetchMarketData,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  )

  const assets = data?.assets || []
  const marketData = data?.data || {}

  const lastUpdate = data?.timestamp 
    ? new Date(data.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  // Render different views based on activeView
  const renderContent = () => {
    switch (activeView) {
      case 'news':
        return (
          <div className="h-full">
            <NewsFeed />
          </div>
        )
      case 'trump':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <TrumpRiskTracker />
          </div>
        )
      case 'calendar':
        return (
          <div className="h-full">
            <EconomicCalendar />
          </div>
        )
      case 'economics':
        return (
          <div className="h-full">
            <EconomicsView />
          </div>
        )
      case 'metals':
        return (
          <div className="h-full overflow-y-auto p-6">
            <MetalsPrices />
          </div>
        )
      case 'interest-rates':
        return (
          <div className="h-full">
            <InterestRatesView />
          </div>
        )
      case 'pairs':
        // If deep dive is active, show the deep dive view
        if (deepDiveSymbol) {
          return (
            <AssetDeepDive
              symbol={deepDiveSymbol}
              onBack={() => setDeepDiveSymbol(null)}
            />
          )
        }
        return (
          <div className="h-full">
            <CurrencyPairsList onPairClick={setDeepDiveSymbol} />
          </div>
        )
      case 'cot':
        return (
          <div className="h-full">
            <COTReport />
          </div>
        )
      case 'admin':
        return (
          <div className="h-full">
            <AdminDashboard />
          </div>
        )
      case 'macro-desk':
        return (
          <div className="h-full">
            <MacroDeskView />
          </div>
        )
      default:
        // Default view is GOLD ROOM (macro-desk)
        return (
          <div className="h-full">
            <MacroDeskView />
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Session Status Bar */}
      <SessionStatus />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {renderContent()}
      </main>

      {/* News Notifications - Bottom Right */}
      <NewsNotification />
    </div>
  )
}
