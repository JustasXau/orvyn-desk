// Fear & Greed Index — CNN + Crypto (Alternative.me)
// Aucune cle API requise

import { TIMEOUTS } from '@/lib/ai/config'

export interface FearGreedData {
  cnn: {
    value: number | null          // 0-100 (0=Fear extreme, 100=Greed extreme)
    label: string
    previousClose: number | null
    weekAgo: number | null
    monthAgo: number | null
    error?: string
  }
  crypto: {
    value: number | null
    label: string
    timestamp: string
    error?: string
  }
  combined: {
    average: number | null
    marketMood: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed'
    interpretation: string
  }
}

function classifyFearGreed(value: number): string {
  if (value <= 25) return 'Extreme Fear'
  if (value <= 45) return 'Fear'
  if (value <= 55) return 'Neutral'
  if (value <= 75) return 'Greed'
  return 'Extreme Greed'
}

function getMoodFromValue(value: number | null): FearGreedData['combined']['marketMood'] {
  if (value == null) return 'neutral'
  if (value <= 25) return 'extreme_fear'
  if (value <= 45) return 'fear'
  if (value <= 55) return 'neutral'
  if (value <= 75) return 'greed'
  return 'extreme_greed'
}

async function fetchCNNFearGreed(): Promise<FearGreedData['cnn']> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const res = await fetch(
      'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        },
      }
    )
    clearTimeout(timeout)

    if (!res.ok) return { value: null, label: 'N/A', previousClose: null, weekAgo: null, monthAgo: null, error: `HTTP ${res.status}` }

    const data = await res.json()
    const score = data?.fear_and_greed

    if (!score) return { value: null, label: 'N/A', previousClose: null, weekAgo: null, monthAgo: null, error: 'Format inattendu' }

    const value = Math.round(score.score)
    return {
      value,
      label: classifyFearGreed(value),
      previousClose: score.previous_close ? Math.round(score.previous_close) : null,
      weekAgo: score.previous_1_week ? Math.round(score.previous_1_week) : null,
      monthAgo: score.previous_1_month ? Math.round(score.previous_1_month) : null,
    }
  } catch {
    return { value: null, label: 'N/A', previousClose: null, weekAgo: null, monthAgo: null, error: 'Timeout' }
  }
}

async function fetchCryptoFearGreed(): Promise<FearGreedData['crypto']> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    clearTimeout(timeout)

    if (!res.ok) return { value: null, label: 'N/A', timestamp: '', error: `HTTP ${res.status}` }

    const data = await res.json()
    const item = data?.data?.[0]

    if (!item) return { value: null, label: 'N/A', timestamp: '', error: 'Format inattendu' }

    return {
      value: parseInt(item.value),
      label: item.value_classification,
      timestamp: item.timestamp,
    }
  } catch {
    return { value: null, label: 'N/A', timestamp: '', error: 'Timeout' }
  }
}

export async function fetchFearGreedData(): Promise<FearGreedData> {
  const [cnn, crypto] = await Promise.all([fetchCNNFearGreed(), fetchCryptoFearGreed()])

  const values = [cnn.value, crypto.value].filter((v): v is number => v != null)
  const average = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
  const marketMood = getMoodFromValue(average)

  const INTERPRETATIONS: Record<FearGreedData['combined']['marketMood'], string> = {
    extreme_fear: `Peur extreme (${average ?? '?'}/100) — opportunite historique d'achat, mais signal de capitulation`,
    fear: `Peur (${average ?? '?'}/100) — sentiment negatif, smart money accumule souvent ici`,
    neutral: `Neutre (${average ?? '?'}/100) — pas de signal directionnel clair`,
    greed: `Cupidite (${average ?? '?'}/100) — marche optimiste, vigilance accrue`,
    extreme_greed: `Cupidite extreme (${average ?? '?'}/100) — signal de distribution, risque de correction eleve`,
  }

  return {
    cnn,
    crypto,
    combined: {
      average,
      marketMood,
      interpretation: INTERPRETATIONS[marketMood],
    },
  }
}
