'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface MetalData {
  symbol: string
  name: string
  price?: number
  unit: string
  currency: string
  error?: string
}

interface MetalsPricesProps {
  compact?: boolean
}

export function MetalsPrices({ compact = false }: MetalsPricesProps) {
  const [metals, setMetals] = useState<Record<string, MetalData>>({})
  const [charts, setCharts] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetals() {
      try {
        const res = await fetch('/api/metals')
        if (!res.ok) throw new Error('Failed to fetch metals')
        const data = await res.json()
        setMetals(data.metals)
        setCharts(data.charts)
      } catch (err) {
        setError('Erreur lors du chargement des métaux')
        console.error('[v0] Metals fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetals()
    const interval = setInterval(fetchMetals, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="text-muted-foreground text-sm">Chargement des métaux...</div>
  }

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>
  }

  const metalKeys = Object.keys(metals).filter(k => !metals[k].error)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">Métaux Précieux</h2>
      
      <div className={cn(
        'grid gap-3',
        compact ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'
      )}>
        {metalKeys.map(key => {
          const metal = metals[key]
          const chartData = charts[key] || []
          const lastPrice = chartData[chartData.length - 1]?.value
          const firstPrice = chartData[0]?.value
          const change = lastPrice && firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0
          const isUp = change >= 0

          return (
            <div
              key={key}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {metal.symbol}
                  </p>
                  <p className="text-sm text-foreground">{metal.name}</p>
                </div>
              </div>

              {metal.price !== undefined && (
                <>
                  <p className="text-xl font-bold text-foreground mb-1">
                    {metal.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">{metal.unit}</p>

                  <div className={cn(
                    'flex items-center gap-1 mb-3',
                    isUp ? 'text-green-500' : 'text-red-500'
                  )}>
                    {isUp ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-semibold">
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </div>

                  {chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height={40}>
                      <AreaChart data={chartData}>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={isUp ? '#22c55e' : '#ef4444'}
                          fill={isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
