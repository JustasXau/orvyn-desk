import { NextRequest, NextResponse } from "next/server"
import { getMarketData, computeSignal } from "@/lib/get-market-data"
import { logCOT } from "@/lib/cot"
import { analysisApiLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = await checkRateLimit(request, analysisApiLimiter)
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response
  }
  
  const symbol = request.nextUrl.searchParams.get('symbol') || "BTC/USD"
  
  try {
    // Get market data from multiple sources
    const data = await getMarketData(symbol)
    
    if (data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No market data available' 
      }, { status: 404 })
    }
    
    // Extract prices for signal computation
    const prices = data.map(d => d.price)
    
    // Compute trading signal
    const signal = computeSignal(prices)
    
    // Create event for logging
    const event = {
      strategy: "multi_api_mean",
      symbol,
      action: signal.action,
      confidence: signal.confidence,
      price: prices[prices.length - 1],
      sources: data.map(d => d.source),
    }
    
    // Log to Supabase COT table
    try {
      await logCOT(event)
    } catch (logError) {
      console.error('[Signal API] COT logging failed:', logError)
      // Continue even if logging fails
    }
    
    return NextResponse.json({
      success: true,
      event,
      marketData: data,
    })
  } catch (error) {
    console.error('[Signal API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to compute signal' 
    }, { status: 500 })
  }
}
