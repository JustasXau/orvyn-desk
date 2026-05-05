'use client'

import { useEffect, useState } from 'react'
import { CalendarEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const [events, setEvents]   = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/calendar')
        const data = await res.json()
        setEvents(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Calendar error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const impactColor = (impact: string) =>
    impact === 'High'   ? 'text-red-400 bg-red-400/10 border-red-400/30' :
    impact === 'Medium' ? 'text-orange-400 bg-orange-400/10 border-orange-400/30' :
    'text-gray-400 bg-gray-400/10 border-gray-400/30'

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Calendrier Économique Gold</h1>
        <p className="text-sm text-[#8a8a8a]">Événements impactant XAU/USD</p>
      </div>

      {/* Events */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-1/2 mb-3" />
              <div className="h-3 bg-[#334155] rounded w-full mb-2" />
              <div className="h-3 bg-[#334155] rounded w-3/4" />
            </div>
          ))
        ) : events.length === 0 ? (
          <div className="bg-[#1e293b] rounded-xl p-8 text-center text-[#8a8a8a]">
            Aucun événement gold cette semaine
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">

              {/* Top */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-[#8a8a8a] font-mono">
                  {event.time ? new Date(event.time).toLocaleString('fr-FR', {
                    weekday: 'short', day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit'
                  }) : '—'}
                </span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full border font-medium',
                  impactColor(event.impact)
                )}>
                  {event.impact}
                </span>
                <span className="text-sm font-semibold text-white">{event.title}</span>
              </div>

              {/* Data */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Précédent', value: event.previous },
                  { label: 'Prévision', value: event.forecast },
                  { label: 'Réel',      value: event.actual ?? '—' },
                ].map(item => (
                  <div key={item.label} className="bg-[#0f172a] rounded-lg p-2.5">
                    <p className="text-xs text-[#8a8a8a] mb-1">{item.label}</p>
                    <p className="text-sm font-mono text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Impact gold */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-green-400 flex-shrink-0">↑ Si supérieur :</span>
                  <span className="text-[#8a8a8a]">{event.goldImpact.ifBetter}</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 flex-shrink-0">↓ Si inférieur :</span>
                  <span className="text-[#8a8a8a]">{event.goldImpact.ifWorse}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}