'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ExchangeRate {
  [key: string]: number
}

export function ForexRates() {
  const [rates, setRates] = useState<ExchangeRate>({})
  const [base, setBase] = useState('USD')
  const [loading, setLoading] = useState(true)

  const majorPairs = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch(`/api/exchange-rates?base=${base}`)
        const json = await res.json()
        setRates(json.merged_rates || {})
      } catch (error) {
        console.error('[v0] Error fetching rates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
    const interval = setInterval(fetchRates, 3600000)
    return () => clearInterval(interval)
  }, [base])

  if (loading) return <div className="text-center py-8">Chargement des taux...</div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        {['USD', 'EUR', 'GBP'].map((curr) => (
          <button
            key={curr}
            onClick={() => {
              setBase(curr)
              setLoading(true)
            }}
            className={cn(
              'px-4 py-2 rounded-lg border transition-colors',
              base === curr ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {curr}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {majorPairs.map((pair) => {
          const rate = rates[pair]
          if (!rate) return null
          return (
            <div key={pair} className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{base}/{pair}</p>
              <p className="text-xl font-bold text-primary">{rate.toFixed(4)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
