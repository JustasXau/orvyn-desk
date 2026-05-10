"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"

interface Session {
  name: string
  city: string
  openHour: number  // Heure d'ouverture en heure LOCALE de la session
  closeHour: number // Heure de fermeture en heure LOCALE de la session
  timezone: string
}

// Heures en heure LOCALE de chaque ville (pas UTC)
const sessions: Session[] = [
  { name: "Sydney", city: "SYD", openHour: 7, closeHour: 16, timezone: "Australia/Sydney" },   // 7h-16h Sydney
  { name: "Tokyo", city: "TYO", openHour: 9, closeHour: 18, timezone: "Asia/Tokyo" },          // 9h-18h Tokyo
  { name: "London", city: "LDN", openHour: 8, closeHour: 17, timezone: "Europe/London" },      // 8h-17h Londres
  { name: "New York", city: "NYC", openHour: 8, closeHour: 17, timezone: "America/New_York" }, // 8h-17h New York
]

function isSessionOpen(session: Session): boolean {
  // Obtenir l'heure actuelle dans le fuseau horaire de la session
  const now = new Date()
  const localTimeStr = now.toLocaleString("en-US", { 
    timeZone: session.timezone, 
    hour: "numeric", 
    hour12: false,
    weekday: "short"
  })
  
  // Extraire l'heure et le jour
  const parts = localTimeStr.split(" ")
  const dayOfWeek = parts[0] // "Mon", "Tue", etc.
  const localHour = parseInt(parts[1] || localTimeStr, 10)
  
  // Verifier si c'est le weekend (les marches forex sont fermes)
  if (dayOfWeek === "Sat" || dayOfWeek === "Sun") {
    return false
  }
  
  // Verifier si l'heure locale est dans la plage d'ouverture
  if (session.openHour < session.closeHour) {
    return localHour >= session.openHour && localHour < session.closeHour
  } else {
    // Session qui traverse minuit (ex: Sydney si on utilisait 22h-7h)
    return localHour >= session.openHour || localHour < session.closeHour
  }
}

function getLocalTime(timezone: string): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// Convertir une heure d'un fuseau horaire vers le fuseau de l'utilisateur
function convertToUserTimezone(hour: number, fromTimezone: string, userTimezone: string): string {
  // Creer une date aujourd'hui a l'heure specifiee dans le fuseau source
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  
  // Creer une date a l'heure specifiee dans le fuseau source
  const sourceDate = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:00:00`)
  
  // Obtenir l'offset entre les deux fuseaux
  const sourceTime = new Date(sourceDate.toLocaleString("en-US", { timeZone: fromTimezone }))
  const userTime = new Date(sourceDate.toLocaleString("en-US", { timeZone: userTimezone }))
  const offsetMs = userTime.getTime() - sourceTime.getTime()
  
  // Appliquer l'offset
  const convertedDate = new Date(sourceDate.getTime() + offsetMs)
  
  return convertedDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// Obtenir le fuseau horaire de l'utilisateur
function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function SessionStatus() {
  const [sessionStates, setSessionStates] = useState<{ isOpen: boolean; time: string }[]>([])
  const [userTime, setUserTime] = useState<string>("")
  const [userTimezone, setUserTimezone] = useState<string>("")
  const { t } = useI18n()

  useEffect(() => {
    const tz = getUserTimezone()
    setUserTimezone(tz)
    
    const updateSessions = () => {
      // Heure locale de l'utilisateur
      setUserTime(new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }))
      
      setSessionStates(
        sessions.map((session) => ({
          isOpen: isSessionOpen(session),
          time: getLocalTime(session.timezone),
        }))
      )
    }

    updateSessions()
    const interval = setInterval(updateSessions, 1000)
    return () => clearInterval(interval)
  }, [])

  if (sessionStates.length === 0) {
    return null
  }

  // Obtenir le nom court du fuseau horaire
  const getTimezoneShort = (tz: string): string => {
    const parts = tz.split('/')
    return parts[parts.length - 1].replace(/_/g, ' ')
  }

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-card/50 border-b border-border ml-[60px]">
      {/* Heure locale de l'utilisateur */}
      <div className="flex items-center gap-2 pr-4 border-r border-border">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-bold text-foreground tabular-nums">{userTime || "--:--:--"}</span>
        <span className="text-[10px] text-muted-foreground">{getTimezoneShort(userTimezone)}</span>
      </div>
      
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('sessions')}</span>
      <div className="flex items-center gap-4">
        {sessions.map((session, index) => {
          const state = sessionStates[index]
          return (
            <div key={session.name} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  state?.isOpen ? "bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/30"
                }`}
              />
              <span className={`text-sm font-medium ${state?.isOpen ? "text-foreground" : "text-muted-foreground"}`}>
                {session.city}
              </span>
              <span className="text-xs text-muted-foreground">{state?.time || "--:--"}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                state?.isOpen 
                  ? "bg-success/20 text-success" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {state?.isOpen ? t('open') : t('closed')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
