import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.METALS_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'METALS_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    // Métaux à récupérer
    const metals = {
      gold: { symbol: 'XAU', name: 'Or (Gold)', unit: 'USD/oz' },
      silver: { symbol: 'XAG', name: 'Argent (Silver)', unit: 'USD/oz' },
      copper: { symbol: 'XCU', name: 'Cuivre (Copper)', unit: 'USD/lb' },
      platinum: { symbol: 'XPT', name: 'Platine (Platinum)', unit: 'USD/oz' },
      palladium: { symbol: 'XPD', name: 'Palladium', unit: 'USD/oz' },
    }

    const results: Record<string, any> = {}

    // Récupérer les prix actuels pour chaque métal
    for (const [key, metal] of Object.entries(metals)) {
      try {
        const res = await fetch(
          `https://api.metals.live/v1/spot/price/${metal.symbol}?currency=USD`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (res.ok) {
          const data = await res.json()
          results[key] = {
            symbol: metal.symbol,
            name: metal.name,
            unit: metal.unit,
            price: data.price,
            currency: 'USD',
            timestamp: data.timestamp || new Date().toISOString(),
          }
        } else {
          results[key] = {
            symbol: metal.symbol,
            name: metal.name,
            error: `Failed to fetch ${metal.name}`,
          }
        }
      } catch (err) {
        results[key] = {
          symbol: metal.symbol,
          name: metal.name,
          error: `Error fetching ${metal.name}`,
        }
      }
    }

    // Récupérer l'historique sur 30 jours pour les graphiques
    const charts: Record<string, any> = {}

    for (const [key, metal] of Object.entries(metals)) {
      try {
        const res = await fetch(
          `https://api.metals.live/v1/spot/history/${metal.symbol}?currency=USD&timeseries=30d`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (res.ok) {
          const data = await res.json()
          if (data.data) {
            charts[key] = Object.entries(data.data)
              .map(([timestamp, price]: any) => ({
                date: new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0],
                value: price,
              }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          }
        }
      } catch (err) {
        console.error(`[v0] Error fetching chart for ${key}:`, err)
      }
    }

    return NextResponse.json({
      metals: results,
      charts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Metals API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metals data' },
      { status: 500 }
    )
  }
}
