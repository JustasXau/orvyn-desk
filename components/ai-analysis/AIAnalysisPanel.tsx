import React, { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAIAnalysis } from '@/hooks/useAIAnalysis'
import { TechnicalAnalysisDisplay } from './TechnicalAnalysisDisplay'
import { MacroAnalysisDisplay } from './MacroAnalysisDisplay'
import { NewsAnalysisDisplay } from './NewsAnalysisDisplay'
import { SynthesisAnalysisDisplay } from './SynthesisAnalysisDisplay'
import { cn } from '@/lib/utils'

interface AIAnalysisPanelProps {
  pair: string
  className?: string
}

export function AIAnalysisPanel({ pair, className }: AIAnalysisPanelProps) {
  const analysis = useAIAnalysis({ pair, autoStart: true })

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with loading state */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-foreground">Advanced AI Analysis</h2>
        {analysis.loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground capitalize">{analysis.progress}</span>
          </div>
        )}
      </div>

      {/* Error display */}
      {analysis.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{analysis.error}</p>
          <button
            onClick={analysis.startAnalysis}
            className="text-xs text-red-300 hover:text-red-200 mt-2 underline"
          >
            Retry analysis
          </button>
        </div>
      )}

      {/* Analysis sections */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Technical */}
        <TechnicalAnalysisDisplay
          data={analysis.technical}
          loading={analysis.loading && !analysis.technical}
        />

        {/* Macro */}
        <MacroAnalysisDisplay
          data={analysis.macro}
          loading={analysis.loading && !analysis.macro}
        />

        {/* News */}
        <div className="lg:col-span-2">
          <NewsAnalysisDisplay
            data={analysis.news}
            loading={analysis.loading && !analysis.news}
          />
        </div>

        {/* Synthesis */}
        {analysis.synthesis && (
          <div className="lg:col-span-2">
            <SynthesisAnalysisDisplay
              data={analysis.synthesis}
              loading={false}
            />
          </div>
        )}
      </div>

      {/* Loading state */}
      {analysis.loading && !analysis.hasData && (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Initializing AI analysis...</p>
        </div>
      )}

      {/* Empty state */}
      {!analysis.loading && !analysis.hasData && !analysis.error && (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Click "Start Analysis" to begin</p>
          <button
            onClick={analysis.startAnalysis}
            className="text-xs text-primary hover:underline mt-2"
          >
            Start now
          </button>
        </div>
      )}
    </div>
  )
}
