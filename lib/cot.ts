import { createClient } from "@/lib/supabase/server"

export interface COTEvent {
  strategy: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  price: number
  sources: string[]
  report_date?: string
  long_positions?: number
  short_positions?: number
  net_position?: number
  open_interest?: number
  raw_data?: Record<string, unknown>
}

// Log COT event to Supabase
export async function logCOT(event: COTEvent) {
  const supabase = await createClient()
  
  const { error } = await supabase.from("cot_logs").insert([
    {
      symbol: event.symbol,
      report_date: event.report_date || new Date().toISOString().split('T')[0],
      long_positions: event.long_positions,
      short_positions: event.short_positions,
      net_position: event.net_position,
      open_interest: event.open_interest,
      data_source: event.sources?.join(', ') || event.strategy,
      raw_data: {
        strategy: event.strategy,
        action: event.action,
        confidence: event.confidence,
        price: event.price,
        sources: event.sources,
        ...event.raw_data,
      },
      created_at: new Date().toISOString(),
    },
  ])
  
  if (error) {
    console.error('[COT] Error logging event:', error)
    throw error
  }
  
  return { success: true }
}

// Get recent COT logs for a symbol
export async function getCOTLogs(symbol: string, limit = 10) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("cot_logs")
    .select("*")
    .eq("symbol", symbol)
    .order("created_at", { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('[COT] Error fetching logs:', error)
    return []
  }
  
  return data
}

// Get latest signal for a symbol
export async function getLatestSignal(symbol: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("cot_logs")
    .select("*")
    .eq("symbol", symbol)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    return null
  }
  
  return data
}
