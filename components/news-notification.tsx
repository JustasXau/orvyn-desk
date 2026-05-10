"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import useSWR from "swr"
import { X, AlertTriangle, TrendingUp, TrendingDown, Bell, BellOff, ExternalLink, Zap, Flag, Building2, Globe2 } from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Storage key for user preferences
const NOTIFICATION_PREFS_KEY = 'orvyn_notification_prefs'

interface NewsItem {
  id: string
  headline: string
  summary?: string
  category: string
  timestamp: number
  source?: string
  url?: string
  relatedAssets?: string[]
  importance?: number
}

interface Notification {
  id: string
  news: NewsItem
  timestamp: number
  tag: string
  tagColor: string
  tagIcon: 'trump' | 'fed' | 'geo' | 'breaking' | 'high'
}

// Detect specific tags based on news content
function detectTag(headline: string, summary: string = ''): { tag: string; color: string; icon: Notification['tagIcon'] } {
  const text = `${headline} ${summary}`.toLowerCase()
  
  if (text.includes('trump')) {
    return { tag: 'Trump', color: 'bg-orange-500', icon: 'trump' }
  }
  if (text.includes('fed') || text.includes('fomc') || text.includes('powell') || text.includes('rate')) {
    return { tag: 'Fed', color: 'bg-blue-500', icon: 'fed' }
  }
  if (text.includes('iran') || text.includes('russia') || text.includes('china') || text.includes('war') || text.includes('military') || text.includes('sanction')) {
    return { tag: 'Geopolitique', color: 'bg-purple-500', icon: 'geo' }
  }
  if (text.includes('breaking') || text.includes('urgent') || text.includes('flash')) {
    return { tag: 'Breaking', color: 'bg-red-500', icon: 'breaking' }
  }
  return { tag: 'Impact Eleve', color: 'bg-amber-500', icon: 'high' }
}

// Get icon component for tag
function TagIcon({ icon }: { icon: Notification['tagIcon'] }) {
  switch (icon) {
    case 'trump':
      return <Flag className="w-3 h-3" />
    case 'fed':
      return <Building2 className="w-3 h-3" />
    case 'geo':
      return <Globe2 className="w-3 h-3" />
    case 'breaking':
      return <Zap className="w-3 h-3" />
    default:
      return <AlertTriangle className="w-3 h-3" />
  }
}

export function NewsNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastCheckRef = useRef<number>(Date.now())

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY)
      if (saved) {
        const prefs = JSON.parse(saved)
        setNotificationsEnabled(prefs.enabled ?? true)
        setSoundEnabled(prefs.sound ?? true)
      }
    } catch (e) {
      console.log('[v0] Could not load notification preferences')
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((enabled: boolean, sound: boolean) => {
    try {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify({ enabled, sound }))
    } catch (e) {
      console.log('[v0] Could not save notification preferences')
    }
  }, [])

  // Fetch news every 15 seconds
  const { data } = useSWR(notificationsEnabled ? '/api/news?breaking=true' : null, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  })

  // Play notification sound using Web Audio API
  const playSound = useCallback(() => {
    if (!soundEnabled) return
    
    try {
      // Create or reuse audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      
      // Create a pleasant notification sound
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Two-tone notification sound
      oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1) // C#6
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (e) {
      // Audio not supported, fail silently
    }
  }, [soundEnabled])

  // Check for new breaking/high-impact news
  useEffect(() => {
    if (!data?.news || !notificationsEnabled) return

    const now = Date.now()
    const newNotifications: Notification[] = []

    data.news.forEach((news: NewsItem) => {
      // Only show breaking or high-impact news from the last 10 minutes
      const isRecent = news.timestamp > now - 600000 // 10 minutes
      const isImportant = news.category === 'breaking' || 
                          news.category === 'high-impact' || 
                          news.category === 'geopolitical' ||
                          (news.importance && news.importance >= 3)
      const isNew = !seenIds.has(news.id) && news.timestamp > lastCheckRef.current - 60000

      if (isRecent && isImportant && isNew) {
        const tagInfo = detectTag(news.headline, news.summary)
        newNotifications.push({
          id: news.id,
          news,
          timestamp: now,
          tag: tagInfo.tag,
          tagColor: tagInfo.color,
          tagIcon: tagInfo.icon
        })
      }
    })

    if (newNotifications.length > 0) {
      // Add new notifications (keep max 5, remove oldest if needed)
      setNotifications(prev => {
        const combined = [...newNotifications.slice(0, 3), ...prev]
        // Remove duplicates
        const unique = combined.filter((n, i, arr) => 
          arr.findIndex(x => x.news.headline === n.news.headline) === i
        )
        return unique.slice(0, 5) // Max 5 notifications
      })
      
      // Mark as seen
      setSeenIds(prev => {
        const newSet = new Set(prev)
        newNotifications.forEach(n => newSet.add(n.id))
        return newSet
      })

      // Play sound for new notification
      playSound()
    }

    lastCheckRef.current = now
  }, [data, seenIds, playSound, notificationsEnabled])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setNotifications(prev => prev.filter(n => now - n.timestamp < 10000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Dismiss notification
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Toggle notifications
  const toggleNotifications = () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue)
    savePreferences(newValue, soundEnabled)
  }

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    savePreferences(notificationsEnabled, newValue)
  }

  // Open news URL
  const openNews = (url?: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      {/* Notifications Stack — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
        <div className="flex flex-col gap-2 max-w-sm w-full">
          {notifications.map((notification, index) => {
            const progress = Math.max(0, 100 - ((Date.now() - notification.timestamp) / 100))
            
            return (
              <div
                key={notification.id}
                className={cn(
                  "relative bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl overflow-hidden",
                  "animate-in slide-in-from-right-5 fade-in duration-300",
                  notification.tagIcon === 'breaking' ? 'border-red-500/50' : 'border-border'
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                  zIndex: 50 - index
                }}
              >
                {/* Header with tag */}
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 border-b",
                  notification.tagIcon === 'breaking' 
                    ? 'bg-red-500/10 border-red-500/20' 
                    : 'bg-muted/50 border-border'
                )}>
                  <div className="flex items-center gap-2">
                    {/* Tag Badge */}
                    <span className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white",
                      notification.tagColor
                    )}>
                      <TagIcon icon={notification.tagIcon} />
                      {notification.tag}
                    </span>
                    
                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(notification.news.timestamp)}
                    </span>
                  </div>
                  
                  {/* Close button */}
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-foreground leading-tight mb-1.5 line-clamp-2">
                    {stripHtml(notification.news.headline)}
                  </h4>
                  
                  {notification.news.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {stripHtml(notification.news.summary)}
                    </p>
                  )}

                  {/* Related Assets */}
                  {notification.news.relatedAssets && notification.news.relatedAssets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {notification.news.relatedAssets.slice(0, 4).map((asset, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-muted text-[10px] font-medium rounded text-muted-foreground"
                        >
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Source & View More */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">
                      {notification.news.source || 'News'}
                    </span>
                    
                    <button
                      onClick={() => openNews(notification.news.url)}
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                    >
                      Voir plus
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress bar for auto-dismiss (10 seconds) */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-linear",
                      notification.tagIcon === 'breaking' ? 'bg-red-500' : 'bg-primary/50'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Export settings component for use in settings page
export function NotificationSettings() {
  const [enabled, setEnabled] = useState(true)
  const [sound, setSound] = useState(true)

  // Load preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY)
      if (saved) {
        const prefs = JSON.parse(saved)
        setEnabled(prefs.enabled ?? true)
        setSound(prefs.sound ?? true)
      }
    } catch (e) {}
  }, [])

  // Save preferences
  const updatePrefs = (newEnabled: boolean, newSound: boolean) => {
    setEnabled(newEnabled)
    setSound(newSound)
    try {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify({ enabled: newEnabled, sound: newSound }))
      // Dispatch event to notify NewsNotification component
      window.dispatchEvent(new CustomEvent('notification-prefs-changed', { 
        detail: { enabled: newEnabled, sound: newSound } 
      }))
    } catch (e) {}
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Notifications News</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Notifications pop-up</p>
          <p className="text-xs text-muted-foreground">
            Afficher les alertes pour les news a Impact Eleve
          </p>
        </div>
        <button
          onClick={() => updatePrefs(!enabled, sound)}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span 
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              enabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
          <div>
            <p className="text-sm font-medium">Son de notification</p>
            <p className="text-xs text-muted-foreground">
              Jouer un son discret pour chaque alerte
            </p>
          </div>
          <button
            onClick={() => updatePrefs(enabled, !sound)}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors",
              sound ? "bg-primary" : "bg-muted"
            )}
          >
            <span 
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                sound ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      )}
    </div>
  )
}

// Helper functions
function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "A l'instant"
  if (diffMins < 60) return `Il y a ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`
  return `Il y a ${Math.floor(diffHours / 24)}j`
}

function stripHtml(html: string): string {
  if (!html) return ""
  let text = html.replace(/<[^>]*>/g, ' ')
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&apos;/g, "'")
  text = text.replace(/\s+/g, ' ').trim()
  return text
}
