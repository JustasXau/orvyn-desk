'use client'

import { useState } from 'react'
import { ReportModal } from './ReportModal'

interface Props {
  prices: any
  bias: any
  news: any[]
}

export function ReportButton({ prices, bias, news }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-violet-500/20"
      >
        <span>📄</span>
        <span>Rapport Complet</span>
      </button>

      <ReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        prices={prices}
        bias={bias}
        news={news}
      />
    </>
  )
}