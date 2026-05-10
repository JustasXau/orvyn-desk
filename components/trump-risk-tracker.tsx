"use client"

import { AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, Filter, Bell, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface TrumpStatement {
  id: string
  time: string
  timestamp: number
  statement: string
  source: string
  sourceUrl: string
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  affectedInstruments: { symbol: string; direction: 'up' | 'down' | 'mixed' }[]
  category: 'tariff' | 'fed' | 'trade' | 'geopolitical' | 'economic' | 'general'
}

interface TrumpData {
  riskScore: number
  riskLevel: string
  description: string
  generatedAt: string
  statements: TrumpStatement[]
  lastUpdate: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORY_LABELS: Record<string, string> = {
  tariff: 'Tarifs',
  fed: 'Fed/Taux',
  trade: 'Commerce',
  geopolitical: 'Geopolitique',
  economic: 'Economie',
  general: 'General'
}

const CATEGORY_COLORS: Record<string, string> = {
  tariff: 'bg-red-500/20 text-red-400',
  fed: 'bg-blue-500/20 text-blue-400',
  trade: 'bg-green-500/20 text-green-400',
  geopolitical: 'bg-purple-500/20 text-purple-400',
  economic: 'bg-amber-500/20 text-amber-400',
  general: 'bg-gray-500/20 text-gray-400'
}

export function TrumpRiskTracker() {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showAllStatements, setShowAllStatements] = useState(false)
  const { t } = useI18n()
  
  const { data, isLoading, mutate } = useSWR<TrumpData>('/api/trump', fetcher, {
    refreshInterval: 120000, // Refresh every 2 minutes
    revalidateOnFocus: true,
  })

  const score = data?.riskScore || 0
  const description = data?.description || 'Chargement des donnees...'
  const riskLevel = data?.riskLevel || 'Analyse en cours'
  const generatedAt = data?.generatedAt || ''
  const statements = data?.statements || []
  
  // Filter statements
  const filteredStatements = statements.filter(s => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'high') return s.impactLevel === 'HIGH'
    return s.category === activeFilter
  })
  
  const displayStatements = showAllStatements ? filteredStatements : filteredStatements.slice(0, 5)
  
  const getScoreColor = (score: number) => {
    if (score <= 30) return "text-success"
    if (score <= 60) return "text-warning"
    return "text-destructive"
  }

  const getRiskBadgeColor = (level: string) => {
    if (level.toLowerCase().includes("faible") || level.toLowerCase().includes("low")) return "text-success bg-success/10"
    if (level.toLowerCase().includes("modere") || level.toLowerCase().includes("medium")) return "text-warning bg-warning/10"
    return "text-destructive bg-destructive/10"
  }

  const getImpactBadge = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    const config = {
      HIGH: { label: 'FORT', color: 'bg-red-500 text-white', dot: 'bg-red-500' },
      MEDIUM: { label: 'MOYEN', color: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-500' },
      LOW: { label: 'FAIBLE', color: 'bg-gray-500/20 text-gray-400', dot: 'bg-gray-500' }
    }
    return config[level]
  }

  const getDirectionIcon = (direction: string) => {
    if (direction === 'up') return <TrendingUp className="w-3 h-3" />
    if (direction === 'down') return <TrendingDown className="w-3 h-3" />
    return <Minus className="w-3 h-3" />
  }

  const getDirectionColor = (direction: string) => {
    if (direction === 'up') return 'text-success'
    if (direction === 'down') return 'text-destructive'
    return 'text-muted-foreground'
  }

  // Check for recent high impact statements (last hour)
  const recentHighImpact = statements.filter(s => 
    s.impactLevel === 'HIGH' && s.timestamp > Date.now() - 3600000
  ).length

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header with LIVE badge */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-foreground">{t('trumpRiskProb')}</h3>
            {recentHighImpact > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                LIVE
              </span>
            )}
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", (isLoading || isRefreshing) && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Risk Score Section */}
        <div className="flex gap-6 mb-6">
          {/* Score Circle */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="var(--secondary)" strokeWidth="8" />
              <circle
                cx="56" cy="56" r="48" fill="none"
                stroke={score <= 30 ? "var(--success)" : score <= 60 ? "var(--warning)" : "var(--destructive)"}
                strokeWidth="8" strokeDasharray={`${(score / 100) * 301.6} 301.6`} strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('score')}</span>
            </div>
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ${getRiskBadgeColor(riskLevel)}`}>
                <Zap className="w-3.5 h-3.5" />
                {riskLevel}
              </span>
              {generatedAt && (
                <span className="text-xs text-muted-foreground">Mis a jour: {generatedAt}</span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'Tout' },
            { id: 'high', label: 'Fort Impact' },
            { id: 'tariff', label: 'Tarifs' },
            { id: 'fed', label: 'Fed/Taux' },
            { id: 'trade', label: 'Commerce' },
            { id: 'geopolitical', label: 'Geopolitique' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Statements List */}
        <div className="space-y-3">
          {displayStatements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {isLoading ? 'Chargement...' : 'Aucune declaration trouvee pour ce filtre'}
            </div>
          ) : (
            displayStatements.map((statement) => {
              const impactBadge = getImpactBadge(statement.impactLevel)
              
              return (
                <div 
                  key={statement.id} 
                  className={cn(
                    "p-4 rounded-xl border transition-all hover:shadow-md",
                    statement.impactLevel === 'HIGH' 
                      ? 'bg-red-500/5 border-red-500/30' 
                      : statement.impactLevel === 'MEDIUM'
                      ? 'bg-orange-500/5 border-orange-500/20'
                      : 'bg-muted/30 border-border'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{statement.time}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", impactBadge.color)}>
                        {impactBadge.label}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", CATEGORY_COLORS[statement.category])}>
                        {CATEGORY_LABELS[statement.category]}
                      </span>
                    </div>
                    <a 
                      href={statement.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                    >
                      {statement.source}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  {/* Statement */}
                  <p className="text-sm text-foreground mb-3 leading-relaxed">{statement.statement}</p>
                  
                  {/* Affected Instruments */}
                  {statement.affectedInstruments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Instruments:</span>
                      {statement.affectedInstruments.map(inst => (
                        <span 
                          key={inst.symbol}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium",
                            inst.direction === 'up' ? 'bg-success/10 text-success' :
                            inst.direction === 'down' ? 'bg-destructive/10 text-destructive' :
                            'bg-muted text-muted-foreground'
                          )}
                        >
                          {inst.symbol}
                          {getDirectionIcon(inst.direction)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Show More Button */}
        {filteredStatements.length > 5 && (
          <button
            onClick={() => setShowAllStatements(!showAllStatements)}
            className="w-full mt-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            {showAllStatements 
              ? 'Voir moins' 
              : `Voir tout (${filteredStatements.length} declarations)`
            }
          </button>
        )}

        {/* Stats Footer */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {statements.filter(s => s.impactLevel === 'HIGH').length} fort impact
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              {statements.filter(s => s.impactLevel === 'MEDIUM').length} moyen
            </span>
          </div>
          <span>
            {statements.length} sources analysees
          </span>
        </div>
      </div>
    </div>
  )
}
