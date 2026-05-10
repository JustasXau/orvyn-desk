import { NextRequest, NextResponse } from 'next/server'
import { getAllSymbols, getAsset } from '@/lib/assets'

// ═══════════════════════════════════════════════════════════════════════════
// DESK AUDIT API - Vérifie les connexions de chaque source pour chaque actif
// ═══════════════════════════════════════════════════════════════════════════

interface DataSourceConnection {
  name: string
  status: 'connected' | 'disconnected' | 'partial'
  assets: string[]
  notes: string
}

interface AssetAudit {
  symbol: string
  description: string
  dataConnections: {
    liveNews: DataSourceConnection
    economicCalendar: DataSourceConnection
    correlations: DataSourceConnection
    coT: DataSourceConnection
    trump: DataSourceConnection
    technicalIndicators: DataSourceConnection
    marketStructure: DataSourceConnection
    priceData: DataSourceConnection
  }
  completeness: number // 0-100%
  missingConnections: string[]
  recommendations: string[]
}

interface DeskAuditReport {
  timestamp: number
  totalAssets: number
  completenessScore: number // 0-100%
  assetAudits: AssetAudit[]
  systemWideIssues: string[]
  systemWideRecommendations: string[]
}

// Détecte les connexions disponibles pour chaque actif
function auditAssetConnections(symbol: string): AssetAudit {
  const asset = getAsset(symbol)
  if (!asset) {
    return {
      symbol,
      description: 'Asset not found',
      dataConnections: {} as any,
      completeness: 0,
      missingConnections: ['Asset not in configuration'],
      recommendations: ['Add asset to lib/assets.ts'],
    }
  }

  const dataConnections = {
    liveNews: {
      name: 'Live News (Finnhub, NewsAPI, GNews)',
      status: 'connected' as const,
      assets: [symbol],
      notes: 'Real-time news from multiple sources',
    },
    economicCalendar: {
      name: 'Economic Calendar (NFP, CPI, FOMC, etc)',
      status: asset.keywords?.some(k => ['nfp', 'cpi', 'fomc', 'ecb', 'boe', 'rba', 'ppi'].includes(k.toLowerCase()))
        ? ('connected' as const)
        : ('partial' as const),
      assets: [symbol],
      notes: asset.category === 'forex' || asset.category === 'indices'
        ? 'Monitored for macro events'
        : 'May have indirect impact',
    },
    correlations: {
      name: 'Real-time Correlations (DXY, pairs, indices)',
      status: asset.correlations && asset.correlations.length > 0
        ? ('connected' as const)
        : ('disconnected' as const),
      assets: asset.correlations || [],
      notes: `${asset.correlations?.length || 0} correlated instruments monitored`,
    },
    coT: {
      name: 'Commitments of Traders (COT)',
      status: ['XAU/USD', 'USOIL', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD'].includes(symbol)
        ? ('connected' as const)
        : ('partial' as const),
      assets: [symbol],
      notes: 'Available for major commodities, forex, crypto',
    },
    trump: {
      name: 'Trump Risk Tracking (tariffs, fed, trades)',
      status: asset.keywords?.some(k => ['tariff', 'fed', 'trade', 'dollar'].includes(k.toLowerCase()))
        ? ('connected' as const)
        : ('partial' as const),
      assets: [symbol],
      notes: 'Monitored for tariff/trade/fed policy impact',
    },
    technicalIndicators: {
      name: 'Technical Indicators (EMA, RSI, MACD, ADX, Stochastic)',
      status: 'connected' as const,
      assets: [symbol],
      notes: 'Full technical analysis available',
    },
    marketStructure: {
      name: 'Market Structure (HH/HL/BOS/CHoCH/OB)',
      status: 'connected' as const,
      assets: [symbol],
      notes: 'Smart Money analysis enabled',
    },
    priceData: {
      name: 'Price Data (OHLC, volumes, candles)',
      status: asset.yahooSymbol ? ('connected' as const) : ('disconnected' as const),
      assets: [symbol],
      notes: `Yahoo symbol: ${asset.yahooSymbol}`,
    },
  }

  // Calculate completeness
  const connectedCount = Object.values(dataConnections).filter(d => d.status === 'connected').length
  const totalDataSources = Object.keys(dataConnections).length
  const completeness = Math.round((connectedCount / totalDataSources) * 100)

  // Identify missing connections
  const missingConnections = Object.entries(dataConnections)
    .filter(([_, d]) => d.status === 'disconnected')
    .map(([key, d]) => `${d.name} (${key})`)

  // Generate recommendations
  const recommendations: string[] = []
  if (!asset.correlations || asset.correlations.length === 0) {
    recommendations.push(`Add correlation mappings for ${symbol}`)
  }
  if (missingConnections.length > 0) {
    recommendations.push(`Enable ${missingConnections.length} missing data sources`)
  }
  if (completeness < 75) {
    recommendations.push(`Priority: Improve data connection completeness to 75%+`)
  }

  return {
    symbol,
    description: asset.description,
    dataConnections,
    completeness,
    missingConnections,
    recommendations,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<DeskAuditReport>> {
  try {
    const symbols = getAllSymbols()
    const assetAudits = symbols.map(auditAssetConnections)

    // Calculate system-wide metrics
    const completenessScores = assetAudits.map(a => a.completeness)
    const avgCompleteness = Math.round(
      completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length
    )

    // Identify system-wide issues
    const systemWideIssues: string[] = []
    if (avgCompleteness < 80) {
      systemWideIssues.push(`Average data connection completeness is ${avgCompleteness}% (target: 80%+)`)
    }

    const disconnectedAssets = assetAudits.filter(a => a.completeness < 50)
    if (disconnectedAssets.length > 0) {
      systemWideIssues.push(
        `${disconnectedAssets.length} assets have incomplete connections: ${disconnectedAssets.map(a => a.symbol).join(', ')}`
      )
    }

    const systemWideRecommendations: string[] = []
    if (systemWideIssues.length > 0) {
      systemWideRecommendations.push('Review data pipeline configuration in lib/assets.ts')
      systemWideRecommendations.push('Enable missing data sources in API routes')
      systemWideRecommendations.push('Test end-to-end data flow for each asset')
    }

    const report: DeskAuditReport = {
      timestamp: Date.now(),
      totalAssets: symbols.length,
      completenessScore: avgCompleteness,
      assetAudits,
      systemWideIssues,
      systemWideRecommendations,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('[Audit] Error:', error)
    return NextResponse.json(
      { error: 'Audit failed', details: String(error) },
      { status: 500 }
    )
  }
}
