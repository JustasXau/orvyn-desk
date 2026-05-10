import { NextRequest, NextResponse } from 'next/server'
import { calculateBias, calculateAllBiases } from '@/lib/bias-engine-universal'
import { analysisApiLimiter, checkRateLimit } from '@/lib/rate-limit'
import { getAllSymbols, isValidSymbol } from '@/lib/assets'

// ═══════════════════════════════════════════════════════════════════════════
// ORVYN DESK — UNIVERSAL BIAS ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// 
// SWING TRADE:  Weekly (40%) + Daily (35%) + H4 (25%)
// DAY TRADE:    H4 (35%) + H1 (40%) + M15 (25%)
//
// Each timeframe = 5 indicators (EMA, RSI, Structure, MACD, ADX)
// Score: -1 to +1 normalized
// Confidence: Strictly enforced rules
// ═══════════════════════════════════════════════════════════════════════════

// Cache pour les résultats
const biasCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Simple response format
interface BiasResponse {
  symbol: string;
  swing: {
    direction: string;
    confidence: number;
    score: number;
  };
  day: {
    direction: string;
    confidence: number;
    score: number;
  };
  votes: any[];
  timestamp: number;
}

interface AllBiasResponse {
  results: BiasResponse[];
  timestamp: number;
  cached: boolean;
  cacheExpiresIn?: number;
}


// Single bias calculation wrapper
async function formatBiasResponse(result: any) {
  return {
    symbol: result.symbol,
    swing: {
      direction: result.swing.direction,
      score: result.swing.score,
      confidence: result.swing.confidence,
      label: result.swing.label,
      timeframes: result.swing.timeframes
    },
    day: {
      direction: result.day.direction,
      score: result.day.score,
      confidence: result.day.confidence,
      label: result.day.label,
      timeframes: result.day.timeframes
    },
    confidence: result.confidence,
    lastUpdated: result.lastUpdated,
  }
}

// POST: Calculate bias for multiple symbols or all
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitCheck = await checkRateLimit(request, analysisApiLimiter);
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response;
  }

  try {
    const body = await request.json();
    const symbols: string[] = body.symbols || getAllSymbols();
    const forceRefresh = body.forceRefresh === true;

    // Check cache
    const cacheKey = `bias_all_${symbols.join('_')}`;
    const cached = biasCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        results: cached.data,
        timestamp: Date.now(),
        cached: true,
        cacheExpiresIn: Math.ceil((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000),
      });
    }

    // Calculate for all symbols in parallel
    const biasResults = await calculateAllBiases(symbols);
    const responseData = await Promise.all(biasResults.map(formatBiasResponse));

    // Cache the result
    biasCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json({
      results: responseData,
      timestamp: Date.now(),
      cached: false,
    });
  } catch (error) {
    console.error('[Bias Engine] Error:', error);
    return NextResponse.json(
      { error: 'Bias calculation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Quick single symbol check
export async function GET(request: NextRequest): Promise<NextResponse> {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
  
  if (!symbol) {
    // Return list of all available symbols
    return NextResponse.json({
      message: 'Symbol required. Available symbols from centralized config:',
      availableSymbols: getAllSymbols(),
      example: '/api/orvyn/bias?symbol=XAU/USD',
    });
  }

  // Validate symbol exists in our asset list
  if (!isValidSymbol(symbol)) {
    return NextResponse.json({
      error: `Symbol '${symbol}' not found in asset list`,
      availableSymbols: getAllSymbols(),
    }, { status: 400 });
  }

  try {
    // Check cache first
    const cached = biasCache.get(symbol);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheExpiresIn: Math.ceil((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000),
      });
    }

    const result = await calculateBias(symbol);
    const formatted = await formatBiasResponse(result);
    
    // Cache individual result
    biasCache.set(symbol, { data: formatted, timestamp: Date.now() });
    
    return NextResponse.json(formatted);
  } catch (error) {
    console.error(`[Bias Engine] Error for ${symbol}:`, error);
    return NextResponse.json({
      error: 'Bias calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
