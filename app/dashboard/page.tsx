"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { TradingDashboard } from "@/components/trading-dashboard"
import { Menu, X, Newspaper, LayoutGrid, BookOpen, Calendar, User, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("news")
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const bottomNavItems = [
    { id: "news", label: "News", icon: Newspaper },
    { id: "macro-desk", label: "GOLD ROOM", icon: LayoutGrid },
    { id: "economics", label: "Economie", icon: BookOpen },
    { id: "calendar", label: "Calendrier", icon: Calendar },
    { id: "cot", label: "COT", icon: BarChart3 },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isExpanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />
      )}

      {/* Mobile: Top Header Bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar-bg border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-bold">O</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Orvyn Desk</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Mobile: Slide-down full menu */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 z-40 bg-sidebar-bg border-b border-sidebar-border shadow-xl">
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isExpanded={true}
              onExpandedChange={() => {}}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 overflow-hidden",
          isMobile && "pt-14 pb-16"
        )}
      >
        <TradingDashboard activeView={activeTab} onViewChange={handleTabChange} />
      </main>

      {/* Mobile: Bottom Navigation Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-16 flex items-center bg-sidebar-bg border-t border-sidebar-border px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium leading-none truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
