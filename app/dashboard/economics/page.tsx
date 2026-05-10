'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Indicator {
  value: number | null
  date: string
  change: number
}

interface EconomicsData {
  indicators: {
    growth: Record<string, Indicator | null>
    sentiment: Record<string, Indicator | null>
    employment: Record<string, Indicator | null>
    inflation: Record<string, Indicator | null>
    rates: Record<string, Indicator | null>
  }
  charts: Record<string, Array<{ date: string; value: number }>>
}

function IndicatorCard({
  title,
  value,
  change,
  unit = '%',
  chart,
  positive = true,
  date,
}: {
  title: string
  value: number | null
  change: number
  unit?: string
  chart?: Array<{ date: string; value: number }>
  positive?: boolean
  date?: string
}) {
  if (value === null || value === undefined) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground mb-2">{title}</p>
        <p className="text-xs text-muted-foreground italic">AUCUNE DONNÉE</p>
      </div>
    )
  }

  const isPositive = change >= 0

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted-foreground flex-1">{title}</p>
        {date && <p className="text-[10px] text-muted-foreground">{date}</p>}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold">{value.toFixed(2)}{unit}</span>
        <span
          className={cn(
            'text-xs font-semibold flex items-center gap-0.5',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{change.toFixed(2)}{unit}
        </span>
      </div>
      {chart && chart.length > 0 && (
        <div className="h-10 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                fill={`url(#grad-${title})`}
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

function ChartSection({
  title,
  data,
}: {
  title: string
  data: Array<{ date: string; value: number }>
}) {
  if (!data || data.length === 0) return null

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              stroke="rgba(255,255,255,0.3)"
            />
            <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.3)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function EconomicsPage() {
  const { t } = useI18n()
  const [data, setData] = useState<EconomicsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/economics')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError('Erreur lors du chargement des donnees economiques.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement des donnees economiques...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Économie</h1>
        <p className="text-muted-foreground text-sm">Indicateurs économiques mondiaux par pays</p>
      </div>

      {/* Growth Indicators */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Croissance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <IndicatorCard
            title="PIB reel (trimestre sur trimestre)"
            value={data.indicators.growth.gdp?.value}
            change={data.indicators.growth.gdp?.change || 0}
            date={data.indicators.growth.gdp?.date}
            unit="%"
            chart={data.charts.gdp}
          />
          <IndicatorCard
            title="Production industrielle (var. mensuelle)"
            value={data.indicators.growth.industrial_production?.value}
            change={data.indicators.growth.industrial_production?.change || 0}
            unit="%"
            chart={data.charts.industrial_production}
          />
          <IndicatorCard
            title="Ventes au detail (var. mensuelle)"
            value={data.indicators.growth.retail_sales?.value}
            change={data.indicators.growth.retail_sales?.change || 0}
            unit="%"
            chart={data.charts.retail_sales}
          />
        </div>
      </section>

      {/* Sentiment Indicators */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Sentiment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <IndicatorCard
            title="Indice de confiance des consommateurs"
            value={data.indicators.sentiment.consumer_confidence?.value}
            change={data.indicators.sentiment.consumer_confidence?.change || 0}
            date={data.indicators.sentiment.consumer_confidence?.date}
            unit=""
            chart={data.charts.consumer_confidence}
          />
          <IndicatorCard
            title="Confiance des consommateurs (PCE)"
            value={data.indicators.sentiment.pce_sentiment?.value}
            change={data.indicators.sentiment.pce_sentiment?.change || 0}
            date={data.indicators.sentiment.pce_sentiment?.date}
            unit=""
            chart={data.charts.pce_sentiment}
          />
        </div>
      </section>

      {/* Employment Indicators */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Emploi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <IndicatorCard
            title="Taux de chomage"
            value={data.indicators.employment.unemployment?.value}
            change={data.indicators.employment.unemployment?.change || 0}
            date={data.indicators.employment.unemployment?.date}
            unit="%"
            chart={data.charts.unemployment}
          />
          <IndicatorCard
            title="Emplois non-agricoles (milliers)"
            value={data.indicators.employment.nonfarm_payroll?.value}
            change={data.indicators.employment.nonfarm_payroll?.change || 0}
            date={data.indicators.employment.nonfarm_payroll?.date}
            unit="K"
            chart={data.charts.nonfarm_payroll}
          />
          <IndicatorCard
            title="Offres d'emploi JOLTS (milliers)"
            value={data.indicators.employment.jolts_openings?.value}
            change={data.indicators.employment.jolts_openings?.change || 0}
            date={data.indicators.employment.jolts_openings?.date}
            unit="K"
            chart={data.charts.jolts_openings}
          />
        </div>
      </section>

      {/* Inflation Indicators */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Inflation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <IndicatorCard
            title="Variation annuelle de l'IPC"
            value={data.indicators.inflation.cpi?.value}
            change={data.indicators.inflation.cpi?.change || 0}
            date={data.indicators.inflation.cpi?.date}
            unit="%"
            chart={data.charts.cpi}
          />
          <IndicatorCard
            title="PCE de base en glissement annuel"
            value={data.indicators.inflation.pce?.value}
            change={data.indicators.inflation.pce?.change || 0}
            date={data.indicators.inflation.pce?.date}
            unit="%"
            chart={data.charts.pce}
          />
          <IndicatorCard
            title="Indice des prix a la production"
            value={data.indicators.inflation.ppi?.value}
            change={data.indicators.inflation.ppi?.change || 0}
            date={data.indicators.inflation.ppi?.date}
            unit="%"
            chart={data.charts.ppi}
          />
        </div>
      </section>

      {/* Interest Rates */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Taux et argent</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <IndicatorCard
            title="Taux cible des fonds federaux"
            value={data.indicators.rates.fed_funds?.value}
            change={data.indicators.rates.fed_funds?.change || 0}
            date={data.indicators.rates.fed_funds?.date}
            unit="%"
            chart={data.charts.fed_funds}
          />
          <IndicatorCard
            title="Rendement des bons du Tresor 10 ans"
            value={data.indicators.rates.treasury_10y?.value}
            change={data.indicators.rates.treasury_10y?.change || 0}
            date={data.indicators.rates.treasury_10y?.date}
            unit="%"
            chart={data.charts.treasury_10y}
          />
        </div>
      </section>
    </div>
  )
}
