'use client'

import { useEffect, useState } from 'react'
import { PriceCard } from '@/components/gold/PriceCard'
import { BiasDisplay } from '@/components/gold/BiasDisplay'
import { CorrelationsGrid } from '@/components/gold/CorrelationsGrid'
import { IAnalysis } from '@/components/gold/IAnalysis'
import { ReportButton } from '@/components/gold/ReportButton'

export default function DashboardPage() {
  const [prices, setPrices]     = useState<any>(null)
  const [bias, setBias]         = useState<any>(null)
  const [news, setNews]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  const fetchAll = async () => {
    try {
      const [pricesRes, biasRes, newsRes] = await Promise.all([
        fetch('/api/prices').then(r => r.json()),
        fetch('/api/bias').then(r => r.json()),
        fetch('/api/news').then(r => r.json()),
      ])

      setPrices(pricesRes)
      setBias(biasRes)
      setNews(Array.isArray(newsRes) ? newsRes : [])
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orvyn Desk</h1>
          <p className="text-sm text-[#8a8a8a]">Analyse du biais Gold — XAU/USD</p>
        </div>
        <button
          onClick={fetchAll}
          className="text-xs text-[#8a8a8a] hover:text-white transition-colors flex items-center gap-1"
        >
          ↻ Actualiser
        </button>
      </div>

      {/* Prix XAU/USD */}
      <PriceCard priceData={prices?.XAUUSD ?? null} />

      {/* Bias Swing + Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wide">
              Swing Trading
            </span>
            <span className="text-xs text-[#8a8a8a]">Weekly · Daily · H4</span>
          </div>
          <BiasDisplay bias={bias?.swing ?? null} type="swing" />
        </div>

        <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wide">
              Day Trading
            </span>
            <span className="text-xs text-[#8a8a8a]">H4 · H1 · M15</span>
          </div>
          <BiasDisplay bias={bias?.day ?? null} type="day" />
        </div>
      </div>

      {/* Corrélations */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
        <h2 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-4">
          Corrélations Gold
        </h2>
        <CorrelationsGrid prices={prices} />
      </div>

      {/* Analyse IA */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
        <IAnalysis prices={prices} bias={bias} news={news} />
      </div>

      {/* Rapport */}
      <ReportButton prices={prices} bias={bias} news={news} />

    </div>
  )
}