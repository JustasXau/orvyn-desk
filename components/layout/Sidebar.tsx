'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Newspaper, Calendar, Shield, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',            icon: Home,       label: 'Tableau de bord' },
  { href: '/news',        icon: Newspaper,  label: "Fil d'actualité" },
  { href: '/calendar',    icon: Calendar,   label: 'Calendrier' },
  { href: '/geopolitics', icon: Shield,     label: 'Géopolitique' },
  { href: '/cot',         icon: BarChart2,  label: 'Rapport COT' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="group fixed left-0 top-0 z-50 h-screen w-16 hover:w-48 bg-[#1e293b] border-r border-[#1f2937] transition-all duration-300 ease-in-out overflow-hidden flex flex-col">
      
      {/* Logo */}
      <div className="p-4 border-b border-[#1f2937] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#7c3aed] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">OD</span>
        </div>
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white font-semibold text-sm">
          Orvyn Desk
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-[#7c3aed] text-white'
                      : 'text-[#8a8a8a] hover:bg-[#334155] hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-[#1f2937]">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 text-[#8a8a8a] hover:bg-[#334155] hover:text-white rounded-lg transition-colors">
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
            Paramètres
          </span>
        </button>
      </div>
    </aside>
  )
}