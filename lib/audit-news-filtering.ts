/**
 * AUDIT SCRIPT: News Filtering Quality Check
 * 
 * This script tests that news articles are correctly filtered for each pair.
 * Run this locally or in a test suite to verify filteredNews counts and keywords.
 */

import { filterNewsForSymbol, NEWS_KEYWORDS_MAP, IMPACT_MAP } from './impact-map'

interface AuditResult {
  symbol: string
  totalNews: number
  filteredNews: number
  filterRate: number
  hasKeywords: boolean
  keywordCount: number
  quality: 'GOOD' | 'LOW' | 'EMPTY'
}

/**
 * Audit news filtering for a specific pair
 */
export function auditNewsForSymbol(
  symbol: string,
  sampleNews: any[],
  verbose: boolean = false
): AuditResult {
  const keywords = NEWS_KEYWORDS_MAP[symbol] || IMPACT_MAP[symbol] || []
  const filtered = filterNewsForSymbol(symbol, sampleNews, { logDetails: verbose })
  
  const result: AuditResult = {
    symbol,
    totalNews: sampleNews.length,
    filteredNews: filtered.length,
    filterRate: sampleNews.length > 0 ? (filtered.length / sampleNews.length) * 100 : 0,
    hasKeywords: keywords.length > 0,
    keywordCount: keywords.length,
    quality: filtered.length === 0 ? 'EMPTY' : filtered.length < 3 ? 'LOW' : 'GOOD',
  }

  if (verbose) {
    console.log(`[Audit] ${symbol}:`, result)
    console.log(`  Keywords used: ${keywords.slice(0, 5).join(', ')}...`)
    console.log(`  Filtered articles:`)
    filtered.slice(0, 3).forEach(n => {
      console.log(`    - ${n.headline?.substring(0, 60)}...`)
    })
  }

  return result
}

/**
 * Audit ALL pairs at once
 */
export function auditAllPairs(sampleNews: any[]): Record<string, AuditResult> {
  const allSymbols = Object.keys(NEWS_KEYWORDS_MAP)
  const results: Record<string, AuditResult> = {}

  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`NEWS FILTERING AUDIT - Testing ${allSymbols.length} pairs`)
  console.log(`═══════════════════════════════════════════════════════\n`)

  let goodCount = 0
  let lowCount = 0
  let emptyCount = 0

  for (const symbol of allSymbols) {
    const audit = auditNewsForSymbol(symbol, sampleNews)
    results[symbol] = audit

    if (audit.quality === 'GOOD') goodCount++
    else if (audit.quality === 'LOW') lowCount++
    else emptyCount++

    const statusEmoji = audit.quality === 'GOOD' ? '✅' : audit.quality === 'LOW' ? '⚠️' : '❌'
    console.log(`${statusEmoji} ${symbol.padEnd(12)} → ${audit.filteredNews}/${audit.totalNews} articles (${audit.filterRate.toFixed(0)}%) [${audit.quality}]`)
  }

  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`SUMMARY`)
  console.log(`═══════════════════════════════════════════════════════`)
  console.log(`✅ GOOD (≥3 articles): ${goodCount} pairs`)
  console.log(`⚠️  LOW  (<3 articles): ${lowCount} pairs`)
  console.log(`❌ EMPTY (0 articles): ${emptyCount} pairs`)
  console.log(`\nRecommendation:`)
  if (emptyCount > 0) console.log(`  - Broaden keywords for empty pairs`)
  if (lowCount > 0) console.log(`  - Consider expanding time window for low pairs`)
  console.log(`\n`)

  return results
}

/**
 * Test case: Mock news articles with expected matching
 */
export function testNewsFilteringWithMocks() {
  const mockNews = [
    {
      headline: 'Federal Reserve raises interest rates by 0.25%',
      summary: 'Fed continues inflation fight with latest rate hike',
      source: 'Bloomberg',
      datetime: Date.now(),
    },
    {
      headline: 'Bitcoin surges on AI optimism',
      summary: 'Cryptocurrency market rallies as tech stocks climb',
      source: 'Reuters',
      datetime: Date.now(),
    },
    {
      headline: 'Gold prices hit 2-year high amid geopolitical tensions',
      summary: 'XAU/USD rallies as investors seek safe haven',
      source: 'CNBC',
      datetime: Date.now(),
    },
    {
      headline: 'Oil prices jump after OPEC+ supply cuts',
      summary: 'WTI crude rallies on production concerns',
      source: 'MarketWatch',
      datetime: Date.now(),
    },
    {
      headline: 'NASDAQ rallies on earnings beat expectations',
      summary: 'Tech stocks surge as Q4 earnings season delivers',
      source: 'Yahoo Finance',
      datetime: Date.now(),
    },
  ]

  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`MOCK TEST: Verifying news filtering logic`)
  console.log(`═══════════════════════════════════════════════════════\n`)

  const testPairs = ['XAU/USD', 'BTC/USD', 'WTI', 'US100', 'DXY']
  
  for (const symbol of testPairs) {
    const audit = auditNewsForSymbol(symbol, mockNews, true)
    console.log()
  }
}

// Export for testing
export default { auditNewsForSymbol, auditAllPairs, testNewsFilteringWithMocks }
