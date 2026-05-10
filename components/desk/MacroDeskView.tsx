'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { RefreshCw, LayoutGrid, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PairCard, PairCardSkeleton } from './PairCard'
import { AssetDeepDive } from '../asset-deep-dive'
import type { PairCategory } from '@/lib/pairs/config'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STORAGE_KEY = 'goldroom-pair-order'

// Load saved order from localStorage
function loadSavedOrder(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

// Save order to localStorage
function saveOrder(order: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {}
}

const CATEGORIES: { id: PairCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'metal', label: 'Métaux' },
  { id: 'index', label: 'Indices' },
  { id: 'commodity', label: 'Commodités' },
  { id: 'forex', label: 'Forex' },
  { id: 'rate', label: 'Taux' },
  { id: 'volatility', label: 'Volatilité' },
]

export function MacroDeskView() {
  const [activePairId, setActivePairId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [orderedPairs, setOrderedPairs] = useState<any[]>([])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR('/api/desk/overview', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 3 * 60 * 1000,
  })

  // Sync pairs with saved order when data loads
  useEffect(() => {
    if (!data?.pairs) return
    
    const savedOrder = loadSavedOrder()
    if (savedOrder.length > 0) {
      // Sort pairs by saved order, new pairs go to end
      const sorted = [...data.pairs].sort((a: any, b: any) => {
        const aIdx = savedOrder.indexOf(a.id)
        const bIdx = savedOrder.indexOf(b.id)
        if (aIdx === -1 && bIdx === -1) return 0
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
      setOrderedPairs(sorted)
    } else {
      setOrderedPairs(data.pairs)
    }
  }, [data?.pairs])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, pairId: string) => {
    setDraggedId(pairId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', pairId)
    // Add drag image styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedId(null)
    setDragOverId(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, pairId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (pairId !== draggedId) {
      setDragOverId(pairId)
    }
  }, [draggedId])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    
    if (sourceId && sourceId !== targetId) {
      setOrderedPairs(prev => {
        const newPairs = [...prev]
        const sourceIdx = newPairs.findIndex(p => p.id === sourceId)
        const targetIdx = newPairs.findIndex(p => p.id === targetId)
        
        if (sourceIdx !== -1 && targetIdx !== -1) {
          // Remove source and insert at target position
          const [removed] = newPairs.splice(sourceIdx, 1)
          newPairs.splice(targetIdx, 0, removed)
          
          // Save new order
          saveOrder(newPairs.map(p => p.id))
        }
        return newPairs
      })
    }
    
    setDraggedId(null)
    setDragOverId(null)
  }, [])

  if (activePairId) {
    return <AssetDeepDive symbol={activePairId} onBack={() => setActivePairId(null)} />
  }

  const pairs = orderedPairs.length > 0 ? orderedPairs : (data?.pairs || [])
  const filtered = categoryFilter === 'all' ? pairs : pairs.filter((p: any) => p.category === categoryFilter)
  const macro = data?.macro

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 md:gap-3">
          <LayoutGrid className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">GOLD ROOM</h2>
          <span className="text-[10px] text-zinc-500">{pairs.length} paires</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {macro && (
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-zinc-500">
              {macro.fedFundsRate != null && <span>FED <span className="text-zinc-300">{macro.fedFundsRate.toFixed(2)}%</span></span>}
              {macro.us10y != null && <span>10Y <span className="text-zinc-300">{macro.us10y.toFixed(2)}%</span></span>}
              {macro.vix != null && <span>VIX <span className="text-zinc-300">{macro.vix.toFixed(1)}</span></span>}
            </div>
          )}
          {orderedPairs.length > 0 && loadSavedOrder().length > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY)
                if (data?.pairs) setOrderedPairs(data.pairs)
              }}
              className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Réinitialiser l'ordre"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Category Filter - scrollable on mobile */}
      <div className="shrink-0 flex items-center gap-1.5 px-4 md:px-6 py-3 border-b border-zinc-800/50 overflow-x-auto scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all',
              categoryFilter === cat.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-zinc-700'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {isLoading
            ? Array.from({ length: 9 }).map((_, i) => <PairCardSkeleton key={i} />)
            : filtered.map((pair: any) => (
                <div
                  key={pair.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pair.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, pair.id)}
                  onDrop={(e) => handleDrop(e, pair.id)}
                  className={cn(
                    'relative transition-all duration-200 cursor-grab active:cursor-grabbing',
                    draggedId === pair.id && 'opacity-50 scale-95',
                    dragOverId === pair.id && draggedId !== pair.id && 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900 rounded-xl'
                  )}
                >
                  {/* Drag handle indicator */}
                  <div className="absolute top-2 right-2 z-10 p-1 rounded bg-zinc-800/80 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-zinc-500" />
                  </div>
                  <PairCard
                    {...pair}
                    onClick={() => setActivePairId(pair.id)}
                    isActive={activePairId === pair.id}
                  />
                </div>
              ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <LayoutGrid className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">Aucune paire dans cette catégorie</p>
          </div>
        )}

        {data?.updatedAt && (
          <p className="text-center text-[10px] text-zinc-700 mt-6 font-mono">
            Mis à jour: {new Date(data.updatedAt).toLocaleTimeString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  )
}
