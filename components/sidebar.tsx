"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Newspaper, 
  Calendar, 
  User,
  Settings,
  LogOut,
  BarChart3,
  Percent,
  BookOpen,
  Shield,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n, Language } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { NotificationSettings } from "./news-notification"
import { OrbitalLogo } from "./orbital-logo"

const languages: { code: Language; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isExpanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

export function Sidebar({ activeTab, onTabChange, isExpanded, onExpandedChange }: SidebarProps) {
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { language, setLanguage, t } = useI18n()

  const currentLang = languages.find(l => l.code === language) || languages[0]

  // Check if user is admin
  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(data => {
        console.log('[v0] Admin check response:', data)
        setIsAdmin(data.isAdmin)
      })
      .catch((err) => {
        console.log('[v0] Admin check error:', err)
        setIsAdmin(false)
      })
  }, [])

  const menuItems = [
    { id: "news", label: t('newsFeed'), icon: Newspaper, badge: true },
    { id: "macro-desk", label: "GOLD ROOM", icon: ArrowRight },
    { id: "economics", label: "Economie", icon: BookOpen },
    { id: "calendar", label: t('economicCalendar'), icon: Calendar },
    { id: "trump", label: t('trumpTracker'), icon: User },
    { id: "cot", label: "Rapport COT", icon: BarChart3 },
    ...(isAdmin ? [{ id: "admin", label: "Administration", icon: Shield }] : []),
  ]

  return (
    <aside 
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => { onExpandedChange(false); setShowLangMenu(false) }}
      className={cn(
        "flex flex-col shrink-0",
        "bg-sidebar-bg border-r border-sidebar-border",
        "transition-[width] duration-250 ease-in-out",
        // Desktop: full height fixed width
        "md:h-screen",
        // Mobile: auto height, full width (used inside slide-down menu)
        "h-auto w-full md:w-auto",
        isExpanded ? "md:w-60" : "md:w-[60px]"
      )}
    >
      {/* Header / Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 shrink-0">
          <OrbitalLogo size={32} />
        </div>
        <span className={cn(
          "font-semibold text-foreground whitespace-nowrap overflow-hidden transition-opacity duration-200",
          isExpanded ? "opacity-100" : "opacity-0 w-0"
        )}>
          {t('orvynDesk')}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden py-3 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-accent text-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <div className="relative shrink-0">
                    <Icon className="h-5 w-5" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
                    )}
                  </div>
                  <span className={cn(
                    "whitespace-nowrap overflow-hidden transition-opacity duration-200",
                    isExpanded ? "opacity-100" : "opacity-0 w-0"
                  )}>
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        
      </nav>

      {/* Footer - Language & Settings */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className={cn(
          "flex items-center",
          isExpanded ? "justify-between" : "flex-col gap-2"
        )}>
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-lg leading-none">{currentLang.flag}</span>
              {isExpanded && <span className="text-sm">{currentLang.label}</span>}
            </button>

            {showLangMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[100px] z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setShowLangMenu(false) }}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors text-sm",
                      language === lang.code && "bg-accent"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className={cn(
              "p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground",
              isExpanded && "flex items-center gap-2"
            )}
            title="Parametres"
          >
            <Settings className="w-5 h-5" />
            {isExpanded && <span className="text-sm">Parametres</span>}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </aside>
  )
}

// Settings Modal Component
function SettingsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load real user data from Supabase
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setEmail(user.email || '')
          setName(user.user_metadata?.full_name || user.user_metadata?.name || '')
          setAvatarUrl(user.user_metadata?.avatar_url || null)
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la deconnexion.' })
      setLoggingOut(false)
    }
  }

  // Upload avatar to Supabase Storage and save URL to user metadata
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image trop grande. Max 2MB.' })
      return
    }
    setAvatarUploading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecte')

      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`

      // Upload to storage bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      // Save to user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })
      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      setMessage({ type: 'success', text: 'Photo de profil mise a jour!' })
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setMessage({ type: 'error', text: "Erreur lors de l'upload: " + (err.message || 'Inconnu') })
    } finally {
      setAvatarUploading(false)
    }
  }

  // Save display name to Supabase user metadata
  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name }
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Profil mis a jour avec succes!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise a jour.' })
    } finally {
      setSaving(false)
    }
  }

  // Change password via Supabase Auth
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caracteres.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMessage({ type: 'success', text: 'Mot de passe modifie avec succes!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors du changement.' })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profil' },
    { id: 'security', label: 'Securite' },
    { id: 'preferences', label: 'Preferences' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Parametres</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMessage(null) }}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {message && (
            <div className={cn(
              "mb-4 p-3 rounded-lg text-sm",
              message.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Profile Photo */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                  {avatarUploading ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {avatarUploading ? 'Upload en cours...' : 'Changer la photo'}
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">L&apos;email ne peut pas etre modifie ici.</p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Entrez votre nouveau mot de passe. Vous serez reconnecter automatiquement.</p>

              <div>
                <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Min. 8 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Confirmer"
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={saving || !newPassword || !confirmPassword}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border border-border">
                <NotificationSettings />
              </div>

              {/* Logout */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {loggingOut ? 'Deconnexion...' : 'Se deconnecter'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
