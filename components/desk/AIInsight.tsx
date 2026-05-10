'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface AIInsightProps {
  pairId: string
}

export function AIInsight({ pairId }: AIInsightProps) {
  const [refresh, setRefresh] = useState(0)

  const { data, isLoading, mutate } = useSWR(
    `/api/desk/${pairId}/insight?r=${refresh}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const handleRefresh = () => {
    setRefresh(r => r + 1)
    mutate()
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-300 uppercase tracking-wider">Aperçu IA — ORVYN</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 rounded bg-zinc-800 animate-pulse" style={{ width: `${70 + i * 10}%` }} />
          ))}
        </div>
      ) : data?.insight ? (
        <p className="text-xs text-zinc-300 leading-relaxed">{data.insight}</p>
      ) : (
        <p className="text-xs text-zinc-500 italic">Analyse IA indisponible</p>
      )}
    </div>
  )
}
