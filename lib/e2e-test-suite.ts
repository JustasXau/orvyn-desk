/**
 * End-to-End Test Script for News Integration
 * Tests quick-analysis API and verifies news → analysis connection
 */

import { filterNewsForSymbol } from '@/lib/impact-map'
import { buildQuickAnalysisPrompt } from '@/lib/contextual-report'

// Test pairs list
const TEST_PAIRS = [
  'XAU/USD',
  'EUR/USD',
  'US100',
  'BTC/USD',
  'DXY',
  'US30',
]

interface TestResult {
  symbol: string
  newsCount: number
  analysisLength: number
  hasDivergence: boolean
  timeMs: number
  hasError: boolean
  errorMsg?: string
  sampleAnalysis?: string
}

/**
 * TEST 1: Quick Analysis on each pair from desk
 * Calls /api/quick-analysis for each pair and logs results
 */
export async function testQuickAnalysisAPI(): Promise<TestResult[]> {
  console.log('\n═══════════════════════════════════════════')
  console.log('TEST 1: Quick Analysis API')
  console.log('═══════════════════════════════════════════\n')

  const results: TestResult[] = []

  for (const symbol of TEST_PAIRS) {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/quick-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          price: 0,
          priceChange: 0,
          swingBias: { direction: 'Bullish', confidence: 65, score: 0.5 },
          dayBias: { direction: 'Neutral', confidence: 50, score: 0 },
          news: [], // Will be fetched by API
        }),
      })

      if (!response.ok) {
        results.push({
          symbol,
          newsCount: 0,
          analysisLength: 0,
          hasDivergence: false,
          timeMs: Date.now() - startTime,
          hasError: true,
          errorMsg: `HTTP ${response.status}`,
        })
        continue
      }

      const data = await response.json()
      const timeMs = Date.now() - startTime

      console.log(`[QA] ${symbol}:`, {
        newsCount: data.newsCount || 0,
        analysisLength: (data.analysis || '').length,
        hasDivergence: data.hasDivergence || false,
        timeMs,
        error: data.error ?? 'none',
        sampleAnalysis: (data.analysis || '').substring(0, 100) + '...',
      })

      results.push({
        symbol,
        newsCount: data.newsCount || 0,
        analysisLength: (data.analysis || '').length,
        hasDivergence: data.hasDivergence || false,
        timeMs,
        hasError: false,
        sampleAnalysis: data.analysis?.substring(0, 150),
      })
    } catch (error) {
      console.error(`[ERROR] ${symbol}:`, error)
      results.push({
        symbol,
        newsCount: 0,
        analysisLength: 0,
        hasDivergence: false,
        timeMs: Date.now() - startTime,
        hasError: true,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.log('\n✅ TEST 1 Summary:')
  console.log(`  Successful: ${results.filter(r => !r.hasError).length}/${results.length}`)
  console.log(`  Avg response time: ${(results.reduce((sum, r) => sum + r.timeMs, 0) / results.length).toFixed(0)}ms`)
  console.log(`  Pairs with news: ${results.filter(r => r.newsCount > 0).length}`)

  return results
}

/**
 * TEST 2: Verify news filtering for specific symbol
 * Checks that filterNewsForSymbol returns relevant articles
 */
export async function testNewsFiltering(): Promise<void> {
  console.log('\n═══════════════════════════════════════════')
  console.log('TEST 2: News Filtering')
  console.log('═══════════════════════════════════════════\n')

  // Fetch all news
  const newsResponse = await fetch('/api/news')
  const newsData = await newsResponse.json()
  const allNews = newsData.news || []

  console.log(`Total news available: ${allNews.length}`)

  // Test filtering for each pair
  for (const symbol of TEST_PAIRS) {
    const filtered = filterNewsForSymbol(symbol, allNews, { logDetails: true })
    
    console.log(`\n[Filter] ${symbol}:`, {
      total: allNews.length,
      filtered: filtered.length,
      filterRate: `${((filtered.length / allNews.length) * 100).toFixed(1)}%`,
    })

    if (filtered.length > 0) {
      console.log(`  Top news for ${symbol}:`)
      filtered.slice(0, 3).forEach((news: any) => {
        console.log(`    - ${news.headline?.substring(0, 60)}...`)
      })
    }
  }

  console.log('\n✅ TEST 2 Complete')
}

/**
 * TEST 3: Verify coherence between news and analysis on XAU/USD
 * Checks if analysis mentions recent news about the symbol
 */
export async function testCoherence(): Promise<void> {
  console.log('\n═══════════════════════════════════════════')
  console.log('TEST 3: News → Analysis Coherence (XAU/USD)')
  console.log('═══════════════════════════════════════════\n')

  const symbol = 'XAU/USD'

  // Get news for XAU/USD
  const newsResponse = await fetch('/api/news')
  const newsData = await newsResponse.json()
  const allNews = newsData.news || []
  const xauNews = filterNewsForSymbol(symbol, allNews, { logDetails: false })

  console.log(`\nNews for ${symbol}: ${xauNews.length} articles`)
  if (xauNews.length > 0) {
    console.log('Recent news:')
    xauNews.slice(0, 3).forEach((news: any) => {
      console.log(`  • ${news.headline}`)
    })
  }

  // Get quick analysis for XAU/USD
  console.log(`\nFetching analysis for ${symbol}...`)
  const analysisResponse = await fetch('/api/quick-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      price: 2500,
      priceChange: 1.5,
      swingBias: { direction: 'Bullish', confidence: 70, score: 0.6 },
      dayBias: { direction: 'Bullish', confidence: 55, score: 0.3 },
      news: xauNews,
    }),
  })

  if (!analysisResponse.ok) {
    console.error(`Failed to fetch analysis: ${analysisResponse.status}`)
    return
  }

  const analysisData = await analysisResponse.json()
  console.log(`\nAnalysis for ${symbol}:`)
  console.log(`${analysisData.analysis}`)

  // Check coherence
  console.log('\n✅ Coherence Check:')
  
  if (xauNews.length === 0) {
    console.log('  ⚠️  No news for this pair - analysis should be technical only')
  } else {
    const analysisText = (analysisData.analysis || '').toLowerCase()
    const newsHeadlines = xauNews.map((n: any) => (n.headline || '').toLowerCase())
    
    let mentionedCount = 0
    newsHeadlines.forEach((headline: string) => {
      const keywords = headline.split(/\s+/).filter((w: string) => w.length > 4)
      const mentioned = keywords.some(kw => analysisText.includes(kw))
      if (mentioned) mentionedCount++
    })

    console.log(`  Keywords from news mentioned in analysis: ${mentionedCount}/${Math.min(3, newsHeadlines.length)}`)
    console.log(`  Analysis length: ${analysisData.analysis?.length || 0} characters`)
    
    if (mentionedCount === 0 && xauNews.length > 0) {
      console.log('  ❌ No news keywords found in analysis - may be too generic')
    } else {
      console.log('  ✅ Analysis appears contextual')
    }
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('🔬 START END-TO-END TEST SUITE')
  console.log('Testing news integration with quick-analysis API\n')

  try {
    // Test 1: Quick Analysis API
    const apiResults = await testQuickAnalysisAPI()

    // Test 2: News Filtering
    await testNewsFiltering()

    // Test 3: Coherence
    await testCoherence()

    console.log('\n═══════════════════════════════════════════')
    console.log('✅ ALL TESTS COMPLETE')
    console.log('═══════════════════════════════════════════\n')

    // Summary
    const successful = apiResults.filter(r => !r.hasError)
    const withNews = apiResults.filter(r => r.newsCount > 0)
    
    console.log('SUMMARY:')
    console.log(`  API Tests: ${successful.length}/${apiResults.length} successful`)
    console.log(`  Pairs with news data: ${withNews.length}/${apiResults.length}`)
    console.log(`  Avg analysis length: ${(apiResults.filter(r => r.analysisLength > 0).reduce((sum, r) => sum + r.analysisLength, 0) / Math.max(1, apiResults.filter(r => r.analysisLength > 0).length)).toFixed(0)} chars`)
    
    // Warnings
    if (apiResults.some(r => r.timeMs > 3000)) {
      console.log('  ⚠️  Some responses > 3s (might indicate slow API or network)')
    }
    
    if (withNews.length === 0) {
      console.log('  ⚠️  No pairs have news data - check news API and filtering')
    }

  } catch (error) {
    console.error('❌ Test suite error:', error)
  }
}

// Export for use in other files
export { testQuickAnalysisAPI, testNewsFiltering, testCoherence }
