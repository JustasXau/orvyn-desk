import { useState, useCallback, useEffect } from 'react'
import type { AnalysisResult } from '@/types/ai-analysis'

interface UseAIAnalysisOptions {
  pair: string
  autoStart?: boolean
}

interface AnalysisState {
  technical: any | null
  macro: any | null
  news: any | null
  synthesis: any | null
  loading: boolean
  error: string | null
  progress: string
}

export function useAIAnalysis({ pair, autoStart = true }: UseAIAnalysisOptions) {
  const [state, setState] = useState<AnalysisState>({
    technical: null,
    macro: null,
    news: null,
    synthesis: null,
    loading: false,
    error: null,
    progress: 'idle'
  })

  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const startAnalysis = useCallback(() => {
    // Close existing connection
    if (eventSource) {
      eventSource.close()
    }

    setState(prev => ({ ...prev, loading: true, error: null, progress: 'connecting' }))

    const es = new EventSource(`/api/desk/${pair}/analysis/stream`)

    es.addEventListener('technical', (event) => {
      const data = JSON.parse(event.data)
      setState(prev => ({ ...prev, technical: data, progress: 'technical analysis complete' }))
    })

    es.addEventListener('macro', (event) => {
      const data = JSON.parse(event.data)
      setState(prev => ({ ...prev, macro: data, progress: 'macro analysis complete' }))
    })

    es.addEventListener('news', (event) => {
      const data = JSON.parse(event.data)
      setState(prev => ({ ...prev, news: data, progress: 'news analysis complete' }))
    })

    es.addEventListener('synthesis', (event) => {
      const data = JSON.parse(event.data)
      setState(prev => ({ ...prev, synthesis: data, progress: 'synthesis complete' }))
    })

    es.addEventListener('done', (event) => {
      setState(prev => ({ ...prev, loading: false, progress: 'complete' }))
      es.close()
    })

    es.addEventListener('error', (event) => {
      const data = JSON.parse(event.data)
      setState(prev => ({
        ...prev,
        loading: false,
        error: data.error,
        progress: 'error'
      }))
      es.close()
    })

    es.onerror = () => {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Connection lost',
        progress: 'error'
      }))
      es.close()
    }

    setEventSource(es)

    return () => es.close()
  }, [pair, eventSource])

  useEffect(() => {
    if (autoStart) {
      startAnalysis()
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  return {
    ...state,
    startAnalysis,
    hasData: !!(state.technical || state.macro || state.news || state.synthesis)
  }
}
