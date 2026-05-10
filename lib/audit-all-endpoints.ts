/**
 * COMPREHENSIVE AUDIT TEST SUITE
 * Tests all 25 API endpoints and validates button interactions
 */

// All API endpoints to test
export const AUDIT_ENDPOINTS = [
  // Bias & Analysis APIs
  { method: 'GET', path: '/api/bias', description: 'Old bias (to deprecate)' },
  { method: 'GET', path: '/api/pair-data?symbol=XAU/USD', description: 'Pair data with universal bias' },
  { method: 'POST', path: '/api/orvyn/bias', description: 'ORVYN bias (universal engine)' },
  { method: 'POST', path: '/api/orvyn/analysis', description: 'ORVYN analysis (should now use universal)' },
  
  // Quick & Unified Reports
  { method: 'POST', path: '/api/quick-analysis', description: '2-phrase analysis' },
  { method: 'POST', path: '/api/unified-report', description: 'Full contextual report' },
  
  // News & Calendar
  { method: 'GET', path: '/api/news?symbol=XAU/USD', description: '185 filtered articles' },
  { method: 'GET', path: '/api/economic-calendar?country=USD&date=week', description: 'HIGH impact events' },
  
  // Technical & Correlations
  { method: 'GET', path: '/api/technical-analysis?symbol=XAU/USD', description: 'Technical indicators' },
  { method: 'POST', path: '/api/technical-indicators', description: 'Indicator calculation' },
  { method: 'GET', path: '/api/candle-analysis?symbol=XAU/USD', description: 'Candle patterns' },
  { method: 'GET', path: '/api/correlations?symbol=XAU/USD', description: 'Pearson correlations' },
  
  // Market Data
  { method: 'GET', path: '/api/market-data?symbol=XAU/USD', description: 'Market data snapshot' },
  { method: 'GET', path: '/api/ohlc?symbol=GC=F&timeframe=daily&bars=50', description: 'OHLC data' },
  { method: 'GET', path: '/api/candles?symbol=XAU/USD', description: 'Candle data' },
  { method: 'GET', path: '/api/historical-prices?symbol=XAU/USD', description: 'Historical prices' },
  
  // Special Data
  { method: 'GET', path: '/api/trump', description: 'Trump tracker' },
  { method: 'GET', path: '/api/cot', description: 'COT reports' },
  { method: 'GET', path: '/api/market-sentiment', description: 'Market sentiment' },
  
  // Chart Data
  { method: 'GET', path: '/api/tv-price?symbol=OANDA:XAUUSD', description: 'TradingView price' },
  { method: 'GET', path: '/api/yahoo-price?symbol=GC=F', description: 'Yahoo price' },
  { method: 'GET', path: '/api/tradingview-chart?symbol=OANDA:XAUUSD', description: 'TradingView chart' },
  
  // Unified & Pipeline
  { method: 'GET', path: '/api/unified-data?symbol=XAU/USD', description: 'All data unified' },
  { method: 'GET', path: '/api/pipeline', description: 'Pipeline status' },
  { method: 'POST', path: '/api/signal', description: 'Trading signal' },
]

// Test function
export async function runAuditTests() {
  const results = []
  
  for (const endpoint of AUDIT_ENDPOINTS) {
    try {
      console.log(`[Audit] Testing ${endpoint.method} ${endpoint.path}...`)
      
      let response
      if (endpoint.method === 'GET') {
        response = await fetch(endpoint.path)
      } else {
        response = await fetch(endpoint.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: 'XAU/USD' })
        })
      }
      
      const status = response.ok ? '✅' : '❌'
      const statusCode = response.status
      
      results.push({
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        status: status,
        statusCode: statusCode,
        ok: response.ok
      })
      
      if (!response.ok) {
        const text = await response.text()
        console.error(`[Audit] ${endpoint.path} failed: ${text.substring(0, 100)}`)
      }
    } catch (err) {
      results.push({
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        status: '❌ TIMEOUT/ERROR',
        statusCode: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      })
      console.error(`[Audit] ${endpoint.path} error:`, err)
    }
  }
  
  // Summary
  const passCount = results.filter(r => r.ok).length
  const failCount = results.filter(r => !r.ok).length
  
  console.log('\n═════════════════════════════════════════════')
  console.log(`AUDIT SUMMARY: ${passCount}/${results.length} endpoints working`)
  console.log(`Failures: ${failCount}`)
  console.log('═════════════════════════════════════════════\n')
  
  // Print failures
  if (failCount > 0) {
    console.log('FAILED ENDPOINTS:')
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  ❌ ${r.method} ${r.path} (${r.statusCode})`)
      console.log(`     ${r.description}`)
      if (r.error) console.log(`     Error: ${r.error}`)
    })
  }
  
  return { results, passCount, failCount }
}

// Test buttons - check if components are properly wired
export const BUTTON_TEST_CHECKLIST = {
  dashboard: {
    'Rapport Button': 'Opens StructuredReportModal with symbol',
    'AI Analysis': 'Shows useQuickAnalysis result',
    'Pair Selector': 'Changes symbol + resets components',
    'Correlation Circles': 'Clickable → shows relationship',
    'TradingView Icon': 'Opens chart',
    'Refresh Button': 'Reloads bias data'
  },
  reports: {
    'Close Button (X)': 'Closes modal cleanly',
    'Refresh Button': 'Regenerates report via /api/unified-report',
    'Raw Data Button': 'Shows JSON response'
  },
  navigation: {
    'Dashboard Link': 'Navigates to /dashboard',
    'News Link': 'Navigates to /news',
    'Calendar Link': 'Navigates to /calendar',
    'COT Link': 'Navigates to /dashboard/cot',
    'Trump Tracker Link': 'Navigates to dashboard'
  }
}

// Environment variables checklist
export const ENV_VAR_CHECKLIST = [
  { var: 'GROQ_API_KEY', used_by: ['/api/quick-analysis', '/api/unified-report'], required: true },
  { var: 'FINNHUB_API_KEY', used_by: ['/api/news', '/api/candle-analysis'], required: true },
  { var: 'UPSTASH_REDIS_REST_URL', used_by: ['rate-limit.ts'], required: false },
  { var: 'UPSTASH_REDIS_REST_TOKEN', used_by: ['rate-limit.ts'], required: false },
  { var: 'NEXT_PUBLIC_SUPABASE_URL', used_by: ['auth'], required: true },
  { var: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', used_by: ['auth'], required: true },
  { var: 'GNEWS_API_KEY', used_by: ['/api/news (secondary)'], required: false }
]
