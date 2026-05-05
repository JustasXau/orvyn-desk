'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  prices: any
  bias: any
  news: any[]
}

export function ReportModal({ isOpen, onClose, prices, bias, news }: Props) {
  const [report, setReport]   = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)

  const fetchReport = async () => {
    try {
      setLoading(true)
      setError(false)

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices, bias, news }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReport(data.report ?? '')
    } catch {
      setError(true)
      setReport('Rapport indisponible. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !report) fetchReport()
  }, [isOpen])

  if (!isOpen) return null

  const sections = report.split('##').filter(s => s.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-[#0f172a] border border-[#1f2937] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f2937]">
          <div>
            <h2 className="text-lg font-bold text-white">XAU/USD — Rapport Complet</h2>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Croisement de toutes les données</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8a8a] hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#8a8a8a]">
                <div className="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Génération du rapport en cours...</span>
              </div>
              {[...Array(7)].map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 bg-[#1e293b] rounded w-32" />
                  <div className="h-3 bg-[#1e293b] rounded w-full" />
                  <div className="h-3 bg-[#1e293b] rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">Erreur lors de la génération</p>
              <button
                onClick={fetchReport}
                className="px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm hover:bg-[#6d28d9] transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section, i) => {
                const lines = section.split('\n').filter(l => l.trim())
                const title = lines[0]
                const content = lines.slice(1).join('\n')

                return (
                  <div key={i}>
                    <h3 className="text-[#7c3aed] font-semibold text-sm uppercase tracking-wide mb-2">
                      {title}
                    </h3>
                    <div className="text-sm text-[#f1f5f9] leading-relaxed whitespace-pre-line">
                      {content}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1f2937] flex justify-between items-center">
          <span className="text-xs text-[#8a8a8a]">
            Généré par Gemini 1.5 Flash + Groq
          </span>
          <button
            onClick={fetchReport}
            disabled={loading}
            classNam