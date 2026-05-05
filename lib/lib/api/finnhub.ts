export async function fetchFinnhubNews(): Promise<any[]> {
  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const url = `https://finnhub.io/api/v1/company-news?symbol=GC&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`

    const response = await fetch(url, { next: { revalidate: 300 } })

    if (!response.ok) throw new Error(`Finnhub error: ${response.status}`)

    const data = await response.json()

    return data.map((item: any) => ({
      title: item.headline ?? '',
      description: item.summary ?? '',
      url: item.url ?? '',
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      source: item.source ?? 'Finnhub',
    }))
  } catch (error) {
    console.error('[Finnhub] fetchFinnhubNews error:', error)
    return []
  }
}