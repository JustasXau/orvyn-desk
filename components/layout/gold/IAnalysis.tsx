'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  prices: any
  bias: any
  news: any[]
}

export function IAnalysis({ prices, bias, news }: Props) {
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  const fetchAnalysis = async () => {
    if (!prices || !bias) return
    try {
      setLoading(true)
      setError(false)

      const res = await fetch('/api/bulk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices, bias, news }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAnalysis(data.analysis ?? '')
    } catch {
      setError(true)
      setAnalysis('Analyse indisponible — données techniques actives.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
    const interval = setInterval(fetchAnalysis, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [prices?.XAUUSD?.price, bias?.swing?.score])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[#7c3aed]">✨</span>
        <span className="text-sm font-semibold text-[#f1f5f9]">Analyse IA</span>
        {!loading && (
          <button
            onClick={fetchAnalysis}
            className="ml-auto text-xs text-[#8a8a8a] hover:text-white transition-colors"
          >
            ↻ Actualiser
          </button>
        )}
      </div>

      <div className={cn(
        'rounded-lg p-4 border',
        error
          ? 'border-red-400/30 bg-red-400/10'
          : 'border-[#1f2937] bg-[#0f172a]'
      )}>
        {loading ? (
          <div className="flex items-center gap-2 text-[#8a8a8a]">
            <div className="w-3 h-3 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Analyse en cours...</span>
          </div>
        ) : (
          <p className="tex