import { NextResponse } from 'next/server'

const EXCHANGE_RATE_KEY = process.env.EXCHANGE_RATE_API_KEY

async function getFrankfurterRates(base: string = 'USD') {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${base}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    
    if (data.rates) {
      return {
        base: data.base,
        rates: data.rates,
        date: data.date,
      }
    }
    return null
  } catch (error) {
    console.error('[v0] Frankfurter error:', error)
    return null
  }
}

async function getExchangeRateData(base: string = 'USD') {
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_KEY}/latest/${base}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    
    if (data.conversion_rates) {
      return {
        base: data.base_code,
        rates: data.conversion_rates,
        timestamp: data.time_last_update_unix,
      }
    }
    return null
  } catch (error) {
    console.error('[v0] ExchangeRate API error:', error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const base = searchParams.get('base') || 'USD'
  const source = searchParams.get('source') || 'both' // both, frankfurter, or exchangerate

  try {
    let result: any = {}

    if (source === 'frankfurter' || source === 'both') {
      const frankfurter = await getFrankfurterRates(base)
      if (frankfurter) result.frankfurter = frankfurter
    }

    if (source === 'exchangerate' || source === 'both') {
      const exchangeRate = await getExchangeRateData(base)
      if (exchangeRate) result.exchangerate = exchangeRate
    }

    // Merge rates for convenience
    const mergedRates: Record<string, number> = {}
    if (result.frankfurter?.rates) {
      Object.assign(mergedRates, result.frankfurter.rates)
    }
    if (result.exchangerate?.rates) {
      Object.assign(mergedRates, result.exchangerate.rates)
    }

    return NextResponse.json({
      base,
      merged_rates: mergedRates,
      sources: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Exchange Rates API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    )
  }
}
