'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Country = {
  code: string
  label: string
  flag: string
  calendarCode: string
  bonds: { symbol: string; label: string }[]
  indices: { symbol: string; label: string }[]
  currency: { symbol: string; label: string }
}

// ─── Country Data ─────────────────────────────────────────────────────────────

const COUNTRIES: Country[] = [
  {
    code: 'US',
    label: 'Etats-Unis',
    flag: '🇺🇸',
    calendarCode: 'us',
    bonds: [
      { symbol: 'TVC:US10Y', label: 'US 10 Ans' },
      { symbol: 'TVC:US02Y', label: 'US 2 Ans' },
      { symbol: 'TVC:US30Y', label: 'US 30 Ans' },
      { symbol: 'TVC:DXY',   label: 'Dollar Index' },
    ],
    indices: [
      { symbol: 'FOREXCOM:SPXUSD', label: 'S&P 500' },
      { symbol: 'FOREXCOM:NSXUSD', label: 'Nasdaq 100' },
      { symbol: 'FOREXCOM:DJI',    label: 'Dow Jones' },
      { symbol: 'TVC:VIX',         label: 'VIX' },
    ],
    currency: { symbol: 'TVC:DXY', label: 'Dollar Index (DXY)' },
  },
  {
    code: 'EU',
    label: 'Zone Euro',
    flag: '🇪🇺',
    calendarCode: 'eu',
    bonds: [
      { symbol: 'TVC:DE10Y', label: 'Allemagne 10 Ans' },
      { symbol: 'TVC:FR10Y', label: 'France 10 Ans' },
      { symbol: 'TVC:IT10Y', label: 'Italie 10 Ans' },
      { symbol: 'TVC:ES10Y', label: 'Espagne 10 Ans' },
    ],
    indices: [
      { symbol: 'XETR:DAX',        label: 'DAX 40' },
      { symbol: 'EURONEXT:CAC40',   label: 'CAC 40' },
      { symbol: 'INDEX:SX5E',       label: 'Euro Stoxx 50' },
      { symbol: 'EURONEXT:AEX',     label: 'AEX' },
    ],
    currency: { symbol: 'FX:EURUSD', label: 'EUR/USD' },
  },
  {
    code: 'GB',
    label: 'Royaume-Uni',
    flag: '🇬🇧',
    calendarCode: 'gb',
    bonds: [
      { symbol: 'TVC:GB10Y', label: 'UK 10 Ans' },
      { symbol: 'TVC:GB02Y', label: 'UK 2 Ans' },
      { symbol: 'TVC:GB30Y', label: 'UK 30 Ans' },
      { symbol: 'TVC:GB05Y', label: 'UK 5 Ans' },
    ],
    indices: [
      { symbol: 'SPREADEX:UK100', label: 'FTSE 100' },
      { symbol: 'INDEX:UKX',     label: 'UK 250' },
      { symbol: 'FX:GBPUSD',     label: 'GBP/USD' },
      { symbol: 'FX:EURGBP',     label: 'EUR/GBP' },
    ],
    currency: { symbol: 'FX:GBPUSD', label: 'GBP/USD' },
  },
  {
    code: 'JP',
    label: 'Japon',
    flag: '🇯🇵',
    calendarCode: 'jp',
    bonds: [
      { symbol: 'TVC:JP10Y', label: 'JPN 10 Ans' },
      { symbol: 'TVC:JP02Y', label: 'JPN 2 Ans' },
      { symbol: 'TVC:JP30Y', label: 'JPN 30 Ans' },
      { symbol: 'FX:USDJPY', label: 'USD/JPY' },
    ],
    indices: [
      { symbol: 'INDEX:NKY',   label: 'Nikkei 225' },
      { symbol: 'INDEX:TPX',   label: 'TOPIX' },
      { symbol: 'FX:USDJPY',   label: 'USD/JPY' },
      { symbol: 'FX:EURJPY',   label: 'EUR/JPY' },
    ],
    currency: { symbol: 'FX:USDJPY', label: 'USD/JPY' },
  },
  {
    code: 'CA',
    label: 'Canada',
    flag: '🇨🇦',
    calendarCode: 'ca',
    bonds: [
      { symbol: 'TVC:CA10Y', label: 'CA 10 Ans' },
      { symbol: 'TVC:CA02Y', label: 'CA 2 Ans' },
      { symbol: 'FX:USDCAD', label: 'USD/CAD' },
      { symbol: 'TVC:USOIL', label: 'WTI Petrole' },
    ],
    indices: [
      { symbol: 'INDEX:SPTSX', label: 'TSX Composite' },
      { symbol: 'FX:USDCAD',   label: 'USD/CAD' },
      { symbol: 'TVC:USOIL',   label: 'Petrole WTI' },
      { symbol: 'TVC:GOLD',    label: 'Or' },
    ],
    currency: { symbol: 'FX:USDCAD', label: 'USD/CAD' },
  },
  {
    code: 'AU',
    label: 'Australie',
    flag: '🇦🇺',
    calendarCode: 'au',
    bonds: [
      { symbol: 'TVC:AU10Y', label: 'AUS 10 Ans' },
      { symbol: 'TVC:AU02Y', label: 'AUS 2 Ans' },
      { symbol: 'FX:AUDUSD', label: 'AUD/USD' },
      { symbol: 'TVC:GOLD',  label: 'Or' },
    ],
    indices: [
      { symbol: 'INDEX:AS51', label: 'ASX 200' },
      { symbol: 'FX:AUDUSD', label: 'AUD/USD' },
      { symbol: 'FX:AUDNZD', label: 'AUD/NZD' },
      { symbol: 'TVC:GOLD',  label: 'Or' },
    ],
    currency: { symbol: 'FX:AUDUSD', label: 'AUD/USD' },
  },
  {
    code: 'CH',
    label: 'Suisse',
    flag: '🇨🇭',
    calendarCode: 'ch',
    bonds: [
      { symbol: 'TVC:CH10Y', label: 'CH 10 Ans' },
      { symbol: 'TVC:CH02Y', label: 'CH 2 Ans' },
      { symbol: 'FX:USDCHF', label: 'USD/CHF' },
      { symbol: 'FX:EURCHF', label: 'EUR/CHF' },
    ],
    indices: [
      { symbol: 'INDEX:SMI', label: 'SMI' },
      { symbol: 'FX:USDCHF', label: 'USD/CHF' },
      { symbol: 'FX:EURCHF', label: 'EUR/CHF' },
      { symbol: 'TVC:GOLD',  label: 'Or' },
    ],
    currency: { symbol: 'FX:USDCHF', label: 'USD/CHF' },
  },
  {
    code: 'CN',
    label: 'Chine',
    flag: '🇨🇳',
    calendarCode: 'cn',
    bonds: [
      { symbol: 'TVC:CN10Y', label: 'CN 10 Ans' },
      { symbol: 'TVC:CN02Y', label: 'CN 2 Ans' },
      { symbol: 'FX:USDCNH', label: 'USD/CNH' },
      { symbol: 'TVC:GOLD',  label: 'Or' },
    ],
    indices: [
      { symbol: 'SSE:000001',   label: 'Shanghai Composite' },
      { symbol: 'SZSE:399001',  label: 'Shenzhen Component' },
      { symbol: 'INDEX:HSI',    label: 'Hang Seng' },
      { symbol: 'FX:USDCNH',   label: 'USD/CNH' },
    ],
    currency: { symbol: 'FX:USDCNH', label: 'USD/CNH' },
  },
]

// ─── Widgets ──────────────────────────────────────────────────────────────────

// Uses the single-ticker widget which supports all TVC/FX symbols freely
function SingleTickerWidget({ symbol, label }: { symbol: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    wrapper.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      colorTheme: 'dark',
      isTransparent: true,
      locale: 'fr',
    })
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)
  }, [symbol])

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <p className="text-xs text-primary font-semibold mb-2 truncate">{label}</p>
      <div ref={containerRef} style={{ minHeight: 60 }} />
    </div>
  )
}

function EconomicCalendarWidget({ countryCode }: { countryCode: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    wrapper.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: 550,
      locale: 'fr',
      importanceFilter: '-1,0,1',
      countryFilter: countryCode.toLowerCase(),
    })
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)
  }, [countryCode])

  return (
    <div ref={containerRef} style={{ minHeight: 550 }} />
  )
}

function MarketQuotesWidget({ country }: { country: Country }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    wrapper.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: 400,
      symbolsGroups: [
        {
          name: 'Obligations',
          symbols: country.bonds.map(b => ({ name: b.symbol, displayName: b.label })),
        },
        {
          name: 'Indices & Marches',
          symbols: country.indices.map(i => ({ name: i.symbol, displayName: i.label })),
        },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      colorTheme: 'dark',
      locale: 'fr',
    })
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)
  }, [country.code])

  return (
    <div ref={containerRef} style={{ minHeight: 400 }} />
  )
}

function ForexCrossWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    wrapper.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: 400,
      currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'],
      isTransparent: true,
      colorTheme: 'dark',
      locale: 'fr',
    })
    wrapper.appendChild(script)
    containerRef.current.appendChild(wrapper)
  }, [])

  return <div ref={containerRef} style={{ minHeight: 400 }} />
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{count}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EconomicsView() {
  const [selectedCode, setSelectedCode] = useState('US')
  const [showMenu, setShowMenu] = useState(false)

  const country = COUNTRIES.find(c => c.code === selectedCode) || COUNTRIES[0]

  return (
    <div className="p-6 overflow-y-auto h-full" onClick={() => showMenu && setShowMenu(false)}>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Economie</h1>
          <p className="text-muted-foreground text-sm">Indicateurs economiques en temps reel</p>
        </div>

        {/* Country picker */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors min-w-44"
          >
            <Globe className="w-4 h-4 text-primary" />
            <span>{country.flag} {country.label}</span>
            <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', showMenu && 'rotate-180')} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-xl z-50 min-w-44 overflow-hidden">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => { setSelectedCode(c.code); setShowMenu(false) }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2',
                    selectedCode === c.code && 'bg-primary/10 text-primary font-semibold'
                  )}
                >
                  <span>{c.flag}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendrier Economique */}
      <section className="mb-10">
        <SectionHeader title={`Calendrier Economique — ${country.label}`} count={1} />
        <div className="bg-card rounded-lg border border-border p-4">
          <EconomicCalendarWidget key={`cal-${selectedCode}`} countryCode={country.calendarCode} />
        </div>
      </section>

      {/* Marches & Prix en Direct */}
      <section className="mb-10">
        <SectionHeader title="Marches & Prix en Direct" count={2} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Obligations & Indices</p>
            <MarketQuotesWidget key={`mq-${selectedCode}`} country={country} />
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Taux de Change Croises</p>
            <ForexCrossWidget />
          </div>
        </div>
      </section>

      {/* Taux Obligataires */}
      <section className="mb-10">
        <SectionHeader title={`Taux Obligataires — ${country.label}`} count={country.bonds.length} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {country.bonds.map(b => (
            <SingleTickerWidget key={`${selectedCode}-${b.symbol}`} symbol={b.symbol} label={b.label} />
          ))}
        </div>
      </section>

      {/* Indices */}
      <section className="mb-10">
        <SectionHeader title={`Indices — ${country.label}`} count={country.indices.length} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {country.indices.map(i => (
            <SingleTickerWidget key={`${selectedCode}-${i.symbol}`} symbol={i.symbol} label={i.label} />
          ))}
        </div>
      </section>

      {/* Commodites globales */}
      <section className="mb-10">
        <SectionHeader title="Commodites" count={4} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SingleTickerWidget symbol="TVC:GOLD"   label="Or (XAU/USD)" />
          <SingleTickerWidget symbol="TVC:SILVER" label="Argent (XAG/USD)" />
          <SingleTickerWidget symbol="TVC:USOIL"  label="Petrole WTI" />
          <SingleTickerWidget symbol="TVC:UKOIL"  label="Petrole Brent" />
        </div>
      </section>

    </div>
  )
}
