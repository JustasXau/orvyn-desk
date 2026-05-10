'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  date: string
  chart: Array<{ date: string; value: number }>
}

export function StocksCommodities() {
  const [data, setData] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/twelve-data?symbols=AAPL,MSFT,GOOGL,TSLA')
        const json = await res.json()
        setData(json.data || [])
      } catch (error) {
        console.error('[v0] Error fetching stocks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-center py-8">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((stock) => (
          <div key={stock.symbol} className="bg-card border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{stock.symbol}</h3>
                <p className="text-2xl font-bold text-primary">${stock.price.toFixed(2)}</p>
              </div>
              <div className={cn('text-right', stock.change >= 0 ? 'text-green-500' : 'text-red-500')}>
                <div className="flex items-center gap-1 justify-end">
                  {stock.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}</span>
                </div>
                <p className="text-sm">{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</p>
              </div>
            </div>
            {stock.chart.length > 0 && (
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={stock.chart}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.1}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
