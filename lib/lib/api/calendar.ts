export async function fetchCalendarData(): Promise<any> {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { next: { revalidate: 1800 } }
    )

    if (!response.ok) throw new Error(`Calendar error: ${response.status}`)

    return await response.json()
  } catch (error) {
    console.error('[Calendar] fetchCalendarData error:', error)
    return { events: [] }
  }
}