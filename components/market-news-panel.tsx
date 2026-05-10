"use client"

import { useState } from "react"
import useSWR from "swr"
import { useI18n } from "@/lib/i18n"

interface NewsArticle {
  id: string
  headline: string
  summary: string
  source: string
  datetime: number
  category: string
  url: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function MarketNewsPanel() {
  const [activeTab, setActiveTab] = useState<"recent" | "summary">("recent")
  const { t } = useI18n()
  
  const { data, isLoading } = useSWR<{ news: NewsArticle[] }>("/api/news", fetcher, {
    refreshInterval: 60000
  })

  const articles = data?.news || []

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header with tabs */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{t('marketNews')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === "recent"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('recentNews')}
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === "summary"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('summary')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-3 bg-secondary rounded w-full mb-1" />
                <div className="h-3 bg-secondary rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : activeTab === "recent" ? (
          articles.slice(0, 10).map((article) => (
            <article key={article.id} className="group">
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <h4 className="text-sm font-medium text-primary group-hover:text-primary/80 mb-2 leading-snug">
                  {article.headline}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {article.summary}
                </p>
              </a>
            </article>
          ))
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">Résumé des marchés</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les marchés mondiaux affichent une volatilité accrue en raison des incertitudes liées à la politique monétaire de la Fed 
                et des tensions géopolitiques persistantes. {"L'or"} reste soutenu par la demande de valeur refuge, tandis que les indices 
                américains réagissent aux résultats des entreprises technologiques. Le dollar maintient sa force face aux devises majeures.
              </p>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">Points clés</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  La Fed maintient ses taux, signalant une approche prudente
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Les tensions au Moyen-Orient soutiennent les prix du pétrole
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Les résultats tech mitigés pèsent sur le Nasdaq
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Achats {"d'or"} continus par les banques centrales
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
