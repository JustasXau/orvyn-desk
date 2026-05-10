import { NextResponse } from 'next/server'

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY

// Symbol mappings for different asset classes
const FOREX_PAIRS: Record<string, { from: string; to: string }> = {
  'EUR/USD': { from: 'EUR', to: 'USD' },
  'GBP/USD': { from: 'GBP', to: 'USD' },
  'USD/JPY': { from: 'USD', to: 'JPY' },
  'AUD/USD': { from: 'AUD', to: 'USD' },
  'USD/CHF': { from: 'USD', to: 'CHF' },
  'USD/CAD': { from: 'USD', to: 'CAD' },
  'NZD/USD': { from: 'NZD', to: 'USD' },
  'EUR/GBP': { from: 'EUR', to: 'GBP' },
  'EUR/JPY': { from: 'EUR', to: 'JPY' },
  'GBP/JPY': { from: 'GBP', to: 'JPY' },
  'EUR/AUD': { from: 'EUR', to: 'AUD' },
  'EUR/CAD': { from: 'EUR', to: 'CAD' },
  'GBP/CHF': { from: 'GBP', to: 'CHF' },
  'AUD/JPY': { from: 'AUD', to: 'JPY' },
  'CHF/JPY': { from: 'CHF', to: 'JPY' },
  'EUR/CHF': { from: 'EUR', to: 'CHF' },
  'GBP/AUD': { from: 'GBP', to: 'AUD' },
  'GBP/CAD': { from: 'GBP', to: 'CAD' },
  'AUD/CAD': { from: 'AUD', to: 'CAD' },
  'AUD/CHF': { from: 'AUD', to: 'CHF' },
  'AUD/NZD': { from: 'AUD', to: 'NZD' },
  'CAD/JPY': { from: 'CAD', to: 'JPY' },
  'EUR/NZD': { from: 'EUR', to: 'NZD' },
  'GBP/NZD': { from: 'GBP', to: 'NZD' },
  'NZD/JPY': { from: 'NZD', to: 'JPY' },
  'USD/MXN': { from: 'USD', to: 'MXN' },
  'USD/ZAR': { from: 'USD', to: 'ZAR' },
  'USD/SEK': { from: 'USD', to: 'SEK' },
  'USD/NOK': { from: 'USD', to: 'NOK' },
  'USD/SGD': { from: 'USD', to: 'SGD' },
  'USD/HKD': { from: 'USD', to: 'HKD' },
}

const METALS: Record<string, { from: string; to: string }> = {
  'XAU/USD': { from: 'XAU', to: 'USD' },
  'XAG/USD': { from: 'XAG', to: 'USD' },
  'GOLD': { from: 'XAU', to: 'USD' },
  'SILVER': { from: 'XAG', to: 'USD' },
}

const INDEX_ETF_MAP: Record<string, string> = {
  'US30': 'DIA',
  'US100': 'QQQ',
  'US500': 'SPY',
  'UK100': 'EWU',
  'GER40': 'EWG',
  'FRA40': 'EWQ',
  'JPN225': 'EWJ',
  'AUS200': 'EWA',
  'SPX': 'SPY',
  'NDX': 'QQQ',
  'DJI': 'DIA',
}

const CRYPTO_IDS: Record<string, string> = {
  'BTC/USD': 'bitcoin',
  'ETH/USD': 'ethereum',
  'XRP/USD': 'ripple',
  'BNB/USD': 'binancecoin',
  'SOL/USD': 'solana',
  'ADA/USD': 'cardano',
  'DOGE/USD': 'dogecoin',
  'LTC/USD': 'litecoin',
  'DOT/USD': 'polkadot',
  'LINK/USD': 'chainlink',
  'AVAX/USD': 'avalanche-2',
  'MATIC/USD': 'matic-network',
  'BITCOIN': 'bitcoin',
  'ETHEREUM': 'ethereum',
}

const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'BABA', 'JPM', 'BAC', 'V', 'JNJ', 'WMT', 'DIS']

const COMMODITY_MAP: Record<string, string> = {
  'USOIL': 'WTI',
  'WTI': 'WTI',
  'UKOIL': 'BRENT',
  'BRENT': 'BRENT',
  'NATGAS': 'NATURAL_GAS',
}

// Calculate price changes from monthly data
function calculatePriceChanges(monthlyPrices: { date: string; close: number }[]): {
  change1M: number | null
  change3M: number | null
  change12M: number | null
  currentPrice: number | null
} {
  if (!monthlyPrices || monthlyPrices.length === 0) {
    return { change1M: null, change3M: null, change12M: null, currentPrice: null }
  }

  // Sort by date descending (newest first)
  const sorted = [...monthlyPrices].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const current = sorted[0]?.close
  const oneMonthAgo = sorted[1]?.close
  const threeMonthsAgo = sorted[3]?.close
  const twelveMonthsAgo = sorted[12]?.close

  const calc = (past: number | undefined): number | null => {
    if (!past || !current) return null
    return +((((current - past) / past) * 100).toFixed(2))
  }

  return {
    change1M: calc(oneMonthAgo),
    change3M: calc(threeMonthsAgo),
    change12M: calc(twelveMonthsAgo),
    currentPrice: current || null
  }
}

// Fetch Forex monthly data from Alpha Vantage
async function fetchForexMonthly(from: string, to: string): Promise<{ date: string; close: number }[]> {
  try {
    const url = `https://www.alphavantage.co/query?function=FX_MONTHLY&from_symbol=${from}&to_symbol=${to}&apikey=${ALPHA_VANTAGE_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } }) // Cache 24h
    if (!res.ok) return []
    
    const data = await res.json()
    const timeSeries = data['Time Series FX (Monthly)']
    if (!timeSeries) return []

    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      close: parseFloat((values as Record<string, string>)['4. close'])
    }))
  } catch {
    return []
  }
}

// Fetch Stock/Index monthly data from Alpha Vantage
async function fetchStockMonthly(symbol: string): Promise<{ date: string; close: number }[]> {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []

    const data = await res.json()
    const timeSeries = data['Monthly Time Series']
    if (!timeSeries) return []

    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      close: parseFloat((values as Record<string, string>)['4. close'])
    }))
  } catch {
    return []
  }
}

// Fetch Crypto data from CoinGecko (free, no API key needed)
async function fetchCryptoMonthly(coinId: string): Promise<{ date: string; close: number }[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []

    const data = await res.json()
    const prices = data.prices as [number, number][]
    if (!prices || prices.length === 0) return []

    // Sample monthly data points (every ~30 days)
    const monthlyPrices: { date: string; close: number }[] = []
    const now = Date.now()
    
    // Get data points for: now, 1 month ago, 3 months ago, 12 months ago
    const targetDays = [0, 30, 90, 180, 270, 365]
    
    for (const daysAgo of targetDays) {
      const targetTime = now - (daysAgo * 24 * 60 * 60 * 1000)
      // Find closest price point
      let closest = prices[0]
      let minDiff = Math.abs(prices[0][0] - targetTime)
      
      for (const price of prices) {
        const diff = Math.abs(price[0] - targetTime)
        if (diff < minDiff) {
          minDiff = diff
          closest = price
        }
      }
      
      monthlyPrices.push({
        date: new Date(closest[0]).toISOString().split('T')[0],
        close: closest[1]
      })
    }

    // Sort by date descending
    return monthlyPrices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch {
    return []
  }
}

// Fetch Commodity data from Alpha Vantage
async function fetchCommodityMonthly(commodity: string): Promise<{ date: string; close: number }[]> {
  try {
    const url = `https://www.alphavantage.co/query?function=${commodity}&interval=monthly&apikey=${ALPHA_VANTAGE_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []

    const data = await res.json()
    const dataArray = data.data as { date: string; value: string }[]
    if (!dataArray) return []

    return dataArray.map(item => ({
      date: item.date,
      close: parseFloat(item.value)
    }))
  } catch {
    return []
  }
}

// Get historical prices for any symbol
async function getHistoricalPrices(symbol: string): Promise<{
  change1M: number | null
  change3M: number | null
  change12M: number | null
  currentPrice: number | null
  source: string
}> {
  const normalizedSymbol = symbol.toUpperCase()

  // Check Forex
  if (FOREX_PAIRS[normalizedSymbol]) {
    const { from, to } = FOREX_PAIRS[normalizedSymbol]
    const prices = await fetchForexMonthly(from, to)
    return { ...calculatePriceChanges(prices), source: 'alphavantage_fx' }
  }

  // Check Metals
  if (METALS[normalizedSymbol]) {
    const { from, to } = METALS[normalizedSymbol]
    const prices = await fetchForexMonthly(from, to)
    return { ...calculatePriceChanges(prices), source: 'alphavantage_fx' }
  }

  // Check Indices
  if (INDEX_ETF_MAP[normalizedSymbol]) {
    const etfSymbol = INDEX_ETF_MAP[normalizedSymbol]
    const prices = await fetchStockMonthly(etfSymbol)
    return { ...calculatePriceChanges(prices), source: 'alphavantage_stock' }
  }

  // Check Crypto
  if (CRYPTO_IDS[normalizedSymbol]) {
    const coinId = CRYPTO_IDS[normalizedSymbol]
    const prices = await fetchCryptoMonthly(coinId)
    return { ...calculatePriceChanges(prices), source: 'coingecko' }
  }

  // Check Commodities
  if (COMMODITY_MAP[normalizedSymbol]) {
    const commodity = COMMODITY_MAP[normalizedSymbol]
    const prices = await fetchCommodityMonthly(commodity)
    return { ...calculatePriceChanges(prices), source: 'alphavantage_commodity' }
  }

  // Check if it's a stock symbol
  if (STOCK_SYMBOLS.includes(normalizedSymbol)) {
    const prices = await fetchStockMonthly(normalizedSymbol)
    return { ...calculatePriceChanges(prices), source: 'alphavantage_stock' }
  }

  // Try as stock symbol anyway
  const prices = await fetchStockMonthly(normalizedSymbol)
  if (prices.length > 0) {
    return { ...calculatePriceChanges(prices), source: 'alphavantage_stock' }
  }

  return { change1M: null, change3M: null, change12M: null, currentPrice: null, source: 'unknown' }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const symbols = searchParams.get('symbols')

  if (symbols) {
    // Batch request for multiple symbols
    const symbolList = symbols.split(',').map(s => s.trim())
    const results: Record<string, {
      change1M: number | null
      change3M: number | null
      change12M: number | null
      currentPrice: number | null
      source: string
    }> = {}

    // Process in parallel with rate limiting (max 5 concurrent)
    const chunks = []
    for (let i = 0; i < symbolList.length; i += 5) {
      chunks.push(symbolList.slice(i, i + 5))
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (s) => {
          const data = await getHistoricalPrices(s)
          return { symbol: s, data }
        })
      )
      for (const { symbol: s, data } of chunkResults) {
        results[s] = data
      }
    }

    return NextResponse.json({
      data: results,
      timestamp: new Date().toISOString()
    })
  }

  if (symbol) {
    const data = await getHistoricalPrices(symbol)
    return NextResponse.json({
      symbol,
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
}
