import { NextResponse } from 'next/server'

async function getStooqData(symbol: string) {
  try {
    const res = await fetch(
      `https://stooq.com/q/d/l/?s=${symbol}&i=d&o=json`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    
    if (data.data && data.data.length > 0) {
      const latest = data.data[0]
      const previous = data.data[1]
      const change = latest.c - (previous?.c || latest.c)
      const changePercent = (change / (previous?.c || latest.c)) * 100

      return {
        symbol: symbol,
        price: latest.c,
        change: parseFloat(change.toFixed(4)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        date: latest.d,
        chart: data.data.slice(0, 30).reverse().map((d: any) => ({
          date: d.d,
          value: d.c,
        })),
      }
    }
    return null
  } catch (error) {
    console.error(`[v0] Error fetching ${symbol}:`, error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols')?.split(',') || ['XAUUSD', '^DJI']

  try {
    const results = await Promise.all(
      symbols.map((symbol) => getStooqData(symbol))
    )

    return NextResponse.json({
      data: results.filter(Boolean),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Stooq API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
