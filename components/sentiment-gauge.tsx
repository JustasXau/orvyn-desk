"use client"

import { Info, RefreshCw } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface SentimentData {
  score: number
  description: string
  label: string
  factors: { label: string; percentage: number; color: string }[]
}

export function SentimentGauge() {
  const { t } = useI18n()
  
  // Fetch unified data for main indices to calculate overall sentiment
  const { data: us500Data } = useSWR<{ sentiment: number; swing: { bias: string; confidence: number }; day: { bias: string; confidence: number } }>(
    '/api/unified-data?symbol=US500',
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  )
  
  const { data: us100Data } = useSWR<{ sentiment: number; swing: { bias: string }; day: { bias: string } }>(
    '/api/unified-data?symbol=US100',
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )
  
  const { data: dxyData } = useSWR<{ sentiment: number; swing: { bias: string }; day: { bias: string } }>(
    '/api/unified-data?symbol=DXY',
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )
  
  const isLoading = !us500Data
  
  // Calculate overall sentiment from unified data
  const calculateOverallSentiment = (): SentimentData => {
    const scores: number[] = []
    if (us500Data?.sentiment) scores.push(us500Data.sentiment)
    if (us100Data?.sentiment) scores.push(us100Data.sentiment)
    
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 50
    
    // Adjust for DXY (inverse correlation with risk)
    let finalScore = avgScore
    if (dxyData?.swing?.bias === 'bull') {
      finalScore = Math.max(20, finalScore - 5) // Strong dollar = less risk appetite
    } else if (dxyData?.swing?.bias === 'bear') {
      finalScore = Math.min(80, finalScore + 5) // Weak dollar = more risk appetite
    }
    
    // Generate description based on actual data
    let description = ""
    if (finalScore >= 65) {
      description = "Le sentiment de marche est positif. Les indices US affichent une tendance haussiere avec un appetit pour le risque eleve."
    } else if (finalScore >= 55) {
      description = "Optimisme prudent sur les marches. Les signaux techniques restent favorables avec une volatilite moderee."
    } else if (finalScore >= 45) {
      description = "Sentiment neutre. Les forces acheteuses et vendeuses s'equilibrent, les marches attendent de nouveaux catalyseurs."
    } else if (finalScore >= 35) {
      description = "Prudence sur les marches. Les flux se dirigent vers les valeurs refuges, la pression vendeuse augmente."
    } else {
      description = "Aversion au risque marquee. Les indices sous pression, l'or et le dollar beneficient des flux de securite."
    }
    
    // Build factors from real data
    const factors = []
    
    if (us500Data) {
      const s500Conf = us500Data.swing?.confidence || 50
      factors.push({
        label: `S&P 500 - ${us500Data.swing?.bias === 'bull' ? 'Haussier' : us500Data.swing?.bias === 'bear' ? 'Baissier' : 'Neutre'}`,
        percentage: s500Conf,
        color: us500Data.swing?.bias === 'bull' ? '#22c55e' : us500Data.swing?.bias === 'bear' ? '#ef4444' : '#eab308'
      })
    }
    
    if (us100Data) {
      factors.push({
        label: `NASDAQ - ${us100Data.swing?.bias === 'bull' ? 'Haussier' : us100Data.swing?.bias === 'bear' ? 'Baissier' : 'Neutre'}`,
        percentage: us100Data.sentiment || 50,
        color: us100Data.swing?.bias === 'bull' ? '#22c55e' : us100Data.swing?.bias === 'bear' ? '#ef4444' : '#eab308'
      })
    }
    
    if (dxyData) {
      factors.push({
        label: `Dollar (DXY) - ${dxyData.swing?.bias === 'bull' ? 'Fort' : dxyData.swing?.bias === 'bear' ? 'Faible' : 'Stable'}`,
        percentage: dxyData.sentiment || 50,
        color: dxyData.swing?.bias === 'bull' ? '#f97316' : dxyData.swing?.bias === 'bear' ? '#22c55e' : '#eab308'
      })
    }
    
    // Fill with placeholder if not enough data
    while (factors.length < 3) {
      factors.push({ label: 'Chargement...', percentage: 50, color: '#6b7280' })
    }
    
    return {
      score: finalScore,
      description,
      label: finalScore >= 60 ? 'Risk On' : finalScore <= 40 ? 'Risk Off' : 'Neutre',
      factors
    }
  }
  
  const sentimentData = calculateOverallSentiment()
  const score = sentimentData.score
  const description = sentimentData.description
  const factors = sentimentData.factors
  
  const getSentimentInfo = (score: number) => {
    if (score <= 25) return { label: t('bearish'), color: "text-destructive", badge: "bg-destructive/20" }
    if (score <= 40) return { label: t('bearish'), color: "text-warning", badge: "bg-warning/20" }
    if (score <= 60) return { label: t('neutralOutlook'), color: "text-warning", badge: "bg-warning/20" }
    if (score <= 75) return { label: t('bullish'), color: "text-success", badge: "bg-success/20" }
    return { label: t('bullish'), color: "text-success", badge: "bg-success/20" }
  }

  const sentiment = getSentimentInfo(score)
  const rotation = (score / 100) * 180 - 90

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">{t('sentimentIndex')}</h3>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className={`px-3 py-1 text-xs font-medium ${sentiment.badge} ${sentiment.color} rounded-full border border-current/20`}>
          {score >= 60 ? t('riskOn') : score <= 40 ? t('flightToSafety') : 'Equilibre'}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex gap-8">
        {/* Gauge */}
        <div className="relative w-48 h-28">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <path d="M 20 100 A 80 80 0 0 1 60 35" fill="none" stroke="var(--destructive)" strokeWidth="16" strokeLinecap="round" />
            <path d="M 65 32 A 80 80 0 0 1 100 20" fill="none" stroke="var(--warning)" strokeWidth="16" strokeLinecap="round" />
            <path d="M 105 20 A 80 80 0 0 1 140 32" fill="none" stroke="var(--warning)" strokeWidth="16" strokeLinecap="round" />
            <path d="M 145 35 A 80 80 0 0 1 180 100" fill="none" stroke="var(--success)" strokeWidth="16" strokeLinecap="round" />
          </svg>
          
          <div 
            className="absolute bottom-2 left-1/2 origin-bottom"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transition: 'transform 1s ease-out' }}
          >
            <div className="w-1 h-16 bg-foreground rounded-full shadow-lg" />
          </div>
          
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-foreground rounded-full shadow-lg" />
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
            <span className="text-4xl font-bold text-foreground">{score}</span>
          </div>
          
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${sentiment.badge} ${sentiment.color}`}>
              {sentiment.label}
            </span>
          </div>
        </div>

        {/* Factors */}
        <div className="flex-1 space-y-3">
          {factors.map((factor, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate pr-4">{factor.label}</span>
                <span className="text-foreground font-medium shrink-0">{factor.percentage}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${factor.percentage}%`, backgroundColor: factor.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


