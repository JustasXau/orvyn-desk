'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Minus } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'

interface RateData {
  code: string
  seriesId: string
  name: string
  country: string
  flag: string
  currency: string
  rate: {
    value: number
    date: string
    change: number
    previousValue: number
  } | null
  chart: Array<{ date: string; value: number }>
}

interface InterestRatesData {
  rates: RateData[]
  lastUpdated: string
}

export function InterestRatesView() {
  const [data, setData] = useState<InterestRatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRate, setSelectedRate] = useState<RateData | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/interest-rates')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
      if (json.rates?.length > 0 && !selectedRate) {
        setSelectedRate(json.rates[0])
      }
    } catch (err) {
      setError('Erreur lors du chargement des donnees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error || 'Donnees non disponibles'}</p>
        <button onClick={fetchData} className="text-primary hover:underline">
          Reessayer
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Suivi des taux d&apos;interet</h1>
          <p className="text-sm text-muted-foreground">
            Taux directeurs des banques centrales mondiales
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Actualiser
        </button>
      </div>

      {/* Main Chart */}
      {selectedRate && selectedRate.chart.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{selectedRate.flag}</span>
            <div>
              <h2 className="text-lg font-semibold">{selectedRate.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedRate.country} - {selectedRate.currency}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold">{selectedRate.rate?.value.toFixed(2)}%</p>
              {selectedRate.rate && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium justify-end",
                  selectedRate.rate.change > 0 ? "text-red-400" : selectedRate.rate.change < 0 ? "text-green-400" : "text-muted-foreground"
                )}>
                  {selectedRate.rate.change > 0 ? <TrendingUp className="w-3 h-3" /> : 
                   selectedRate.rate.change < 0 ? <TrendingDown className="w-3 h-3" /> : 
                   <Minus className="w-3 h-3" />}
                  {selectedRate.rate.change > 0 ? '+' : ''}{selectedRate.rate.change.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedRate.chart}>
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(v) => {
                    const d = new Date(v)
                    return `${d.getMonth()+1}/${d.getFullYear().toString().slice(2)}`
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(v) => `${v}%`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('fr-FR')}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'Taux']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="url(#rateGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rates Grid */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Toutes les banques centrales ({data.rates.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data.rates.map((rate) => (
            <RateCard
              key={rate.code}
              rate={rate}
              isSelected={selectedRate?.code === rate.code}
              onClick={() => setSelectedRate(rate)}
            />
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Comparaison des taux</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium">Pays</th>
                <th className="text-left p-3 font-medium">Banque centrale</th>
                <th className="text-right p-3 font-medium">Taux actuel</th>
                <th className="text-right p-3 font-medium">Variation</th>
                <th className="text-right p-3 font-medium">Derniere MAJ</th>
              </tr>
            </thead>
            <tbody>
              {data.rates.map((rate) => (
                <tr 
                  key={rate.code} 
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setSelectedRate(rate)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rate.flag}</span>
                      <span className="font-medium">{rate.country}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{rate.name}</td>
                  <td className="p-3 text-right font-mono font-bold">{rate.rate?.value.toFixed(2)}%</td>
                  <td className="p-3 text-right">
                    {rate.rate && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        rate.rate.change > 0 ? "bg-red-500/10 text-red-400" : 
                        rate.rate.change < 0 ? "bg-green-500/10 text-green-400" : 
                        "bg-muted text-muted-foreground"
                      )}>
                        {rate.rate.change > 0 ? <TrendingUp className="w-3 h-3" /> : 
                         rate.rate.change < 0 ? <TrendingDown className="w-3 h-3" /> : 
                         <Minus className="w-3 h-3" />}
                        {rate.rate.change > 0 ? '+' : ''}{rate.rate.change.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-xs text-muted-foreground">
                    {rate.rate?.date && new Date(rate.rate.date).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RateCard({ 
  rate, 
  isSelected, 
  onClick 
}: { 
  rate: RateData
  isSelected: boolean
  onClick: () => void 
}) {
  const change = rate.rate?.change || 0

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg border p-4 cursor-pointer transition-all hover:border-primary/50",
        isSelected ? "border-primary ring-1 ring-primary/20" : "border-border"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{rate.flag}</span>
          <div>
            <p className="font-medium text-sm">{rate.country}</p>
            <p className="text-[10px] text-muted-foreground">{rate.currency}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{rate.rate?.value.toFixed(2)}%</p>
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] font-medium justify-end",
            change > 0 ? "text-red-400" : change < 0 ? "text-green-400" : "text-muted-foreground"
          )}>
            {change > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : 
             change < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : 
             <Minus className="w-2.5 h-2.5" />}
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>
      </div>
      
      {/* Mini sparkline */}
      {rate.chart.length > 0 && (
        <div className="h-8 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rate.chart}>
              <defs>
                <linearGradient id={`grad-${rate.code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                fill={`url(#grad-${rate.code})`}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
