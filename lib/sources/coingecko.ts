// CoinGecko — BTC dominance + correlations avec Gold
// API publique gratuite sans cle

import { TIMEOUTS } from '@/lib/ai/config'

export interface CryptoData {
  btcPrice: number | null
  btcChange24h: number | null
  btcDominance: number | null    // % de dominance BTC sur cap totale crypto
  totalMarketCap: number | null
  fearGreedCorrelation: string   // Interpretation correlation BTC/Gold
  error?: string
}

export async function fetchCryptoData(): Promise<CryptoData> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    // Un seul appel pour avoir prix BTC + global market (dominance)
    const [priceRes, globalRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      }),
      fetch('https://api.coingecko.com/api/v3/global', {
        headers: { 'Accept': 'application/json' },
      }),
    ])
    clearTimeout(timeout)

    let btcPrice: number | null = null
    let btcChange24h: number | null = null
    let btcDominance: number | null = null
    let totalMarketCap: number | null = null

    if (priceRes.ok) {
      const pData = await priceRes.json()
      btcPrice = pData?.bitcoin?.usd ?? null
      btcChange24h = pData?.bitcoin?.usd_24h_change ?? null
    }

    if (globalRes.ok) {
      const gData = await globalRes.json()
      btcDominance = gData?.data?.market_cap_percentage?.btc ?? null
      totalMarketCap = gData?.data?.total_market_cap?.usd ?? null
    }

    // Interpretation correlation Gold/BTC
    let correlation = 'Non determinee'
    if (btcChange24h != null) {
      if (Math.abs(btcChange24h) > 3) {
        correlation = btcChange24h > 0
          ? `BTC +${btcChange24h.toFixed(1)}% — risk-on crypto actif, peut soutenir gold comme actif alternatif`
          : `BTC ${btcChange24h.toFixed(1)}% — aversion risque crypto, pression potentielle sur gold`
      } else {
        correlation = `BTC ${btcChange24h.toFixed(1)}% — mouvement modere, impact gold neutre`
      }
    }

    return {
      btcPrice,
      btcChange24h: btcChange24h != null ? Math.round(btcChange24h * 100) / 100 : null,
      btcDominance: btcDominance != null ? Math.round(btcDominance * 10) / 10 : null,
      totalMarketCap,
      fearGreedCorrelation: correlation,
    }
  } catch (err) {
    return {
      btcPrice: null,
      btcChange24h: null,
      btcDominance: null,
      totalMarketCap: null,
      fearGreedCorrelation: 'Non disponible',
      error: err instanceof Error ? err.message : 'Erreur',
    }
  }
}
