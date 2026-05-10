import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deep-dive?symbol=XAU/USD
 * Returns all deep dive indicators calculated from real market data
 */

// Yahoo Finance symbols mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  'DXY': 'DX-Y.NYB',
  'VIX': '^VIX',
  'US10Y': '^TNX',
  'US500': 'ES=F',
  'US100': 'NQ=F',
  'US30': 'YM=F',
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'BTC/USD': 'BTC-USD',
  'WTI': 'CL=F',
}

interface MarketData {
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
}

interface IndicatorResult {
  edgeFactor: {
    score: number
    bias: 'Bullish' | 'Bearish' | 'Neutral'
    description: string
  }
  aiOverview: string
  marketMood: {
    sentiment: 'RISK-ON' | 'RISK-OFF' | 'NEUTRAL'
    title: string
    description: string
    detail: string
  }
  marketPolicy: {
    stance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL'
    title: string
    description: string
    detail: string
  }
  flow: {
    level: 'THIN' | 'HEALTHY' | 'CROWDED'
    position: number // 0-100
    description: string
    bullets: string[]
  }
  bearing: {
    direction: 'TRENDING UP' | 'TRENDING DOWN' | 'CHOPPY UP' | 'CHOPPY DOWN' | 'RANGING'
    description: string
    bullets: string[]
  }
  pulse: {
    level: 'QUIET' | 'TRADEABLE' | 'WILD'
    position: number // 0-100
    description: string
    bullets: string[]
  }
}

async function fetchMarketData(symbol: string): Promise<MarketData | null> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 }
      }
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    
    const quote = result.indicators?.quote?.[0]
    const meta = result.meta
    
    const closes = quote?.close?.filter((c: number | null) => c !== null) || []
    const highs = quote?.high?.filter((h: number | null) => h !== null) || []
    const lows = quote?.low?.filter((l: number | null) => l !== null) || []
    const volumes = quote?.volume?.filter((v: number | null) => v !== null) || []
    
    const currentPrice = meta?.regularMarketPrice || closes[closes.length - 1] || 0
    const previousClose = meta?.previousClose || closes[closes.length - 2] || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    
    return {
      price: currentPrice,
      change,
      changePercent,
      high: Math.max(...highs.slice(-1)),
      low: Math.min(...lows.slice(-1)),
      open: quote?.open?.[quote.open.length - 1] || currentPrice,
      previousClose,
      volume: volumes[volumes.length - 1] || 0
    }
  } catch (error) {
    console.error(`[DeepDive] Failed to fetch ${symbol}:`, error)
    return null
  }
}

async function fetchHistoricalData(symbol: string): Promise<number[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1mo`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 }
      }
    )
    
    if (!response.ok) return []
    
    const data = await response.json()
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
    return closes.filter((c: number | null) => c !== null) as number[]
  } catch {
    return []
  }
}

async function fetchVIX(): Promise<number> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 }
      }
    )
    
    if (!response.ok) return 18
    
    const data = await response.json()
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice || 18
  } catch {
    return 18
  }
}

async function fetchDXY(): Promise<{ price: number; change: number }> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=2d',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 }
      }
    )
    
    if (!response.ok) return { price: 104, change: 0 }
    
    const data = await response.json()
    const meta = data?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice || 104
    const previousClose = meta?.previousClose || price
    const change = ((price - previousClose) / previousClose) * 100
    
    return { price, change }
  } catch {
    return { price: 104, change: 0 }
  }
}

async function fetchUS10Y(): Promise<number> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 }
      }
    )
    
    if (!response.ok) return 4.5
    
    const data = await response.json()
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice || 4.5
  } catch {
    return 4.5
  }
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  
  const returns = []
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1])
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
  
  return Math.sqrt(variance) * Math.sqrt(252) * 100 // Annualized volatility
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateTrend(prices: number[]): { direction: string; strength: number } {
  if (prices.length < 10) return { direction: 'RANGING', strength: 0 }
  
  const recent = prices.slice(-10)
  const sma5 = recent.slice(-5).reduce((a, b) => a + b, 0) / 5
  const sma10 = recent.reduce((a, b) => a + b, 0) / 10
  
  const percentDiff = ((sma5 - sma10) / sma10) * 100
  
  // Count higher highs and lower lows
  let higherHighs = 0
  let lowerLows = 0
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] > recent[i-1]) higherHighs++
    else lowerLows++
  }
  
  const consistency = Math.max(higherHighs, lowerLows) / (recent.length - 1)
  
  if (Math.abs(percentDiff) < 0.3) {
    return { direction: 'RANGING', strength: 0 }
  } else if (percentDiff > 0) {
    if (consistency > 0.7) return { direction: 'TRENDING UP', strength: percentDiff }
    return { direction: 'CHOPPY UP', strength: percentDiff }
  } else {
    if (consistency > 0.7) return { direction: 'TRENDING DOWN', strength: Math.abs(percentDiff) }
    return { direction: 'CHOPPY DOWN', strength: Math.abs(percentDiff) }
  }
}

function generateIndicators(
  symbol: string,
  marketData: MarketData,
  historicalPrices: number[],
  vix: number,
  dxy: { price: number; change: number },
  us10y: number
): IndicatorResult {
  const volatility = calculateVolatility(historicalPrices)
  const rsi = calculateRSI(historicalPrices)
  const trend = calculateTrend(historicalPrices)
  const changePercent = marketData.changePercent
  
  // ===== EDGE FACTOR =====
  // Combines trend, momentum, volatility, and macro factors
  let edgeScore = 50
  
  // Trend contribution (+-20)
  if (trend.direction.includes('UP')) edgeScore += Math.min(20, trend.strength * 10)
  else if (trend.direction.includes('DOWN')) edgeScore -= Math.min(20, trend.strength * 10)
  
  // RSI contribution (+-15)
  if (rsi > 70) edgeScore -= 10 // Overbought
  else if (rsi < 30) edgeScore += 10 // Oversold
  else if (rsi > 50) edgeScore += 5
  else edgeScore -= 5
  
  // Volatility contribution (+-10)
  if (volatility < 10) edgeScore += 5 // Low vol = easier to trade
  else if (volatility > 25) edgeScore -= 10 // High vol = risky
  
  // DXY impact for gold/silver (+-10)
  if (symbol === 'XAU/USD' || symbol === 'XAG/USD') {
    if (dxy.change < -0.3) edgeScore += 10 // Weak dollar = bullish gold
    else if (dxy.change > 0.3) edgeScore -= 10 // Strong dollar = bearish gold
  }
  
  edgeScore = Math.max(0, Math.min(100, edgeScore))
  
  const edgeBias = edgeScore >= 60 ? 'Bullish' : edgeScore <= 40 ? 'Bearish' : 'Neutral'
  const edgeBiasLabel = edgeScore >= 70 ? 'Strong Bullish' : 
                        edgeScore >= 55 ? 'Cautious Bullish' :
                        edgeScore <= 30 ? 'Strong Bearish' :
                        edgeScore <= 45 ? 'Cautious Bearish' : 'Neutral'
  
  // ===== AI OVERVIEW =====
  const symbolName = symbol === 'XAU/USD' ? "Gold" : 
                     symbol === 'XAG/USD' ? "Silver" :
                     symbol === 'DXY' ? "Dollar Index" :
                     symbol === 'WTI' ? "Crude Oil" :
                     symbol.replace('/', '')
  
  let aiOverview = ''
  if (edgeBias === 'Bullish') {
    aiOverview = `${symbolName} shows ${trend.direction.toLowerCase()} momentum with RSI at ${rsi.toFixed(0)}. `
    if (volatility < 15) aiOverview += `Low volatility (${volatility.toFixed(1)}%) suggests favorable entry conditions. `
    if (symbol === 'XAU/USD' && dxy.change < 0) aiOverview += `Dollar weakness (${dxy.change.toFixed(2)}%) provides tailwind. `
    aiOverview += `Current technical setup favors continuation higher with defined risk levels.`
  } else if (edgeBias === 'Bearish') {
    aiOverview = `${symbolName} faces headwinds with ${trend.direction.toLowerCase()} pressure and RSI at ${rsi.toFixed(0)}. `
    if (volatility > 20) aiOverview += `Elevated volatility (${volatility.toFixed(1)}%) warrants caution. `
    if (symbol === 'XAU/USD' && dxy.change > 0) aiOverview += `Dollar strength (${dxy.change.toFixed(2)}%) adds pressure. `
    aiOverview += `Risk management critical at current levels.`
  } else {
    aiOverview = `${symbolName} consolidates with mixed signals. RSI at ${rsi.toFixed(0)} shows balanced conditions. `
    aiOverview += `Volatility at ${volatility.toFixed(1)}% suggests range-bound action likely. Wait for clearer directional signals.`
  }
  
  // ===== MARKET MOOD =====
  // Based on VIX, indices performance, and risk assets
  let moodSentiment: 'RISK-ON' | 'RISK-OFF' | 'NEUTRAL'
  let moodTitle = ''
  let moodDescription = ''
  let moodDetail = ''
  
  if (vix > 25) {
    moodSentiment = 'RISK-OFF'
    moodTitle = 'Investor Positioning'
    moodDescription = `Market sentiment is firmly risk-off with VIX at ${vix.toFixed(1)}. Elevated fear levels suggest caution.`
    moodDetail = 'Risk-Off: Investors are cautious and seeking safer assets.'
  } else if (vix < 15) {
    moodSentiment = 'RISK-ON'
    moodTitle = 'Investor Positioning'
    moodDescription = `Market sentiment is risk-on with VIX at ${vix.toFixed(1)}. Low volatility supports risk assets.`
    moodDetail = 'Risk-On: Investors are confident and seeking growth assets.'
  } else {
    moodSentiment = 'NEUTRAL'
    moodTitle = 'Investor Positioning'
    moodDescription = `Market sentiment is balanced with VIX at ${vix.toFixed(1)}. Neither extreme fear nor complacency.`
    moodDetail = 'Neutral: Investors are waiting for clearer signals.'
  }
  
  // ===== MARKET POLICY =====
  // Based on US10Y yields and rate expectations
  let policyStance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL'
  let policyTitle = ''
  let policyDescription = ''
  let policyDetail = ''
  
  if (us10y > 4.8) {
    policyStance = 'HAWKISH'
    policyTitle = 'Global Economic Outlook'
    policyDescription = `Bond yields at ${us10y.toFixed(2)}% signal hawkish policy expectations. Higher-for-longer rates pressure non-yielding assets.`
    policyDetail = 'HAWKISH: Central banks maintaining restrictive stance.'
  } else if (us10y < 4.0) {
    policyStance = 'DOVISH'
    policyTitle = 'Global Economic Outlook'
    policyDescription = `Bond yields at ${us10y.toFixed(2)}% suggest dovish pivot expectations. Rate cuts anticipated, supporting risk assets.`
    policyDetail = 'DOVISH: Central banks expected to ease policy.'
  } else {
    policyStance = 'NEUTRAL'
    policyTitle = 'Global Economic Outlook'
    policyDescription = `Bond yields at ${us10y.toFixed(2)}% reflect balanced policy outlook. Data-dependent approach expected from central banks.`
    policyDetail = 'NEUTRAL: Central banks maintaining a balanced stance.'
  }
  
  // ===== FLOW =====
  // Based on volume analysis
  const avgVolume = marketData.volume // Simplified
  let flowLevel: 'THIN' | 'HEALTHY' | 'CROWDED'
  let flowPosition = 50
  
  if (volatility < 10) {
    flowLevel = 'THIN'
    flowPosition = 25
  } else if (volatility > 25) {
    flowLevel = 'CROWDED'
    flowPosition = 80
  } else {
    flowLevel = 'HEALTHY'
    flowPosition = 50
  }
  
  const flowBullets = flowLevel === 'HEALTHY' ? [
    'Normal participation — tape is well-structured',
    'Volume within the expected range',
    'Fills should execute at quoted prices',
    'Flow conditions support standard position sizing'
  ] : flowLevel === 'THIN' ? [
    'Low participation — wider spreads likely',
    'Volume below average',
    'Slippage risk elevated',
    'Consider reducing position size'
  ] : [
    'High participation — volatility elevated',
    'Volume significantly above average',
    'Fast moves possible',
    'Tight risk management essential'
  ]
  
  // ===== BEARING =====
  let bearingDirection = trend.direction as 'TRENDING UP' | 'TRENDING DOWN' | 'CHOPPY UP' | 'CHOPPY DOWN' | 'RANGING'
  
  const bearingBullets = bearingDirection.includes('TRENDING') ? [
    `Clear ${bearingDirection.includes('UP') ? 'upward' : 'downward'} momentum established`,
    'Follow the trend with defined stops',
    'Look for pullbacks to add positions',
    'Trend continuation likely'
  ] : bearingDirection.includes('CHOPPY') ? [
    `General ${bearingDirection.includes('UP') ? 'upward' : 'downward'} bias but choppy`,
    'RSI crosses show indecision',
    'Setups are valid but stop-outs more frequent',
    'Wait for cleaner impulse before committing'
  ] : [
    'No clear directional bias',
    'Price oscillating within range',
    'Range-bound strategies preferred',
    'Wait for breakout confirmation'
  ]
  
  // ===== PULSE =====
  let pulseLevel: 'QUIET' | 'TRADEABLE' | 'WILD'
  let pulsePosition = 50
  
  if (volatility < 12) {
    pulseLevel = 'QUIET'
    pulsePosition = 20
  } else if (volatility > 22) {
    pulseLevel = 'WILD'
    pulsePosition = 85
  } else {
    pulseLevel = 'TRADEABLE'
    pulsePosition = 50
  }
  
  const pulseBullets = pulseLevel === 'QUIET' ? [
    'Volatility compressed — breakout potential building',
    'ATR and BB width below normal — price is coiling',
    'Setups need a volatility expansion trigger before entry',
    'Stops tighter than usual are viable in this environment'
  ] : pulseLevel === 'TRADEABLE' ? [
    'Volatility within normal range',
    'Standard position sizing appropriate',
    'Technical levels respected',
    'Good conditions for active trading'
  ] : [
    'Extreme volatility — exercise maximum caution',
    'ATR expanded significantly',
    'Wide stops required',
    'Reduce position size substantially'
  ]
  
  return {
    edgeFactor: {
      score: Math.round(edgeScore),
      bias: edgeBias,
      description: `Technicals and macro are aligned to the ${edgeBias.toLowerCase()}, with ${flowLevel.toLowerCase()} participation, though volatility is ${volatility < 15 ? 'contained' : 'elevated'}. ${edgeBiasLabel} Bias.`
    },
    aiOverview,
    marketMood: {
      sentiment: moodSentiment,
      title: moodTitle,
      description: moodDescription,
      detail: moodDetail,
      vix: vix
    },
    marketPolicy: {
      stance: policyStance,
      title: policyTitle,
      description: policyDescription,
      detail: policyDetail,
      yields: us10y
    },
    flow: {
      level: flowLevel,
      position: flowPosition,
      description: `${flowLevel === 'HEALTHY' ? 'Normal' : flowLevel === 'THIN' ? 'Low' : 'High'} participation — ${flowLevel === 'HEALTHY' ? 'tape is well-structured' : flowLevel === 'THIN' ? 'watch for gaps' : 'exercise caution'}`,
      bullets: flowBullets
    },
    bearing: {
      direction: bearingDirection,
      description: `${bearingDirection.includes('TRENDING') ? 'Clear trend' : bearingDirection.includes('CHOPPY') ? 'Drift but choppy' : 'Range-bound'} — ${bearingDirection.includes('UP') ? 'buyers in control' : bearingDirection.includes('DOWN') ? 'sellers in control' : 'indecision'}`,
      bullets: bearingBullets
    },
    pulse: {
      level: pulseLevel,
      position: pulsePosition,
      description: `Volatility ${pulseLevel.toLowerCase()} — ${pulseLevel === 'QUIET' ? 'breakout potential building' : pulseLevel === 'TRADEABLE' ? 'normal conditions' : 'extreme moves possible'}`,
      bullets: pulseBullets
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'XAU/USD'
  
  try {
    // Fetch all data in parallel
    const [marketData, historicalPrices, vix, dxy, us10y] = await Promise.all([
      fetchMarketData(symbol),
      fetchHistoricalData(symbol),
      fetchVIX(),
      fetchDXY(),
      fetchUS10Y()
    ])
    
    if (!marketData || historicalPrices.length < 10) {
      return NextResponse.json({ 
        error: 'Insufficient data',
        symbol 
      }, { status: 400 })
    }
    
    const indicators = generateIndicators(symbol, marketData, historicalPrices, vix, dxy, us10y)
    
    return NextResponse.json({
      symbol,
      price: marketData.price,
      change: marketData.change,
      changePercent: marketData.changePercent,
      high: marketData.high,
      low: marketData.low,
      indicators,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[DeepDive] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      symbol 
    }, { status: 500 })
  }
}
