'use client'

import { useState, useEffect } from 'react'
import { Brain, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO, differenceInSeconds } from 'date-fns'
import { fr } from 'date-fns/locale'

interface EconomicEvent {
  id: string
  date: string
  time: string
  country: string
  currency: string
  event: string
  impact: 'high' | 'medium' | 'low' | 'none'
  actual: string | null
  forecast: string | null
  previous: string | null
}

interface CalendarEventRowProps {
  event: EconomicEvent
  flagUrl?: string
  onBrainClick?: () => void
  onRefresh?: () => void
}

export function CalendarEventRow({
  event,
  flagUrl,
  onBrainClick,
  onRefresh
}: CalendarEventRowProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'published'>('waiting')

  // Calculate time until event - 3 states only
  useEffect(() => {
    const checkTime = () => {
      try {
        const eventDateTime = parseISO(`${event.date}T${event.time}`)
        const now = new Date()
        const secondsUntil = differenceInSeconds(eventDateTime, now)

        // Published: actual value is available
        if (event.actual) {
          setStatus('published')
          setTimeLeft(null)
        }
        // Countdown: less than 5 minutes before event
        else if (secondsUntil <= 300 && secondsUntil > 0) {
          setStatus('countdown')
          setTimeLeft(secondsUntil)
        }
        // Waiting: all other cases (before, after without data, etc)
        else {
          setStatus('waiting')
          setTimeLeft(null)
        }
      } catch (error) {
        setStatus('waiting')
      }
    }

    checkTime()
    const interval = setInterval(checkTime, 1000)
    return () => clearInterval(interval)
  }, [event.date, event.time, event.actual])

  // Format countdown MM:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Determine actual vs forecast color
  const getValueColor = (actual: string | null, forecast: string | null) => {
    if (!actual || !forecast) return 'text-muted-foreground'
    
    const actualNum = parseFloat(String(actual).replace(/[^0-9.-]/g, ''))
    const forecastNum = parseFloat(String(forecast).replace(/[^0-9.-]/g, ''))
    
    if (isNaN(actualNum) || isNaN(forecastNum)) return 'text-muted-foreground'
    
    if (actualNum > forecastNum) return 'text-emerald-400'
    if (actualNum < forecastNum) return 'text-red-400'
    return 'text-yellow-400'
  }

  return (
    <tr className="border-b border-border/50">
      {/* Flag */}
      <td className="p-3 text-center">
        {flagUrl && <img src={flagUrl} alt={event.currency} className="w-6 h-6 rounded" />}
      </td>

      {/* Time */}
      <td className="p-3 text-xs text-muted-foreground font-mono">
        {event.time}
      </td>

      {/* Event */}
      <td className="p-3 text-xs">
        <div className="font-medium">{event.event}</div>
        <div className="text-muted-foreground text-[10px]">{event.country}</div>
      </td>

      {/* Impact */}
      <td className="p-3 text-center">
        <span className={cn(
          'inline-block w-2 h-2 rounded-full',
          event.impact === 'high' && 'bg-red-500',
          event.impact === 'medium' && 'bg-orange-500',
          event.impact === 'low' && 'bg-yellow-500',
          event.impact === 'none' && 'bg-muted'
        )} />
      </td>

      {/* Forecast */}
      <td className="p-3 text-right font-mono text-xs">
        {event.forecast || '-'}
      </td>

      {/* Previous */}
      <td className="p-3 text-right font-mono text-xs text-muted-foreground">
        {event.previous || '-'}
      </td>

      {/* Actual - 3 states only */}
      <td className={cn(
        'p-3 text-right font-mono text-xs',
        status === 'countdown' && 'text-red-500',
        status === 'published' && getValueColor(event.actual, event.forecast)
      )}>
        {/* STATE 1: Countdown (< 5 min) - show MM:SS timer */}
        {status === 'countdown' && (
          <span className="font-bold">
            {formatCountdown(timeLeft || 0)}
          </span>
        )}

        {/* STATE 2: Published (actual available) - show value with color */}
        {status === 'published' && event.actual && (
          <span className="font-semibold">{event.actual}</span>
        )}

        {/* STATE 3: Waiting (> 5 min or no data) - show "En attente" */}
        {status === 'waiting' && (
          <span className="text-muted-foreground italic">En attente</span>
        )}
      </td>

      {/* Brain button - keeps gray/violet color always (not green after publish) */}
      <td className="p-3 text-center">
        <button
          onClick={onBrainClick}
          className="p-1 hover:bg-muted/20 rounded transition-colors"
          title="Analyse IA"
        >
          <Brain className="w-4 h-4 text-muted-foreground hover:text-muted-foreground" />
        </button>
      </td>
    </tr>
  )
}
