# End-to-End Test Guide - News Integration

## Overview

This guide walks through testing the complete news → analysis integration. The system now connects 185 real news articles to AI-generated analysis on each trading pair via `/api/quick-analysis`.

## Architecture

```
News Feed (185 articles)
    ↓
filterNewsForSymbol() - Filters by pair
    ↓
/api/quick-analysis - Generates 2-sentence analysis
    ↓
QuickAnalysisDisplay - Renders on market cards
    ↓
Market Card (Desk View)
```

## Test Suite - `lib/e2e-test-suite.ts`

### Quick Start

Run all tests from browser console:

```typescript
import { runAllTests } from '@/lib/e2e-test-suite'

// Run in browser
await runAllTests()
```

Or run individual tests:

```typescript
import { 
  testQuickAnalysisAPI, 
  testNewsFiltering, 
  testCoherence 
} from '@/lib/e2e-test-suite'

// Test 1: Quick Analysis API
const results = await testQuickAnalysisAPI()

// Test 2: News Filtering
await testNewsFiltering()

// Test 3: Coherence Check
await testCoherence()
```

## Test 1: Quick Analysis API

**What it tests:** Does `/api/quick-analysis` return valid analysis with news context?

**Run:**
```typescript
const results = await testQuickAnalysisAPI()
```

**Expected Results:**
- ✅ `newsCount > 0` for major pairs (XAU/USD, EUR/USD, US100)
- ✅ `analysisLength > 50` characters
- ✅ `timeMs < 3000` (response time under 3 seconds)
- ✅ No errors

**What to check in logs:**
```
[QA] XAU/USD: {
  newsCount: 12,
  analysisLength: 187,
  timeMs: 1245,
  hasDivergence: false,
  error: 'none'
}
```

If `newsCount: 0` → Check if news API is returning articles
If `timeMs > 3000` → Groq API might be slow
If `error` → Check Groq/API configuration

---

## Test 2: News Filtering

**What it tests:** Are news articles correctly filtered by pair keywords?

**Run:**
```typescript
await testNewsFiltering()
```

**Expected Results:**
- ✅ XAU/USD filters to 5-20 articles (gold, inflation, Fed keywords)
- ✅ EUR/USD filters to 5-15 articles (ECB, inflation, USD keywords)
- ✅ US100 filters to 8-20 articles (tech, earnings, Fed keywords)
- ✅ Each symbol has different filtered set (not all same articles)

**What to check in logs:**
```
[Filter] XAU/USD: {
  total: 185,
  filtered: 12,
  filterRate: '6.5%'
}
  Top news for XAU/USD:
    - Fed maintains rates amid inflation concerns...
    - Central banks continue gold purchases...
    - Dollar strength pressures commodity prices...
```

If `filterRate: 0%` → Keywords map might be empty or too restrictive
If same articles appear for all symbols → Filtering not working correctly

---

## Test 3: Coherence Check - XAU/USD

**What it tests:** Does the AI analysis actually mention news from the feed?

**Run:**
```typescript
await testCoherence()
```

**Expected Results:**
- ✅ News headlines shown
- ✅ AI analysis displayed
- ✅ Keywords from news found in analysis
- ✅ ✅ Analysis appears contextual

**What to check in logs:**
```
News for XAU/USD: 12 articles
Recent news:
  • Fed maintains rates amid inflation concerns
  • Central banks continue gold purchases
  • Dollar strengthens on safe-haven demand

Analysis for XAU/USD:
Fed's hawkish hold pressures gold despite central bank demand. 
Safe-haven flows offset dollar strength short-term.

✅ Coherence Check:
  Keywords from news mentioned: 2/3
  Analysis length: 156 characters
  ✅ Analysis appears contextual
```

**❌ If analysis is too generic:**
```
Analysis: "XAU/USD consolidates without direction. 
Watch for breakout above resistance."

  Keywords from news mentioned: 0/3
  ❌ No news keywords found in analysis - may be too generic
```

This means:
- Groq is not using the contextual prompt correctly
- Or the news data isn't being passed to the API
- Check `SYSTEM_PROMPT_ANALYST` and `buildQuickAnalysisPrompt()`

---

## Manual Verification Checklist

### 1. Verify News API Returns Data

```bash
curl http://localhost:3000/api/news | jq '.news | length'
# Should return: 185 (or similar)
```

Check specific pair:
```bash
curl -X POST http://localhost:3000/api/quick-analysis \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"XAU/USD","price":2500,"priceChange":1.5,"swingBias":{"direction":"Bullish","confidence":70},"dayBias":{"direction":"Neutral","confidence":50}}'

# Should return:
# {
#   "analysis": "2-sentence analysis mentioning recent news...",
#   "newsCount": 12,
#   "hasDivergence": false
# }
```

### 2. Verify Components Render

In browser DevTools:

```typescript
// Check if QuickAnalysisDisplay is mounted
document.querySelector('[data-test="quick-analysis"]')
// Should return element

// Check if analysis text is visible
document.querySelector('[data-test="quick-analysis"]')?.textContent
// Should return 2-sentence analysis
```

### 3. Verify Cache Behavior

The API caches for 5 minutes. To force refresh:

```typescript
// Clear SWR cache and refetch
import { cache } from 'swr'
cache.clear()

// Manually refetch
const res = await fetch('/api/quick-analysis', {
  method: 'POST',
  body: JSON.stringify({...params}),
  cache: 'no-store'
})
```

---

## Debugging - Common Issues

### Issue: newsCount = 0 on all pairs

**Cause:** News filtering not working

**Check:**
```typescript
import { filterNewsForSymbol } from '@/lib/impact-map'
const news = [...]
const filtered = filterNewsForSymbol('XAU/USD', news)
console.log('Filtered:', filtered.length)
```

**Solution:**
- Verify NEWS_KEYWORDS_MAP has keywords for the symbol
- Check that news array is not empty
- Verify keyword matching logic (case-sensitive?)

### Issue: Analysis is too generic

**Cause:** Groq not receiving news in prompt

**Check:**
```typescript
import { buildQuickAnalysisPrompt } from '@/lib/contextual-report'
const prompt = buildQuickAnalysisPrompt({
  symbol: 'XAU/USD',
  news: [...], // Check this has data
  // ... other params
})
console.log(prompt)
```

**Look for:**
- "NEWS RÉCENTES" section should list 3-5 articles
- If shows "Aucune news récente" → news not being passed
- Check /api/quick-analysis is calling filterNewsForSymbol()

### Issue: API timeout or slow response

**Cause:** Groq API slow or network issue

**Check:**
- Open DevTools Network tab
- Look for `/api/quick-analysis` request
- Check "Time" column - if > 3s, likely Groq latency
- Check response body for Groq error messages

**Solution:**
- Verify GROQ_API_KEY is set
- Check Groq API status at console.groq.com
- Consider adding request timeout handling

---

## Integration Points

### Components Using Quick Analysis:

1. **market-card.tsx** - Shows analysis on main desk
2. **currency-pairs-list.tsx** - Quick analysis in pair selector
3. **structured-report-modal.tsx** - Can embed quick analysis

### API Routes:

1. `/api/news` - Fetches all news
2. `/api/quick-analysis` - Generates 2-sentence analysis
3. `/api/unified-report` - Full report (uses same filtering)

### Key Functions:

1. `filterNewsForSymbol()` - Filters news by pair
2. `buildQuickAnalysisPrompt()` - Creates Groq prompt
3. `useQuickAnalysisWithInterval()` - React hook for components
4. `QuickAnalysisDisplay` - Component to render

---

## Success Criteria

✅ All 6 test pairs get analysis
✅ Analysis mentions specific news/catalysts
✅ No generic/repeated text between pairs
✅ API response < 3 seconds
✅ Divergence detected correctly
✅ News count > 0 for major pairs

## Next Steps

After tests pass:

1. Deploy to production
2. Monitor Groq API usage
3. Adjust NEWS_KEYWORDS_MAP based on missing pairs
4. Track user feedback on analysis quality
5. Iterate on prompt engineering if needed

---

**Test Last Updated:** 2025-05-05
**Status:** Ready for end-to-end testing
