// FRED API enrichie — toutes les series utiles pour l'analyse macro
// Necessite FRED_API_KEY (deja presente)

import { TIMEOUTS } from '@/lib/ai/config'

export interface FREDSeries {
  id: string
  name: string
  value: number | null
  previousValue: number | null
  change: number | null
  date: string
  error?: string
}

export interface MacroDataBundle {
  // Taux d'interet
  fedFundsRate: FREDSeries
  us10y: FREDSeries
  us5y: FREDSeries
  us2y: FREDSeries
  us30y: FREDSeries
  tips10y: FREDSeries       // Real rate
  yieldCurve10_2: number | null
  yieldCurve10_3m: number | null

  // Marches
  dxy: FREDSeries | null
  wtiOil: FREDSeries

  // Inflation
  cpi: FREDSeries
  coreCpi: FREDSeries
  pce: FREDSeries

  // Emploi
  unemploymentRate: FREDSeries
  nfp: FREDSeries

  // Activite
  pmi: FREDSeries | null
  consumerSentiment: FREDSeries

  // Liquidite Fed
  fedBalanceSheet: FREDSeries
  m2: FREDSeries

  // Forex
  usdJpy: FREDSeries
  usdCny: FREDSeries

  // Completude
  completeness: number     // 0-100% des series disponibles
  fetchedAt: number
}

const FRED_SERIES: Record<string, { id: string; name: string }> = {
  fedFundsRate:      { id: 'DFF',      name: 'Fed Funds Rate' },
  us10y:             { id: 'DGS10',    name: 'US 10Y Yield' },
  us5y:              { id: 'DGS5',     name: 'US 5Y Yield' },
  us2y:              { id: 'DGS2',     name: 'US 2Y Yield' },
  us30y:             { id: 'DGS30',    name: 'US 30Y Yield' },
  tips10y:           { id: 'DFII10',   name: 'TIPS 10Y (Real Rate)' },
  yieldCurve10_3m:   { id: 'T10Y3M',   name: 'Yield Curve 10Y-3M' },
  wtiOil:            { id: 'DCOILWTICO', name: 'WTI Crude Oil' },
  cpi:               { id: 'CPIAUCSL', name: 'CPI All Urban' },
  coreCpi:           { id: 'CPILFESL', name: 'Core CPI' },
  pce:               { id: 'PCEPI',    name: 'PCE Inflation' },
  unemploymentRate:  { id: 'UNRATE',   name: 'Unemployment Rate' },
  nfp:               { id: 'PAYEMS',   name: 'Non-Farm Payrolls' },
  consumerSentiment: { id: 'UMCSENT',  name: 'Michigan Consumer Sentiment' },
  fedBalanceSheet:   { id: 'WALCL',    name: 'Fed Balance Sheet' },
  m2:                { id: 'M2SL',     name: 'M2 Money Supply' },
  usdJpy:            { id: 'DEXJPUS',  name: 'USD/JPY Official' },
  usdCny:            { id: 'DEXCHUS',  name: 'USD/CNY Official' },
}

async function fetchFREDSeries(seriesId: string, apiKey: string): Promise<{ value: number | null; previousValue: number | null; date: string; error?: string }> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_SOURCE)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return { value: null, previousValue: null, date: '', error: `HTTP ${res.status}` }

    const data = await res.json()
    const obs = data?.observations?.filter((o: { value: string }) => o.value !== '.')

    if (!obs || obs.length === 0) return { value: null, previousValue: null, date: '' }

    const latest = parseFloat(obs[0].value)
    const previous = obs.length > 1 ? parseFloat(obs[1].value) : null

    return {
      value: isNaN(latest) ? null : latest,
      previousValue: isNaN(previous ?? NaN) ? null : previous,
      date: obs[0].date,
    }
  } catch {
    return { value: null, previousValue: null, date: '', error: 'Timeout' }
  }
}

export async function fetchMacroDataBundle(): Promise<MacroDataBundle> {
  const apiKey = process.env.FRED_API_KEY
  const fetchedAt = Date.now()

  if (!apiKey) {
    console.warn('[FRED] FRED_API_KEY non definie')
    return buildEmptyBundle(fetchedAt)
  }

  // Fetch toutes les series en parallele
  const entries = Object.entries(FRED_SERIES)
  const results = await Promise.all(
    entries.map(([key, { id, name }]) =>
      fetchFREDSeries(id, apiKey).then(data => ({
        key,
        series: {
          id,
          name,
          value: data.value,
          previousValue: data.previousValue,
          change: data.value != null && data.previousValue != null ? data.value - data.previousValue : null,
          date: data.date,
          error: data.error,
        } as FREDSeries,
      }))
    )
  )

  const map: Record<string, FREDSeries> = {}
  let available = 0
  for (const { key, series } of results) {
    map[key] = series
    if (series.value != null) available++
  }

  const completeness = Math.round((available / results.length) * 100)

  // Calculer yield curve 10Y-2Y
  const us10 = map.us10y?.value
  const us2 = map.us2y?.value
  const us3m = map.yieldCurve10_3m?.value
  const yieldCurve10_2 = us10 != null && us2 != null ? Math.round((us10 - us2) * 100) / 100 : null

  return {
    fedFundsRate:      map.fedFundsRate,
    us10y:             map.us10y,
    us5y:              map.us5y,
    us2y:              map.us2y,
    us30y:             map.us30y,
    tips10y:           map.tips10y,
    yieldCurve10_2,
    yieldCurve10_3m:   us3m,
    dxy:               null,              // Pas disponible sur FRED directement
    wtiOil:            map.wtiOil,
    cpi:               map.cpi,
    coreCpi:           map.coreCpi,
    pce:               map.pce,
    unemploymentRate:  map.unemploymentRate,
    nfp:               map.nfp,
    pmi:               null,              // Non disponible gratuitement sur FRED
    consumerSentiment: map.consumerSentiment,
    fedBalanceSheet:   map.fedBalanceSheet,
    m2:                map.m2,
    usdJpy:            map.usdJpy,
    usdCny:            map.usdCny,
    completeness,
    fetchedAt,
  }
}

function buildEmptyBundle(fetchedAt: number): MacroDataBundle {
  const empty: FREDSeries = { id: '', name: '', value: null, previousValue: null, change: null, date: '' }
  return {
    fedFundsRate: empty, us10y: empty, us5y: empty, us2y: empty, us30y: empty,
    tips10y: empty, yieldCurve10_2: null, yieldCurve10_3m: null, dxy: null,
    wtiOil: empty, cpi: empty, coreCpi: empty, pce: empty,
    unemploymentRate: empty, nfp: empty, pmi: null, consumerSentiment: empty,
    fedBalanceSheet: empty, m2: empty, usdJpy: empty, usdCny: empty,
    completeness: 0, fetchedAt,
  }
}
