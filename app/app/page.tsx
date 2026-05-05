'use client'

import { useEffect, useState } from 'react'
import { timeAgo } from '@/lib/utils'
import { GoldNews } from '@/lib/types'

export default function NewsPage() {
  const [news, setNews]       = useState<GoldNews[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all')

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/news')
        const data = await res.json()
        setNews(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('News error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'all'
    ? news
    : news.filter(n => n.goldImpact === filter)

  const impactColor = (impact: string) =>
    impact === 'bullish' ? 'text-green-400 bg-green-400/10 border-green-400/30' :
    impact === 'bearish' ? 'text-red-400 bg-red-400/10 border-red-400/30' :
    'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'

  const impactLabel = (impact: string) =>
    impact === 'bullish' ? '📈 Haussier' :
    impact === 'bearish' ? '📉 Baissier' : '➖ Neutre'

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Fil d'actualité Gold</h1>
        <p className="text-sm text-[#8a8a8a]">News filtrées et impactant XAU/USD</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'bullish', 'bearish', 'neutral'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#7c3aed] text-white'
                : 'bg-[#1e293b] text-[#8a8a8a] hover:text-white border border-[#1f2937]'
            }`}
          >
            {f === 'all' ? 'Tout' : f === 'bullish' ? 'Haussier' : f === 'bearish' ? 'Baissier' : 'Neutre'}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#8a8a8a] self-center">
          {filtered.length} articles
        </span>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#334155] rounded w-1/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-[#1e293b] rounded-xl p-8 text-center text-[#8a8a8a]">
            Aucune news correspondante
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="bg-[#1e293b] rounded-xl p-4 border border-[#1f2937] hover:border-[#334155] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-white hover:text-[#7c3aed] transition-colors line-clamp-2"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#8a8a8a]">
                    <span>{item.source}</span>
                    <span>·</span>
                    <span>{timeAgo(item.publishedAt)}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${impactColor(item.goldImpact)}`}>
                  {impactLabel(item.goldImpact)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}