"use client"

import { cn } from "@/lib/utils"
import useSWR from "swr"

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION GAUGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
// Jauge circulaire affichant le pourcentage de correlation
// Couleur dynamique: Vert (positive forte), Rouge (negative forte), Jaune/Gris (faible)
// ═══════════════════════════════════════════════════════════════════════════════

interface CorrelationGaugeProps {
  symbol: string
  correlation: number // 0-100 score
  size?: 'sm' | 'md' | 'lg'
  showImpact?: boolean
  impact?: string
}

export function CorrelationGauge({ 
  symbol, 
  correlation, 
  size = 'sm',
  showImpact = false,
  impact
}: CorrelationGaugeProps) {
  // correlation is now 0-100 score
  const score = Math.max(0, Math.min(100, correlation))
  
  // Color based on score strength: 80-100 vert, 50-79 orange, 0-49 rouge
  const getColor = () => {
    if (score >= 80) return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10' } // green - strong
    if (score >= 50) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' } // orange - moderate
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' } // red - weak
  }
  
  const colors = getColor()
  
  const dimensions = {
    sm: { width: 56, height: 56, radius: 22, strokeWidth: 3, fontSize: 'text-[10px]', labelSize: 'text-[9px]' },
    md: { width: 72, height: 72, radius: 28, strokeWidth: 4, fontSize: 'text-xs', labelSize: 'text-[10px]' },
    lg: { width: 88, height: 88, radius: 34, strokeWidth: 5, fontSize: 'text-sm', labelSize: 'text-xs' }
  }
  
  const { width, height, radius, strokeWidth, fontSize, labelSize } = dimensions[size]
  
  // Calculate the arc (using percentage of circle)
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const dashOffset = circumference - progress
  
  return (
    <div className={cn("flex flex-col items-center gap-1", showImpact && "min-w-[80px]")}>
      {/* Symbol label */}
      <span className={cn(labelSize, "text-muted-foreground font-medium truncate max-w-[60px]")}>
        {symbol}
      </span>
      
      {/* Circular gauge */}
      <div className="relative" style={{ width, height }}>
        {/* Background circle */}
        <svg width={width} height={height} className="transform -rotate-90">
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress arc */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text - score 0-100 without symbols */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(fontSize, "font-bold", colors.text)}>
            {score}
          </span>
        </div>
      </div>
      
      {/* Impact description (optional) */}
      {showImpact && impact && (
        <span className="text-[8px] text-muted-foreground text-center leading-tight max-w-[70px] line-clamp-2">
          {impact}
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC CORRELATION DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface CorrelationData {
  symbol: string
  correlation: number
  strength: 'strong' | 'moderate' | 'weak'
  direction: 'positive' | 'negative'
  impact: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Hook to fetch dynamic correlations
export function useCorrelations(symbol: string) {
  const { data, error, isLoading } = useSWR<{
    correlations: CorrelationData[]
    source: 'realtime' | 'default'
  }>(
    `/api/correlations?symbol=${encodeURIComponent(symbol)}`,
    fetcher,
    { 
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60 * 1000
    }
  )
  
  return {
    correlations: data?.correlations || [],
    source: data?.source || 'default',
    isLoading,
    error
  }
}

// Static fallback correlations (used when API unavailable)
// PRIORITY ORDER: Most economically relevant correlations first
export function getStaticCorrelations(symbol: string): CorrelationData[] {
  const defaults: Record<string, CorrelationData[]> = {
    // Gold: DXY #1, Silver #2, US10Y #3 (NO EUR/USD as primary)
    'XAU/USD': [
      { symbol: 'DXY', correlation: -78, strength: 'strong', direction: 'negative', impact: 'Dollar fort pese sur l\'or' },
      { symbol: 'XAG/USD', correlation: 85, strength: 'strong', direction: 'positive', impact: 'Metaux precieux correles' },
      { symbol: 'US10Y', correlation: -55, strength: 'moderate', direction: 'negative', impact: 'Rendements hauts pesent' },
    ],
    // Silver: Gold #1, DXY #2, Nasdaq #3
    'XAG/USD': [
      { symbol: 'XAU/USD', correlation: 85, strength: 'strong', direction: 'positive', impact: 'Metaux precieux correles' },
      { symbol: 'DXY', correlation: -72, strength: 'strong', direction: 'negative', impact: 'Dollar pese sur argent' },
      { symbol: 'US100', correlation: 45, strength: 'moderate', direction: 'positive', impact: 'Argent plus industriel' },
    ],
    // Dow: Nasdaq #1, VIX #2, S&P500 #3
    'US30': [
      { symbol: 'US100', correlation: 92, strength: 'strong', direction: 'positive', impact: 'Indices US en tandem' },
      { symbol: 'VIX', correlation: -85, strength: 'strong', direction: 'negative', impact: 'VIX haut = pression vendeuse' },
      { symbol: 'US500', correlation: 96, strength: 'strong', direction: 'positive', impact: 'Tous les indices montent' },
    ],
    // Nasdaq: Dow #1, VIX #2, S&P500 #3
    'US100': [
      { symbol: 'US30', correlation: 92, strength: 'strong', direction: 'positive', impact: 'Indices US en tandem' },
      { symbol: 'VIX', correlation: -88, strength: 'strong', direction: 'negative', impact: 'VIX haut = tech souffre' },
      { symbol: 'US500', correlation: 97, strength: 'strong', direction: 'positive', impact: 'Tous les indices montent' },
    ],
    // S&P500: Nasdaq #1, VIX #2, Dow #3
    'US500': [
      { symbol: 'US100', correlation: 97, strength: 'strong', direction: 'positive', impact: 'Indices correles' },
      { symbol: 'VIX', correlation: -90, strength: 'strong', direction: 'negative', impact: 'VIX inverse aux indices' },
      { symbol: 'US30', correlation: 96, strength: 'strong', direction: 'positive', impact: 'Tous les indices montent' },
    ],
    // DXY: EUR/USD #1, GBP/USD #2, Gold #3
    'DXY': [
      { symbol: 'EUR/USD', correlation: -95, strength: 'strong', direction: 'negative', impact: 'Inverse mecanique' },
      { symbol: 'GBP/USD', correlation: -88, strength: 'strong', direction: 'negative', impact: 'Composant DXY inverse' },
      { symbol: 'XAU/USD', correlation: -78, strength: 'strong', direction: 'negative', impact: 'Or monte quand dollar baisse' },
    ],
    // EUR/USD: DXY #1, GBP/USD #2, Gold #3
    'EUR/USD': [
      { symbol: 'DXY', correlation: -95, strength: 'strong', direction: 'negative', impact: 'Inverse mecanique' },
      { symbol: 'GBP/USD', correlation: 82, strength: 'strong', direction: 'positive', impact: 'Devises europeennes' },
      { symbol: 'XAU/USD', correlation: 65, strength: 'moderate', direction: 'positive', impact: 'Euro fort = or fort' },
    ],
    // GBP/USD: DXY #1, EUR/USD #2, Gold #3
    'GBP/USD': [
      { symbol: 'DXY', correlation: -88, strength: 'strong', direction: 'negative', impact: 'Composant DXY inverse' },
      { symbol: 'EUR/USD', correlation: 82, strength: 'strong', direction: 'positive', impact: 'Devises europeennes' },
      { symbol: 'XAU/USD', correlation: 58, strength: 'moderate', direction: 'positive', impact: 'GBP fort = dollar faible' },
    ],
    // USD/JPY: DXY #1, US10Y #2, VIX #3
    'USD/JPY': [
      { symbol: 'DXY', correlation: 75, strength: 'strong', direction: 'positive', impact: 'Suit la force du dollar' },
      { symbol: 'US10Y', correlation: 70, strength: 'strong', direction: 'positive', impact: 'Rendements US soutiennent' },
      { symbol: 'VIX', correlation: -55, strength: 'moderate', direction: 'negative', impact: 'Yen refuge en risk-off' },
    ],
    // Bitcoin: Ethereum #1, Nasdaq #2, DXY #3
    'BTC/USD': [
      { symbol: 'ETH/USD', correlation: 92, strength: 'strong', direction: 'positive', impact: 'Cryptos en tandem' },
      { symbol: 'US100', correlation: 65, strength: 'moderate', direction: 'positive', impact: 'Risk-on = crypto monte' },
      { symbol: 'DXY', correlation: -58, strength: 'moderate', direction: 'negative', impact: 'Dollar pese sur crypto' },
    ],
    // Ethereum: Bitcoin #1, Nasdaq #2, DXY #3
    'ETH/USD': [
      { symbol: 'BTC/USD', correlation: 92, strength: 'strong', direction: 'positive', impact: 'Cryptos en tandem' },
      { symbol: 'US100', correlation: 60, strength: 'moderate', direction: 'positive', impact: 'ETH suit le tech' },
      { symbol: 'DXY', correlation: -55, strength: 'moderate', direction: 'negative', impact: 'Dollar pese sur crypto' },
    ],
  }
  
  return defaults[symbol] || [
    { symbol: 'DXY', correlation: -50, strength: 'moderate', direction: 'negative', impact: 'Impact dollar' },
    { symbol: 'US500', correlation: 40, strength: 'moderate', direction: 'positive', impact: 'Correlation indices' },
    { symbol: 'VIX', correlation: -35, strength: 'weak', direction: 'negative', impact: 'Sensible volatilite' },
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CorrelationSectionProps {
  symbol: string
  className?: string
  maxCorrelations?: number
}

export function CorrelationSection({ symbol, className, maxCorrelations = 3 }: CorrelationSectionProps) {
  const { correlations, isLoading } = useCorrelations(symbol)
  
  // Use static fallback if loading or no data
  const displayCorrelations = correlations.length > 0 
    ? correlations.slice(0, maxCorrelations)
    : getStaticCorrelations(symbol).slice(0, maxCorrelations)
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5">
        {isLoading ? (
          // Loading skeleton
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-14 h-14 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          displayCorrelations.map((corr) => (
            <CorrelationGauge 
              key={corr.symbol}
              symbol={corr.symbol}
              correlation={corr.correlation}
              size="sm"
            />
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION DETAIL SECTION (for reports)
// ═══════════════════════════════════════════════════════════════════════════════

interface CorrelationDetailProps {
  symbol: string
  className?: string
}

export function CorrelationDetail({ symbol, className }: CorrelationDetailProps) {
  const { correlations, source, isLoading } = useCorrelations(symbol)
  
  const displayCorrelations = correlations.length > 0 
    ? correlations 
    : getStaticCorrelations(symbol)
  
  if (isLoading) {
    return (
      <div className={cn("p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="flex justify-center gap-6 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-16 h-20 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn("p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Correlations Cles
        </h4>
        {source === 'realtime' && (
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
            Live
          </span>
        )}
      </div>
      
      {/* Gauges */}
      <div className="flex items-center justify-center gap-6 mb-4">
        {displayCorrelations.slice(0, 3).map((corr) => (
          <CorrelationGauge 
            key={corr.symbol}
            symbol={corr.symbol}
            correlation={corr.correlation}
            size="md"
            showImpact={true}
            impact={corr.impact}
          />
        ))}
      </div>
      
      {/* Impact descriptions */}
      <div className="space-y-2 text-sm">
        {displayCorrelations.slice(0, 3).map((corr) => {
          const strengthLabel = corr.strength === 'strong' ? 'forte' : corr.strength === 'moderate' ? 'moderee' : 'faible'
          const directionLabel = corr.direction === 'positive' ? 'positive' : 'inverse'
          
          return (
            <div key={corr.symbol} className="flex items-start gap-2">
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded shrink-0 font-medium",
                corr.direction === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              )}>
                {corr.symbol}
              </span>
              <span className="text-xs text-muted-foreground">
                Correlation {directionLabel} {strengthLabel} ({corr.correlation > 0 ? '+' : ''}{corr.correlation}%). {corr.impact}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
