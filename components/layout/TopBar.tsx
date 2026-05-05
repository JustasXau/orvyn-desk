'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SESSIONS = [
  { name: 'SYD', timezone: 'Australia/Sydney',  openUTC: 21, closeUTC: 6  },
  { name: 'TYO', timezone: 'Asia/Tokyo',         openUTC: 0,  closeUTC: 9  },
  { name: 'LDN', timezone: 'Europe/London',      openUTC: 7,  closeUTC: 16 },
  { name: 'NYC', timezone: 'America/New_York',   openUTC: 12, closeUTC: 21 },
]

function isSessionOpen(openUTC: number, closeUTC: number, utcHour: number): boolean {
  if (openUTC < closeUTC) return utcHour >= openUTC && utcHour < closeUTC
  return utcHour >= openUTC || utcHour < closeUTC
}

export function TopBar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const utcHour = time.getUTCHours()

  const parisTime = time.toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <header className="bg-[#1e293b] border-b border-[#1f2937] px-4 py-2.5 flex items-center justify-between">
      
      {/* Horloge Paris */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm font-mono text-[#f1f5f9]">
          {parisTime}
        </span>
        <span className="text-xs text-[#8a8a8a]">Paris</span>
      </div>

      {/* Sessions */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-[#8a8a8a] hidden md:block">SESSIONS</span>
        {SESSIONS.map((session) => {
          const open = isSessionOpen(session.openUTC, session.closeUTC, utcHour)
          const localTime = time.toLocaleTimeString('fr-FR', {
            timeZone: session.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })

          return (
            <div key={session.name} className="flex items-center gap-1.5">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                open ? 'bg-green-400' : 'bg-gray-600'
              )} />
              <span className="text-xs font-mono text-[#8a8a8a]">
                {session.name}
              </span>
              <span className="text-xs font-mono text-[#f1f5f9]">
                {localTime}
              </span>
              <span className={cn(
                'text-xs hidden lg:block',
                open ? 'text-green-400' : 'text-gray-600'
              )}>
                {open ? 'Ouvert' : 'Fermé'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Son */}
      <div className="text-xs text-[#8a8a8a]">
        🔔 Son
      </div>
    </header>
  )
}