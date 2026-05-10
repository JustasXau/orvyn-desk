"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Search, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts"

// Types
interface COTData {
  symbol: string
  name: string
  market: string
  longPercent: number
  shortPercent: number
  prevLongPercent: number
  prevShortPercent: number
  netPosition: number
  prevNetPosition: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  trend: 'rising' | 'falling' | 'stable'
}

// Categories
const categories = [
  { id: 'all', label: 'TOUT' },
  { id: 'currencies', label: 'DEVISES' },
  { id: 'energy', label: 'ÉNERGIES' },
  { id: 'financials', label: 'DONNÉES FINANCIÈRES' },
  { id: 'grains', label: 'CÉRÉALES' },
  { id: 'indices', label: 'INDICES' },
  { id: 'meats', label: 'VIANDES' },
  { id: 'metals', label: 'MÉTAUX' },
  { id: 'softs', label: 'SOFTS' },
]

// Reference COT data - updated weekly from CFTC reports
// In production: integrate with CFTC API or data provider like Quandl
const sampleCOTData: COTData[] = [
  // Currencies
  { symbol: 'A6', name: 'Dollar australien (A6)', market: 'currencies', longPercent: 67.79, shortPercent: 32.21, prevLongPercent: 66.81, prevShortPercent: 33.19, netPosition: 71900, prevNetPosition: 64800, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'B6', name: 'Livre sterling (B6)', market: 'currencies', longPercent: 33.14, shortPercent: 66.86, prevLongPercent: 35.40, prevShortPercent: 64.60, netPosition: -60600, prevNetPosition: -52800, sentiment: 'bearish', trend: 'falling' },
  { symbol: '6E', name: 'Euro FX', market: 'currencies', longPercent: 55.20, shortPercent: 44.80, prevLongPercent: 53.10, prevShortPercent: 46.90, netPosition: 45200, prevNetPosition: 38100, sentiment: 'bullish', trend: 'rising' },
  { symbol: '6J', name: 'Yen japonais', market: 'currencies', longPercent: 28.50, shortPercent: 71.50, prevLongPercent: 30.20, prevShortPercent: 69.80, netPosition: -125000, prevNetPosition: -118000, sentiment: 'bearish', trend: 'falling' },
  { symbol: '6C', name: 'Dollar canadien', market: 'currencies', longPercent: 42.30, shortPercent: 57.70, prevLongPercent: 44.10, prevShortPercent: 55.90, netPosition: -32500, prevNetPosition: -28900, sentiment: 'bearish', trend: 'falling' },
  { symbol: '6S', name: 'Franc suisse', market: 'currencies', longPercent: 61.40, shortPercent: 38.60, prevLongPercent: 59.80, prevShortPercent: 40.20, netPosition: 18200, prevNetPosition: 15600, sentiment: 'bullish', trend: 'rising' },
  { symbol: '6N', name: 'Dollar néo-zélandais', market: 'currencies', longPercent: 35.80, shortPercent: 64.20, prevLongPercent: 37.50, prevShortPercent: 62.50, netPosition: -22100, prevNetPosition: -19400, sentiment: 'bearish', trend: 'falling' },
  { symbol: '6M', name: 'Peso mexicain', market: 'currencies', longPercent: 72.50, shortPercent: 27.50, prevLongPercent: 70.20, prevShortPercent: 29.80, netPosition: 89500, prevNetPosition: 82100, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'DX', name: 'Indice du dollar américain', market: 'currencies', longPercent: 48.20, shortPercent: 51.80, prevLongPercent: 50.10, prevShortPercent: 49.90, netPosition: -8500, prevNetPosition: 2100, sentiment: 'bearish', trend: 'falling' },
  // Energy
  { symbol: 'CL', name: 'Pétrole brut WTI', market: 'energy', longPercent: 58.30, shortPercent: 41.70, prevLongPercent: 56.80, prevShortPercent: 43.20, netPosition: 185000, prevNetPosition: 172000, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'BZ', name: 'Cours du Brent', market: 'energy', longPercent: 62.10, shortPercent: 37.90, prevLongPercent: 60.50, prevShortPercent: 39.50, netPosition: 142000, prevNetPosition: 135000, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'NG', name: 'Gaz naturel', market: 'energy', longPercent: 38.40, shortPercent: 61.60, prevLongPercent: 40.20, prevShortPercent: 59.80, netPosition: -98000, prevNetPosition: -85000, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'HO', name: 'Fioul', market: 'energy', longPercent: 54.20, shortPercent: 45.80, prevLongPercent: 52.90, prevShortPercent: 47.10, netPosition: 28500, prevNetPosition: 24200, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'RB', name: 'Essence RBOB', market: 'energy', longPercent: 51.80, shortPercent: 48.20, prevLongPercent: 53.10, prevShortPercent: 46.90, netPosition: 12800, prevNetPosition: 18500, sentiment: 'bullish', trend: 'falling' },
  // Metals
  { symbol: 'GC', name: 'Or', market: 'metals', longPercent: 72.50, shortPercent: 27.50, prevLongPercent: 70.80, prevShortPercent: 29.20, netPosition: 245000, prevNetPosition: 228000, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'SI', name: 'Argent', market: 'metals', longPercent: 68.30, shortPercent: 31.70, prevLongPercent: 66.20, prevShortPercent: 33.80, netPosition: 52000, prevNetPosition: 46500, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'HG', name: 'Cuivre de haute qualité', market: 'metals', longPercent: 45.60, shortPercent: 54.40, prevLongPercent: 47.80, prevShortPercent: 52.20, netPosition: -18500, prevNetPosition: -12200, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'PL', name: 'Platine', market: 'metals', longPercent: 58.90, shortPercent: 41.10, prevLongPercent: 57.20, prevShortPercent: 42.80, netPosition: 15200, prevNetPosition: 12800, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'PA', name: 'Palladium', market: 'metals', longPercent: 32.40, shortPercent: 67.60, prevLongPercent: 34.50, prevShortPercent: 65.50, netPosition: -8900, prevNetPosition: -7200, sentiment: 'bearish', trend: 'falling' },
  // Indices
  { symbol: 'ES', name: 'E-Mini S&P 500', market: 'indices', longPercent: 54.80, shortPercent: 45.20, prevLongPercent: 52.90, prevShortPercent: 47.10, netPosition: 125000, prevNetPosition: 98000, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'NQ', name: 'E-Mini Nasdaq 100', market: 'indices', longPercent: 48.20, shortPercent: 51.80, prevLongPercent: 50.50, prevShortPercent: 49.50, netPosition: -22000, prevNetPosition: 5200, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'YM', name: 'E-Mini Dow Jones', market: 'indices', longPercent: 56.30, shortPercent: 43.70, prevLongPercent: 54.80, prevShortPercent: 45.20, netPosition: 38500, prevNetPosition: 32100, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'RTY', name: 'Russell 2000 E-Mini', market: 'indices', longPercent: 42.10, shortPercent: 57.90, prevLongPercent: 44.30, prevShortPercent: 55.70, netPosition: -28900, prevNetPosition: -22500, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'VX', name: 'CBOE VIX', market: 'indices', longPercent: 28.50, shortPercent: 71.50, prevLongPercent: 30.20, prevShortPercent: 69.80, netPosition: -145000, prevNetPosition: -132000, sentiment: 'bearish', trend: 'falling' },
  // Grains
  { symbol: 'ZC', name: 'Maïs', market: 'grains', longPercent: 38.90, shortPercent: 61.10, prevLongPercent: 40.50, prevShortPercent: 59.50, netPosition: -185000, prevNetPosition: -162000, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'ZW', name: 'Blé', market: 'grains', longPercent: 32.40, shortPercent: 67.60, prevLongPercent: 34.80, prevShortPercent: 65.20, netPosition: -98500, prevNetPosition: -85200, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'ZS', name: 'Soja', market: 'grains', longPercent: 45.20, shortPercent: 54.80, prevLongPercent: 43.50, prevShortPercent: 56.50, netPosition: -42000, prevNetPosition: -55800, sentiment: 'bearish', trend: 'rising' },
  { symbol: 'ZM', name: 'Tourteau de soja', market: 'grains', longPercent: 52.80, shortPercent: 47.20, prevLongPercent: 50.20, prevShortPercent: 49.80, netPosition: 18500, prevNetPosition: 8200, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'ZL', name: 'Huile de soja', market: 'grains', longPercent: 48.30, shortPercent: 51.70, prevLongPercent: 46.80, prevShortPercent: 53.20, netPosition: -5200, prevNetPosition: -12800, sentiment: 'bearish', trend: 'rising' },
  // Softs
  { symbol: 'KC', name: 'Café', market: 'softs', longPercent: 75.20, shortPercent: 24.80, prevLongPercent: 72.80, prevShortPercent: 27.20, netPosition: 68500, prevNetPosition: 58200, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'SB', name: 'Sucre n°11', market: 'softs', longPercent: 62.40, shortPercent: 37.60, prevLongPercent: 60.10, prevShortPercent: 39.90, netPosition: 185000, prevNetPosition: 162000, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'CC', name: 'Cacao', market: 'softs', longPercent: 58.90, shortPercent: 41.10, prevLongPercent: 56.20, prevShortPercent: 43.80, netPosition: 42500, prevNetPosition: 35800, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'CT', name: 'Coton n°2', market: 'softs', longPercent: 35.80, shortPercent: 64.20, prevLongPercent: 38.20, prevShortPercent: 61.80, netPosition: -52800, prevNetPosition: -42500, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'OJ', name: 'Jus d\'orange', market: 'softs', longPercent: 82.50, shortPercent: 17.50, prevLongPercent: 80.20, prevShortPercent: 19.80, netPosition: 12500, prevNetPosition: 10800, sentiment: 'bullish', trend: 'rising' },
  // Meats
  { symbol: 'LE', name: 'Bétail vivant', market: 'meats', longPercent: 68.20, shortPercent: 31.80, prevLongPercent: 65.80, prevShortPercent: 34.20, netPosition: 85200, prevNetPosition: 72500, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'GF', name: 'Bovins d\'engraissement', market: 'meats', longPercent: 55.40, shortPercent: 44.60, prevLongPercent: 53.20, prevShortPercent: 46.80, netPosition: 12800, prevNetPosition: 8500, sentiment: 'bullish', trend: 'rising' },
  { symbol: 'HE', name: 'Porc maigre', market: 'meats', longPercent: 42.80, shortPercent: 57.20, prevLongPercent: 45.10, prevShortPercent: 54.90, netPosition: -28500, prevNetPosition: -22100, sentiment: 'bearish', trend: 'falling' },
  // Financials
  { symbol: 'ZN', name: 'Bon du Trésor à 10 ans', market: 'financials', longPercent: 38.50, shortPercent: 61.50, prevLongPercent: 40.20, prevShortPercent: 59.80, netPosition: -485000, prevNetPosition: -425000, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'ZB', name: 'Bon du Trésor à 30 ans', market: 'financials', longPercent: 42.30, shortPercent: 57.70, prevLongPercent: 44.50, prevShortPercent: 55.50, netPosition: -182000, prevNetPosition: -158000, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'ZF', name: 'Bon du Trésor à 5 ans', market: 'financials', longPercent: 35.80, shortPercent: 64.20, prevLongPercent: 37.90, prevShortPercent: 62.10, netPosition: -325000, prevNetPosition: -285000, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'ZT', name: 'Bon du Trésor à 2 ans', market: 'financials', longPercent: 32.10, shortPercent: 67.90, prevLongPercent: 34.50, prevShortPercent: 65.50, netPosition: -412000, prevNetPosition: -378000, sentiment: 'bearish', trend: 'falling' },
  { symbol: 'GE', name: 'Eurodollar', market: 'financials', longPercent: 48.20, shortPercent: 51.80, prevLongPercent: 46.80, prevShortPercent: 53.20, netPosition: -85000, prevNetPosition: -125000, sentiment: 'bearish', trend: 'rising' },
]

// Format large numbers
function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toFixed(0)
}

// Calculate change percentage
function calcChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Long:</span>
            <span className="text-xs font-medium text-emerald-400">{payload[0]?.value?.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-muted-foreground">Short:</span>
            <span className="text-xs font-medium text-red-400">{payload[1]?.value?.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function COTReport() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortField, setSortField] = useState<keyof COTData>('symbol')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [timeFilter, setTimeFilter] = useState<'latest' | 'month'>('latest')

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = [...sampleCOTData]

    // Filter by category
    if (activeCategory !== 'all') {
      data = data.filter(item => item.market === activeCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      data = data.filter(item =>
        item.symbol.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      )
    }

    // Sort
    data.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })

    return data
  }, [searchQuery, activeCategory, sortField, sortDirection])

  // Chart data
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      name: item.name.length > 15 ? item.symbol : item.name,
      symbol: item.symbol,
      long: item.longPercent,
      short: item.shortPercent,
    }))
  }, [filteredData])

  // Handle sort
  const handleSort = (field: keyof COTData) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get current date
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="flex flex-col gap-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary">Rapport COT</h1>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
            Donnees de reference CFTC
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Analyse et commentaires sur les positions des operateurs - Mise a jour hebdomadaire
        </p>
      </div>

      {/* Search and Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher des symboles, des noms ou des secteurs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button className="p-2.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Legend */}
        <div className="flex items-center justify-end gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Long %</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-xs text-muted-foreground">Pourcentage de positions courtes</span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 80 }}
            >
              <XAxis
                dataKey="symbol"
                tick={{ fill: '#888', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis
                tick={{ fill: '#888', fontSize: 10 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="long" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="short" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Analyse des données COT récentes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeFilter('latest')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              timeFilter === 'latest'
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent"
            )}
          >
            Dernières nouvelles
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              timeFilter === 'month'
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent"
            )}
          >
            Ce mois-ci
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Date Header */}
        <div className="px-6 py-3 bg-muted/50 border-b border-border">
          <span className="text-sm font-medium text-foreground">{currentDate}</span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[80px_1fr_100px_120px_100px_110px_100px_110px_110px_100px_100px] px-6 py-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <button onClick={() => handleSort('symbol')} className="flex items-center gap-1 hover:text-foreground">
            Symbole
            {sortField === 'symbol' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <span>Nom</span>
          <span>Marché</span>
          <span>Sentiment</span>
          <button onClick={() => handleSort('longPercent')} className="flex items-center gap-1 hover:text-foreground">
            Long %
            {sortField === 'longPercent' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <span>Préc. Long %</span>
          <button onClick={() => handleSort('shortPercent')} className="flex items-center gap-1 hover:text-foreground">
            Court %
            {sortField === 'shortPercent' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <span>Préc. % court</span>
          <button onClick={() => handleSort('netPosition')} className="flex items-center gap-1 hover:text-foreground">
            Position nette
            {sortField === 'netPosition' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </button>
          <span>Préc. Net</span>
          <span>Modifier</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {filteredData.map((item) => {
            const netChange = calcChange(item.netPosition, item.prevNetPosition)
            const isPositiveChange = netChange > 0

            return (
              <div
                key={item.symbol}
                className="grid grid-cols-[80px_1fr_100px_120px_100px_110px_100px_110px_110px_100px_100px] px-6 py-4 items-center hover:bg-accent/30 transition-colors text-sm"
              >
                {/* Symbol */}
                <span className="font-semibold text-primary">{item.symbol}</span>

                {/* Name */}
                <span className="text-foreground truncate pr-4">{item.name}</span>

                {/* Market */}
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded w-fit",
                  item.sentiment === 'bullish' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                )}>
                  {item.sentiment === 'bullish' ? 'haussier' : 'baissier'}
                </span>

                {/* Sentiment/Trend */}
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded w-fit flex items-center gap-1",
                  item.trend === 'rising' 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : item.trend === 'falling'
                    ? "bg-red-500/20 text-red-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {item.trend === 'rising' ? (
                    <>Tendance haussière <TrendingUp className="w-3 h-3" /></>
                  ) : item.trend === 'falling' ? (
                    <>Tendance baissière <TrendingDown className="w-3 h-3" /></>
                  ) : 'Stable'}
                </span>

                {/* Long % */}
                <div>
                  <span className={cn(
                    "font-semibold",
                    item.longPercent > 50 ? "text-emerald-400" : "text-foreground"
                  )}>
                    {item.longPercent.toFixed(2)}%
                  </span>
                  <div className="w-full h-1 bg-muted rounded mt-1">
                    <div
                      className="h-full bg-emerald-500 rounded"
                      style={{ width: `${item.longPercent}%` }}
                    />
                  </div>
                </div>

                {/* Prev Long % */}
                <span className="text-muted-foreground">{item.prevLongPercent.toFixed(2)}%</span>

                {/* Short % */}
                <div>
                  <span className={cn(
                    "font-semibold",
                    item.shortPercent > 50 ? "text-red-400" : "text-foreground"
                  )}>
                    {item.shortPercent.toFixed(2)}%
                  </span>
                  <div className="w-full h-1 bg-muted rounded mt-1">
                    <div
                      className="h-full bg-red-500 rounded"
                      style={{ width: `${item.shortPercent}%` }}
                    />
                  </div>
                </div>

                {/* Prev Short % */}
                <span className="text-muted-foreground">{item.prevShortPercent.toFixed(2)}%</span>

                {/* Net Position */}
                <span className={cn(
                  "font-semibold",
                  item.netPosition > 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {formatNumber(item.netPosition)}
                </span>

                {/* Prev Net */}
                <span className="text-muted-foreground">{formatNumber(item.prevNetPosition)}</span>

                {/* Change % */}
                <span className={cn(
                  "font-semibold px-2 py-1 rounded text-xs flex items-center gap-1",
                  isPositiveChange 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {isPositiveChange ? '+' : ''}{netChange.toFixed(2)}%
                  {isPositiveChange ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">Aucune donnée trouvée pour cette recherche</p>
          </div>
        )}
      </div>
    </div>
  )
}
