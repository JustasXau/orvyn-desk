import { NextResponse } from 'next/server'

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

interface AssetConfig {
  key: string
  finnhubSymbol: string // US stock/ETF symbol (free tier)
  label: string
  full: string
  decimals: number
  priceMultiplier?: number // To convert ETF price to actual index price
}

// Using US stock/ETF symbols that work with Finnhub free tier
// GLD = Gold ETF (tracks gold price / 10 approx)
// DIA = Dow Jones ETF (tracks DJIA / 100 approx)
// QQQ = Nasdaq 100 ETF (tracks NDX / 100 approx)
// UUP = Dollar Index ETF
const ASSETS: AssetConfig[] = [
  { key: 'xauusd', finnhubSymbol: 'GLD', label: 'XAU/USD', full: 'Gold / US Dollar', decimals: 2, priceMultiplier: 10 },
  { key: 'us30', finnhubSymbol: 'DIA', label: 'US30', full: 'Dow Jones Industrial Average', decimals: 0, priceMultiplier: 100 },
  { key: 'us100', finnhubSymbol: 'QQQ', label: 'US100', full: 'Nasdaq 100', decimals: 0, priceMultiplier: 40 },
  { key: 'dxy', finnhubSymbol: 'UUP', label: 'DXY', full: 'US Dollar Index', decimals: 3, priceMultiplier: 4 },
]

const AI_ANALYSIS: Record<string, { 
  bull: { summary: string; factors: string[] }
  bear: { summary: string; factors: string[] }
  neu: { summary: string; factors: string[] }
}> = {
  xauusd: {
    bull: {
      summary: 'Gold supported by geopolitical tensions and declining real yields driving safe-haven demand.',
      factors: [
        'Geopolitical uncertainty in Middle East boosting safe-haven flows',
        'Real yields declining as inflation expectations rise',
        'Central bank buying remains strong, particularly from China',
        'USD weakness supporting commodity prices',
        'Technical breakout above key $2,300 resistance level',
      ]
    },
    bear: {
      summary: 'Gold faces headwinds from firm USD and rising Treasury yields despite geopolitical support.',
      factors: [
        'Strong USD weighing on gold prices',
        'Rising Treasury yields increasing opportunity cost',
        'Fed hawkish stance pushing back rate cut expectations',
        'Risk-on sentiment reducing safe-haven demand',
        'Profit-taking after recent rally to all-time highs',
      ]
    },
    neu: {
      summary: 'Gold consolidating near resistance as traders await Fed policy clarity.',
      factors: [
        'Mixed signals from Fed officials on rate path',
        'Geopolitical premium offset by USD strength',
        'Technical indicators showing indecision',
        'Awaiting key US inflation data',
      ]
    },
  },
  us30: {
    bull: {
      summary: 'Dow Jones supported by strong earnings and rotation into value stocks.',
      factors: [
        'Strong Q1 earnings from industrial and financial sectors',
        'Rotation from growth to value benefiting Dow components',
        'Economic resilience supporting cyclical stocks',
        'Infrastructure spending boosting industrial names',
        'Dividend yields attractive vs bonds at current levels',
      ]
    },
    bear: {
      summary: 'Dow pressured by rate concerns and slowing economic indicators.',
      factors: [
        'Higher-for-longer Fed stance weighing on valuations',
        'ISM manufacturing data showing contraction',
        'Consumer spending showing signs of fatigue',
        'Geopolitical risks impacting global trade outlook',
        'Earnings growth expectations being revised lower',
      ]
    },
    neu: {
      summary: 'Dow range-bound as markets balance earnings strength against rate uncertainty.',
      factors: [
        'Mixed economic data creating uncertainty',
        'Sector rotation causing choppiness',
        'Awaiting clarity on Fed rate path',
        'Technical consolidation near all-time highs',
      ]
    },
  },
  us100: {
    bull: {
      summary: 'Nasdaq rallying on AI momentum and strong tech earnings outlook.',
      factors: [
        'AI infrastructure spending accelerating across big tech',
        'Strong cloud revenue growth from AWS, Azure, GCP',
        'Mega-cap tech earnings beating expectations',
        'Rate cut expectations supporting growth valuations',
        'Technical breakout above 18,000 resistance',
      ]
    },
    bear: {
      summary: 'Nasdaq under pressure as high valuations meet rising rate concerns.',
      factors: [
        'Fed pushing back against rate cut expectations',
        'Tech valuations stretched at 30x+ forward earnings',
        'Semiconductor cycle showing signs of peaking',
        'Regulatory scrutiny on big tech intensifying',
        'AI monetization timeline uncertainty',
      ]
    },
    neu: {
      summary: 'Nasdaq consolidating as AI optimism balances valuation concerns.',
      factors: [
        'Mixed signals from mega-cap tech guidance',
        'Awaiting key earnings from NVIDIA and others',
        'Technical indicators showing overbought conditions',
        'Options market pricing elevated volatility',
      ]
    },
  },
  dxy: {
    bull: {
      summary: 'Dollar strengthening on Fed hawkish stance and US economic outperformance.',
      factors: [
        'Fed maintaining higher-for-longer rate stance',
        'US economic data stronger than Europe and China',
        'Safe-haven flows amid geopolitical uncertainty',
        'Yield differentials favoring USD vs EUR and JPY',
        'Technical breakout above 105 key resistance',
      ]
    },
    bear: {
      summary: 'Dollar weakening as rate cut expectations grow and risk appetite improves.',
      factors: [
        'Markets pricing in Fed rate cuts for H2',
        'Improving global growth reducing USD safe-haven bid',
        'ECB and BoE maintaining hawkish stance',
        'US fiscal deficit concerns weighing on sentiment',
        'Technical breakdown below 104 support level',
      ]
    },
    neu: {
      summary: 'Dollar consolidating as markets await clearer Fed guidance.',
      factors: [
        'Mixed US economic data creating uncertainty',
        'Fed officials sending conflicting signals',
        'Global central bank policy divergence unclear',
        'Technical range-bound between 104-106',
      ]
    },
  },
}

interface FinnhubQuote {
  c: number  // Current price
  d: number  // Change
  dp: number // Percent change
  h: number  // High
  l: number  // Low
  o: number  // Open
  pc: number // Previous close
}

async function getFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    // Check if we got valid data
    if (!data.c || data.c === 0) return null
    return data
  } catch {
    return null
  }
}

export async function GET() {
  const results: Record<string, {
    price: number
    prev: number
    chg: number
    chgPts: number
    bias: 'bull' | 'bear' | 'neu'
    confidence: number
    summary: string
    factors: string[]
    source: string
  }> = {}

  await Promise.all(
    ASSETS.map(async (asset) => {
      let price = 0
      let prev = 0
      let chgPercent = 0
      let source = 'finnhub'

      try {
        const quote = await getFinnhubQuote(asset.finnhubSymbol)

        if (quote && quote.c > 0) {
          // Apply multiplier to convert ETF price to approximate index price
          const multiplier = asset.priceMultiplier || 1
          price = quote.c * multiplier
          prev = quote.pc * multiplier
          chgPercent = quote.dp // Use actual percent change from API
          source = 'finnhub'
        } else {
          // Skip this asset if no real data available
          console.log(`[v0] No data for ${asset.key}, skipping`)
          return
        }
      } catch (error) {
        console.error(`[v0] Finnhub error for ${asset.key}:`, error)
        // Skip this asset on error - don't use fake data
        return
      }

      const chgPts = price - prev

      // Determine bias based on percent change
      let bias: 'bull' | 'bear' | 'neu' = 'neu'
      if (chgPercent > 0.15) bias = 'bull'
      else if (chgPercent < -0.15) bias = 'bear'

      // Calculate confidence (50-90 based on magnitude)
      const abs = Math.abs(chgPercent)
      let confidence = 55
      if (abs > 1.5) confidence = 88
      else if (abs > 1) confidence = 78
      else if (abs > 0.5) confidence = 68
      else if (abs > 0.2) confidence = 60

      const analysis = AI_ANALYSIS[asset.key]?.[bias] || { summary: 'Analysis unavailable.', factors: [] }

      results[asset.key] = { 
        price, 
        prev, 
        chg: chgPercent, 
        chgPts, 
        bias, 
        confidence, 
        summary: analysis.summary, 
        factors: analysis.factors,
        source
      }
    })
  )

  return NextResponse.json({
    data: results,
    timestamp: new Date().toISOString(),
    assets: ASSETS,
  })
}
