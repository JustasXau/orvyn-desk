import { NextResponse } from 'next/server'

// Liste des paires a analyser automatiquement
const PAIRS_TO_ANALYZE = [
  'XAU/USD', 'XAG/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY',
  'US30', 'US100', 'US500', 'USOIL', 'BTC/USD'
]

export async function GET(request: Request) {
  // Verification du secret pour les crons Vercel
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const results: Record<string, { success: boolean; error?: string }> = {}
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'

  // Analyser chaque paire
  for (const symbol of PAIRS_TO_ANALYZE) {
    try {
      const response = await fetch(
        `${baseUrl}/api/pair-data?symbol=${encodeURIComponent(symbol)}`,
        { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        }
      )
      
      if (response.ok) {
        results[symbol] = { success: true }
      } else {
        results[symbol] = { success: false, error: `Status ${response.status}` }
      }
    } catch (error) {
      results[symbol] = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  const successCount = Object.values(results).filter(r => r.success).length
  const failCount = Object.values(results).filter(r => !r.success).length

  console.log(`[CRON] Batch analysis completed: ${successCount} success, ${failCount} failed`)

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total: PAIRS_TO_ANALYZE.length,
      success: successCount,
      failed: failCount
    },
    results
  })
}
