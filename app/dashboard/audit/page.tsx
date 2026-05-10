'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, XCircle, Zap, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssetAudit {
  symbol: string
  description: string
  completeness: number
  missingConnections: string[]
  recommendations: string[]
  dataConnections: Record<string, any>
}

interface DeskAuditReport {
  timestamp: number
  totalAssets: number
  completenessScore: number
  assetAudits: AssetAudit[]
  systemWideIssues: string[]
  systemWideRecommendations: string[]
}

export default function DeskAuditPage() {
  const [auditData, setAuditData] = useState<DeskAuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

  useEffect(() => {
    fetchAudit()
  }, [])

  async function fetchAudit() {
    try {
      setLoading(true)
      const res = await fetch('/api/desk-audit')
      if (res.ok) {
        const data = await res.json()
        setAuditData(data)
      }
    } catch (error) {
      console.error('Audit fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Audit du desk en cours...</p>
        </div>
      </div>
    )
  }

  if (!auditData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Erreur lors de l&apos;audit</p>
          <button
            onClick={fetchAudit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const getStatusIcon = (completeness: number) => {
    if (completeness >= 80) return <CheckCircle2 className="w-5 h-5 text-green-500" />
    if (completeness >= 50) return <AlertCircle className="w-5 h-5 text-yellow-500" />
    return <XCircle className="w-5 h-5 text-red-500" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Audit du Desk ORVYN</h1>
          <p className="text-muted-foreground">
            Vérification complète des connexions de données pour chaque actif
          </p>
        </div>

        {/* System Score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Score Global de Complétude</p>
            <p className={cn('text-5xl font-bold', getScoreColor(auditData.completenessScore))}>
              {auditData.completenessScore}%
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Actifs Audités</p>
            <p className="text-5xl font-bold text-primary">{auditData.totalAssets}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Problèmes Détectés</p>
            <p className="text-5xl font-bold text-destructive">{auditData.systemWideIssues.length}</p>
          </div>
        </div>

        {/* System-Wide Issues */}
        {auditData.systemWideIssues.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Problèmes Système
            </h3>
            <ul className="space-y-2">
              {auditData.systemWideIssues.map((issue, idx) => (
                <li key={idx} className="text-sm text-destructive/80 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {auditData.systemWideRecommendations.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-blue-400 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Recommandations
            </h3>
            <ul className="space-y-2">
              {auditData.systemWideRecommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Asset Details */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Détails par Actif</h2>
          
          {auditData.assetAudits.map((asset) => (
            <div
              key={asset.symbol}
              className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Summary Row */}
              <button
                onClick={() => setExpandedAsset(expandedAsset === asset.symbol ? null : asset.symbol)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  {getStatusIcon(asset.completeness)}
                  <div>
                    <p className="font-semibold">{asset.symbol}</p>
                    <p className="text-xs text-muted-foreground">{asset.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn('text-sm font-bold', getScoreColor(asset.completeness))}>
                    {asset.completeness}%
                  </span>
                  <span className="text-muted-foreground">
                    {expandedAsset === asset.symbol ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {/* Details */}
              {expandedAsset === asset.symbol && (
                <div className="bg-muted/30 p-4 border-t border-border space-y-4">
                  {/* Data Connections */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Sources de Données</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(asset.dataConnections).map(([key, connection]: [string, any]) => (
                        <div
                          key={key}
                          className={cn(
                            'p-2 rounded text-xs',
                            connection.status === 'connected'
                              ? 'bg-green-500/10 text-green-300'
                              : connection.status === 'partial'
                              ? 'bg-yellow-500/10 text-yellow-300'
                              : 'bg-red-500/10 text-red-300'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {connection.status === 'connected' && <CheckCircle2 className="w-3 h-3" />}
                            {connection.status === 'partial' && <AlertCircle className="w-3 h-3" />}
                            {connection.status === 'disconnected' && <XCircle className="w-3 h-3" />}
                            <span>{connection.name}</span>
                          </div>
                          <p className="text-xs opacity-75 mt-1">{connection.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Connections */}
                  {asset.missingConnections.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-yellow-300">Connexions Manquantes</p>
                      <ul className="space-y-1">
                        {asset.missingConnections.map((missing, idx) => (
                          <li key={idx} className="text-xs text-yellow-200 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-yellow-300 mt-1.5 flex-shrink-0" />
                            {missing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {asset.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-blue-300">Recommandations</p>
                      <ul className="space-y-1">
                        {asset.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-xs text-blue-200 flex items-start gap-2">
                            <Zap className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchAudit}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-colors"
        >
          Actualiser l&apos;audit
        </button>
      </div>
    </div>
  )
}
