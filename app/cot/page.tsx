import { ExternalLink } from 'lucide-react'

export default function COTPage() {
  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rapport COT Gold</h1>
        <p className="text-sm text-[#8a8a8a]">Commitments of Traders — CFTC</p>
      </div>

      {/* Info */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
        <h2 className="text-sm font-semibold text-white mb-3">À propos du rapport COT</h2>
        <div className="space-y-3 text-sm text-[#8a8a8a]">
          <p>
            Le rapport <span className="text-white font-medium">Commitments of Traders</span> est
            publié chaque <span className="text-[#7c3aed] font-medium">vendredi à 15h30 EST</span> par
            la CFTC (Commodity Futures Trading Commission).
          </p>
          <p>
            Il montre les positions des différents types de traders sur les futures Gold (GC=F).
          </p>
        </div>

        
          href="https://www.cftc.gov/dea/futures/deacmesf.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 text-sm text-[#7c3aed] hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Voir le rapport officiel CFTC
        </a>
      </div>

      {/* Tableau */}
      <div className="bg-[#1e293b] rounded-xl border border-[#1f2937] overflow-hidden">
        <div className="p-4 border-b border-[#1f2937]">
          <h2 className="text-sm font-semibold text-white">Structure du rapport</h2>
        </div>
        <div className="divide-y divide-[#1f2937]">
          {[
            {
              category: 'Commerciaux',
              description: 'Producteurs et consommateurs réels (mines d\'or, banques)',
              signal: 'Contrarian — souvent short quand le marché monte',
              color: 'text-blue-400',
            },
            {
              category: 'Non-commerciaux',
              description: 'Fonds spéculatifs, hedge funds, grands traders',
              signal: 'Momentum — suivent la tendance principale',
              color: 'text-green-400',
            },
            {
              category: 'Non-reportables',
              description: 'Petits traders individuels',
              signal: 'Peu d\'impact sur le marché gold',
              color: 'text-yellow-400',
            },
          ].map(item => (
            <div key={item.category} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold ${item.color}`}>{item.category}</p>
                  <p className="text-xs text-[#8a8a8a] mt-1">{item.description}</p>
                </div>
                <p className="text-xs text-[#8a8a8a] text-right max-w-48">{item.signal}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signal */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#1f2937]">
        <h2 className="text-sm font-semibold text-white mb-3">Comment l'utiliser</h2>
        <div className="space-y-2 text-xs text-[#8a8a8a]">
          <div className="flex items-start gap-2">
            <span className="text-green-400 flex-shrink-0">↑</span>
            <span>Non-commerciaux très longs → Potentiel retournement baissier (surachat spéculatif)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 flex-shrink-0">↓</span>
            <span>Non-commerciaux très courts → Potentiel rebond haussier (survente spéculative)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7c3aed] flex-shrink-0">→</span>
            <span>Commerciaux fortement shorts → Ils hedgent leur production, signal neutre à long terme</span>
          </div>
        </div>
      </div>

      {/* Prochaine publication */}
      <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-xl p-4 text-center">
        <p className="text-sm text-[#7c3aed] font-medium">