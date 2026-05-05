'use client'

import { useEffect, useState } from 'react'
import { timeAgo } from '@/lib/utils'
import { GoldNews } from '@/lib/types'

export default function GeopoliticsPage() {
  const [news, setNews]       = useState<GoldNews[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/news')
        const data: GoldNews[] = await res.json()

        const geoKeywords = [
          'war', 'guerre', 'sanctions', 'trump', 'conflict',
          'tension', 'geopolit', 'iran', 'russia', 'ukraine',
          'middle east', 'nuclear', 'missile', 'attack',
        ]

        const filtered = data.filter(item =>
          geoKeywords.some(kw =>
            item.title.toLowerCase().includes(kw) ||
            item.summary.toLowerCase().includes(kw)
          )
        )

        setNews(filtered)
      } catch (err) {
        console.error('Geopolitics error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
        <h1 className="text-2xl font-bold text-white">Suivi Géopolitique</h1>
        <p className="text-sm text-[#8a8a8a]">
          Événements géopolitiques impactant le gold comme safe haven
        </p>
      </div>

      {/* Score risque */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8a8a8a] mb-1">Risque géopolitique actuel</p>
            <p className="text-xs text-[#8a8a8a]">
              {news.length} événements détectés — impact potentiel sur XAU/USD
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              news.length > 5 ? 'text-red-400' :
              news.length > 2 ? 'text-orange-400' : 'text-green-400'
            }`}>
              {news.length > 5 ? 'ÉLEVÉ' : news.length > 2 ? 'MODÉRÉ' : 'FAIBLE'}
            </div>
            <p className="text-xs text-[#8a8a8a]">{news.length} news actives</p>
          </div>
        </div>
      </div>

      {/* Liste news */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#334155] rounded w-1/3" />
            </div>
          ))
        ) : news.length === 0 ? (
          <div className="bg-[#1e293b] rounded-xl p-8 text-center text-[#8a8a8a]">
            Aucune actualité géopolitique récente
          </div>
        ) : (
          news.map(item => (
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
                  {item.summary && (
                    <p className="text-xs text-[#8a8a8a] mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
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