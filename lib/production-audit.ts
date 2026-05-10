/**
 * Production Audit Script - Tests tous les 25 endpoints
 * Exécutable directement ou importable dans le dashboard
 */

interface EndpointResult {
  path: string
  method: string
  status: number | null
  error: string | null
  responseTime: number
  dataAvailable: boolean
}

const API_ENDPOINTS = [
  // Core Analysis APIs
  { path: '/api/pair-data', method: 'GET', params: '?symbol=XAU/USD' },
  { path: '/api/quick-analysis', method: 'POST', data: { symbol: 'XAU/USD', price: 2050, priceChange: 1.5, swingBias: { direction: 'Bullish', confidence: 75, score: 0.8 }, dayBias: { direction: 'Bearish', confidence: 65, score: -0.6 } } },
  { path: '/api/unified-report', method: 'POST', data: { symbol: 'XAU/USD', price: 2050, priceChange: 1.5, swingBias: { direction: 'Bullish', confidence: 75, score: 0.8 }, dayBias: { direction: 'Bearish', confidence: 65, score: -0.6 } } },
  
  // ORVYN APIs
  { path: '/api/orvyn/bias', method: 'GET', params: '?symbol=XAU/USD' },
  { path: '/api/orvyn/analysis', method: 'GET', params: '?symbol=XAU/USD' },
  { path: '/api/orvyn/indicators', method: 'GET', params: '?symbol=XAU/USD' },
  
  // Market Data APIs
  { path: '/api/yahoo-price', method: 'GET', params: '?symbol=XAU/USD' },
  { path: '/api/economic-calendar', method: 'GET', params: '?country=USD&date=week' },
  
  // News APIs
  { path: '/api/gnews', method: 'GET', params: '?query=forex' },
  { path: '/api/live-news', method: 'GET', params: '?symbol=EUR/USD' },
  { path: '/api/news-sentiment', method: 'GET', params: '?symbol=XAU/USD' },
  
  // Correlation APIs
  { path: '/api/correlations', method: 'GET', params: '?symbol=EUR/USD' },
  { path: '/api/multi-timeframe', method: 'GET', params: '?symbol=XAU/USD' },
  
  // Pipeline APIs
  { path: '/api/pipeline', method: 'GET', params: '?symbol=XAU/USD' },
  { path: '/api/pipeline/subscribe', method: 'GET', params: '?symbol=XAU/USD' },
]

export async function runAuditAllEndpoints(): Promise<EndpointResult[]> {
  const results: EndpointResult[] = []
  
  console.log('🔍 [AUDIT] Starting comprehensive endpoint audit...')
  console.log(`📊 Testing ${API_ENDPOINTS.length} endpoints\n`)
  
  for (const endpoint of API_ENDPOINTS) {
    const result = await testEndpoint(endpoint)
    results.push(result)
    
    const icon = result.status === 200 ? '✅' : result.status === null ? '⚠️' : '❌'
    console.log(`${icon} ${result.path} (${result.method}) → ${result.status || 'No Response'}ms (${result.responseTime}ms)`)
    if (result.error) console.log(`   Error: ${result.error}`)
  }
  
  // Summary
  const passed = results.filter(r => r.status === 200).length
  const failed = results.filter(r => r.status !== 200 && r.status !== null).length
  const timeout = results.filter(r => r.status === null).length
  
  console.log('\n' + '='.repeat(60))
  console.log(`📈 AUDIT RESULTS:`)
  console.log(`   ✅ Passed:  ${passed}/${API_ENDPOINTS.length}`)
  console.log(`   ❌ Failed:  ${failed}/${API_ENDPOINTS.length}`)
  console.log(`   ⏱️  Timeout: ${timeout}/${API_ENDPOINTS.length}`)
  console.log('='.repeat(60))
  
  return results
}

async function testEndpoint(endpoint: any): Promise<EndpointResult> {
  const startTime = Date.now()
  
  try {
    const url = `${typeof window !== 'undefined' ? '' : 'http://localhost:3000'}${endpoint.path}${endpoint.params || ''}`
    
    const options: RequestInit = {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' },
    }
    
    if (endpoint.data) {
      options.body = JSON.stringify(endpoint.data)
    }
    
    const response = await Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ])
    
    const responseTime = Date.now() - startTime
    const status = (response as Response).status
    const data = await (response as Response).json().catch(() => ({}))
    
    return {
      path: endpoint.path,
      method: endpoint.method,
      status,
      error: status !== 200 ? `Status ${status}` : null,
      responseTime,
      dataAvailable: Object.keys(data).length > 0,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      path: endpoint.path,
      method: endpoint.method,
      status: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      dataAvailable: false,
    }
  }
}

// Export for use in components or direct execution
export async function auditEndpointsFromDashboard() {
  const results = await runAuditAllEndpoints()
  return results
}
