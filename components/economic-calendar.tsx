"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { Calendar, Search, ChevronDown, RefreshCw, Brain, Bookmark, X, Info, TrendingUp, TrendingDown, Clock, ChevronRight, BarChart3 } from "lucide-react"
import { CalendarEventRow } from "./calendar-event-row"

interface EconomicEvent {
  id: string
  date: string
  time: string
  country: string
  currency: string
  event: string
  impact: 'high' | 'medium' | 'low' | 'none'
  actual: string | null
  forecast: string | null
  previous: string | null
  bankForecast?: string | null
  min?: string | null
  max?: string | null
}

interface CalendarData {
  events: EconomicEvent[]
  groupedEvents: Record<string, EconomicEvent[]>
  currencyFlags: Record<string, string>
  timestamp: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Currency and country flags using CDN images for proper display
const currencyFlags: Record<string, string> = {
  // Major currencies
  'USD': 'https://flagcdn.com/w40/us.png',
  'EUR': 'https://flagcdn.com/w40/eu.png',
  'GBP': 'https://flagcdn.com/w40/gb.png',
  'JPY': 'https://flagcdn.com/w40/jp.png',
  'AUD': 'https://flagcdn.com/w40/au.png',
  'CAD': 'https://flagcdn.com/w40/ca.png',
  'CHF': 'https://flagcdn.com/w40/ch.png',
  'NZD': 'https://flagcdn.com/w40/nz.png',
  // Asia
  'CNY': 'https://flagcdn.com/w40/cn.png',
  'CNH': 'https://flagcdn.com/w40/cn.png',
  'SGD': 'https://flagcdn.com/w40/sg.png',
  'HKD': 'https://flagcdn.com/w40/hk.png',
  'KRW': 'https://flagcdn.com/w40/kr.png',
  'INR': 'https://flagcdn.com/w40/in.png',
  'THB': 'https://flagcdn.com/w40/th.png',
  'IDR': 'https://flagcdn.com/w40/id.png',
  'MYR': 'https://flagcdn.com/w40/my.png',
  'PHP': 'https://flagcdn.com/w40/ph.png',
  'TWD': 'https://flagcdn.com/w40/tw.png',
  'VND': 'https://flagcdn.com/w40/vn.png',
  // Americas
  'MXN': 'https://flagcdn.com/w40/mx.png',
  'BRL': 'https://flagcdn.com/w40/br.png',
  'CLP': 'https://flagcdn.com/w40/cl.png',
  'COP': 'https://flagcdn.com/w40/co.png',
  'PEN': 'https://flagcdn.com/w40/pe.png',
  'ARS': 'https://flagcdn.com/w40/ar.png',
  // Europe
  'SEK': 'https://flagcdn.com/w40/se.png',
  'NOK': 'https://flagcdn.com/w40/no.png',
  'DKK': 'https://flagcdn.com/w40/dk.png',
  'PLN': 'https://flagcdn.com/w40/pl.png',
  'CZK': 'https://flagcdn.com/w40/cz.png',
  'HUF': 'https://flagcdn.com/w40/hu.png',
  'RON': 'https://flagcdn.com/w40/ro.png',
  'BGN': 'https://flagcdn.com/w40/bg.png',
  'HRK': 'https://flagcdn.com/w40/hr.png',
  'ISK': 'https://flagcdn.com/w40/is.png',
  // Middle East & Africa
  'TRY': 'https://flagcdn.com/w40/tr.png',
  'RUB': 'https://flagcdn.com/w40/ru.png',
  'ZAR': 'https://flagcdn.com/w40/za.png',
  'ILS': 'https://flagcdn.com/w40/il.png',
  'AED': 'https://flagcdn.com/w40/ae.png',
  'SAR': 'https://flagcdn.com/w40/sa.png',
  'QAR': 'https://flagcdn.com/w40/qa.png',
  'KWD': 'https://flagcdn.com/w40/kw.png',
  'EGP': 'https://flagcdn.com/w40/eg.png',
  'NGN': 'https://flagcdn.com/w40/ng.png',
  'KES': 'https://flagcdn.com/w40/ke.png',
  // Oceania
  'FJD': 'https://flagcdn.com/w40/fj.png',
  // Country codes (for events that use country codes instead of currency)
  'US': 'https://flagcdn.com/w40/us.png',
  'EU': 'https://flagcdn.com/w40/eu.png',
  'UK': 'https://flagcdn.com/w40/gb.png',
  'GB': 'https://flagcdn.com/w40/gb.png',
  'JP': 'https://flagcdn.com/w40/jp.png',
  'AU': 'https://flagcdn.com/w40/au.png',
  'CA': 'https://flagcdn.com/w40/ca.png',
  'CH': 'https://flagcdn.com/w40/ch.png',
  'NZ': 'https://flagcdn.com/w40/nz.png',
  'CN': 'https://flagcdn.com/w40/cn.png',
  'DE': 'https://flagcdn.com/w40/de.png',
  'FR': 'https://flagcdn.com/w40/fr.png',
  'IT': 'https://flagcdn.com/w40/it.png',
  'ES': 'https://flagcdn.com/w40/es.png',
  'PT': 'https://flagcdn.com/w40/pt.png',
  'NL': 'https://flagcdn.com/w40/nl.png',
  'BE': 'https://flagcdn.com/w40/be.png',
  'AT': 'https://flagcdn.com/w40/at.png',
  'GR': 'https://flagcdn.com/w40/gr.png',
  'IE': 'https://flagcdn.com/w40/ie.png',
  'FI': 'https://flagcdn.com/w40/fi.png',
  'SE': 'https://flagcdn.com/w40/se.png',
  'NO': 'https://flagcdn.com/w40/no.png',
  'DK': 'https://flagcdn.com/w40/dk.png',
  'PL': 'https://flagcdn.com/w40/pl.png',
  'CZ': 'https://flagcdn.com/w40/cz.png',
  'HU': 'https://flagcdn.com/w40/hu.png',
  'RO': 'https://flagcdn.com/w40/ro.png',
  'BG': 'https://flagcdn.com/w40/bg.png',
  'HR': 'https://flagcdn.com/w40/hr.png',
  'SK': 'https://flagcdn.com/w40/sk.png',
  'SI': 'https://flagcdn.com/w40/si.png',
  'LT': 'https://flagcdn.com/w40/lt.png',
  'LV': 'https://flagcdn.com/w40/lv.png',
  'EE': 'https://flagcdn.com/w40/ee.png',
  'RU': 'https://flagcdn.com/w40/ru.png',
  'TR': 'https://flagcdn.com/w40/tr.png',
  'IN': 'https://flagcdn.com/w40/in.png',
  'KR': 'https://flagcdn.com/w40/kr.png',
  'SG': 'https://flagcdn.com/w40/sg.png',
  'HK': 'https://flagcdn.com/w40/hk.png',
  'TW': 'https://flagcdn.com/w40/tw.png',
  'TH': 'https://flagcdn.com/w40/th.png',
  'ID': 'https://flagcdn.com/w40/id.png',
  'MY': 'https://flagcdn.com/w40/my.png',
  'PH': 'https://flagcdn.com/w40/ph.png',
  'VN': 'https://flagcdn.com/w40/vn.png',
  'MX': 'https://flagcdn.com/w40/mx.png',
  'BR': 'https://flagcdn.com/w40/br.png',
  'AR': 'https://flagcdn.com/w40/ar.png',
  'CL': 'https://flagcdn.com/w40/cl.png',
  'CO': 'https://flagcdn.com/w40/co.png',
  'PE': 'https://flagcdn.com/w40/pe.png',
  'ZA': 'https://flagcdn.com/w40/za.png',
  'IL': 'https://flagcdn.com/w40/il.png',
  'AE': 'https://flagcdn.com/w40/ae.png',
  'SA': 'https://flagcdn.com/w40/sa.png',
  'EG': 'https://flagcdn.com/w40/eg.png',
  'NG': 'https://flagcdn.com/w40/ng.png',
  'KE': 'https://flagcdn.com/w40/ke.png',
  // Special codes
  'ALL': 'https://flagcdn.com/w40/un.png',
  'NA': 'https://flagcdn.com/w40/un.png',
}

const currencies = Object.entries(currencyFlags).slice(0, 9).map(([code, flag]) => ({
  code,
  flag,
  label: code
}))

const impactFilters = [
  { key: 'high', label: 'Eleve', color: 'bg-destructive' },
  { key: 'medium', label: 'Med', color: 'bg-warning' },
  { key: 'low', label: 'Faible', color: 'bg-yellow-500' },
  { key: 'none', label: 'Aucun', color: 'bg-muted-foreground' },
]

const dayNames: Record<string, Record<number, string>> = {
  fr: { 0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' },
  en: { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' },
  es: { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miercoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sabado' },
  pt: { 0: 'Domingo', 1: 'Segunda', 2: 'Terca', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sabado' },
}

const monthNames: Record<string, Record<number, string>> = {
  fr: { 0: 'janvier', 1: 'fevrier', 2: 'mars', 3: 'avril', 4: 'mai', 5: 'juin', 6: 'juillet', 7: 'aout', 8: 'septembre', 9: 'octobre', 10: 'novembre', 11: 'decembre' },
  en: { 0: 'January', 1: 'February', 2: 'March', 3: 'April', 4: 'May', 5: 'June', 6: 'July', 7: 'August', 8: 'September', 9: 'October', 10: 'November', 11: 'December' },
  es: { 0: 'enero', 1: 'febrero', 2: 'marzo', 3: 'abril', 4: 'mayo', 5: 'junio', 6: 'julio', 7: 'agosto', 8: 'septiembre', 9: 'octubre', 10: 'noviembre', 11: 'diciembre' },
  pt: { 0: 'janeiro', 1: 'fevereiro', 2: 'marco', 3: 'abril', 4: 'maio', 5: 'junho', 6: 'julho', 7: 'agosto', 8: 'setembro', 9: 'outubro', 10: 'novembro', 11: 'dezembro' },
}

const countryNames: Record<string, string> = {
  'US': 'Etats-Unis',
  'EU': 'Zone Euro',
  'GB': 'Royaume-Uni',
  'JP': 'Japon',
  'AU': 'Australie',
  'CA': 'Canada',
  'CH': 'Suisse',
  'NZ': 'Nouvelle-Zelande',
  'CN': 'Chine',
  'DE': 'Allemagne',
  'FR': 'France',
}

// AI Analysis generator based on event type and currency
function generateEventAnalysis(event: EconomicEvent) {
  const eventLower = event.event.toLowerCase()
  const currency = event.currency
  
  // Determine event category
  let category = 'default'
  if (eventLower.includes('pmi') || eventLower.includes('ism')) category = 'pmi'
  else if (eventLower.includes('emploi') || eventLower.includes('employment') || eventLower.includes('nfp') || eventLower.includes('jobless') || eventLower.includes('chomage')) category = 'employment'
  else if (eventLower.includes('inflation') || eventLower.includes('cpi') || eventLower.includes('ipc') || eventLower.includes('prix')) category = 'inflation'
  else if (eventLower.includes('pib') || eventLower.includes('gdp')) category = 'gdp'
  else if (eventLower.includes('taux') || eventLower.includes('rate') || eventLower.includes('fomc') || eventLower.includes('bce') || eventLower.includes('boj') || eventLower.includes('boc') || eventLower.includes('rba') || eventLower.includes('fed')) category = 'rates'
  else if (eventLower.includes('commerce') || eventLower.includes('trade') || eventLower.includes('export') || eventLower.includes('import')) category = 'trade'
  else if (eventLower.includes('vente') || eventLower.includes('retail') || eventLower.includes('consomm')) category = 'retail'
  else if (eventLower.includes('confiance') || eventLower.includes('confidence') || eventLower.includes('sentiment')) category = 'sentiment'
  else if (eventLower.includes('speech') || eventLower.includes('discours') || eventLower.includes('powell') || eventLower.includes('lagarde')) category = 'speech'
  else if (eventLower.includes('logement') || eventLower.includes('housing') || eventLower.includes('immobilier')) category = 'housing'
  else if (eventLower.includes('petrole') || eventLower.includes('oil') || eventLower.includes('eia')) category = 'oil'
  
  const analyses: Record<string, {
    keyPoints: string[]
    tacticalGuide: { aboveMax: { value: number; label: string }; above: { value: number; label: string }; below: { value: number; label: string }; belowMin: { value: number; label: string } }
    explanation: string
  }> = {
    pmi: {
      keyPoints: [
        `Indicateur avance de l'activite economique pour ${currency}`,
        "Un PMI > 50 indique une expansion, < 50 une contraction",
        "Les traders surveillent les composantes emploi et nouvelles commandes",
        "Les ecarts par rapport aux previsions provoquent des mouvements rapides"
      ],
      tacticalGuide: { aboveMax: { value: 55, label: "Tres optimiste" }, above: { value: 52, label: "haussier" }, below: { value: 48, label: "baissier" }, belowMin: { value: 45, label: "Tres baissier" } },
      explanation: `Le PMI mesure la sante du secteur manufacturier ou des services. Un chiffre superieur a 50 suggere une expansion economique, ce qui est generalement haussier pour ${currency}. Surveillez les sous-indices d'emploi et de nouvelles commandes pour anticiper les tendances futures.`
    },
    employment: {
      keyPoints: [
        `Indicateur cle du marche du travail pour ${currency}`,
        "Impact direct sur les decisions de politique monetaire",
        "Les salaires sont aussi importants que le nombre d'emplois",
        "Forte volatilite attendue lors de la publication"
      ],
      tacticalGuide: { aboveMax: { value: 250, label: "Tres optimiste" }, above: { value: 150, label: "haussier" }, below: { value: 50, label: "baissier" }, belowMin: { value: -50, label: "Tres baissier" } },
      explanation: `Les donnees d'emploi sont cruciales pour ${currency} car elles influencent directement les decisions de la banque centrale sur les taux. Un marche du travail solide soutient une politique monetaire restrictive, tandis qu'un affaiblissement peut declencher des baisses de taux.`
    },
    inflation: {
      keyPoints: [
        `Mesure principale de la stabilite des prix pour ${currency}`,
        "Objectif des banques centrales generalement autour de 2%",
        "L'inflation core (hors energie/alimentaire) est souvent plus surveillee",
        "Impact majeur sur les anticipations de taux"
      ],
      tacticalGuide: { aboveMax: { value: 3.5, label: "Tres hawkish" }, above: { value: 2.5, label: "hawkish" }, below: { value: 1.5, label: "dovish" }, belowMin: { value: 1.0, label: "Tres dovish" } },
      explanation: `L'inflation determine largement la politique monetaire. Une inflation superieure aux attentes pousse les banques centrales vers une politique plus restrictive, soutenant ${currency}. Une inflation faible suggere des taux bas plus longtemps, pesant sur la devise.`
    },
    gdp: {
      keyPoints: [
        `Mesure globale de la croissance economique pour ${currency}`,
        "Publication trimestrielle avec revisions importantes",
        "Les composantes (consommation, investissement) sont analysees",
        "Impact modere car donnees retrospectives"
      ],
      tacticalGuide: { aboveMax: { value: 4.0, label: "Tres optimiste" }, above: { value: 2.5, label: "haussier" }, below: { value: 1.0, label: "baissier" }, belowMin: { value: -0.5, label: "Recession" } },
      explanation: `Le PIB offre une vue d'ensemble de la sante economique. Bien que ce soit un indicateur retarde, des surprises significatives peuvent impacter ${currency}, surtout si elles modifient les perspectives de politique monetaire.`
    },
    rates: {
      keyPoints: [
        `Decision de politique monetaire cruciale pour ${currency}`,
        "Le communique et les projections sont aussi importants que la decision",
        "Les marches anticipent souvent - surveillez les surprises",
        "La conference de presse peut inverser la reaction initiale"
      ],
      tacticalGuide: { aboveMax: { value: 0.5, label: "Tres hawkish" }, above: { value: 0.25, label: "hawkish" }, below: { value: -0.25, label: "dovish" }, belowMin: { value: -0.5, label: "Tres dovish" } },
      explanation: `Les decisions de taux sont les evenements les plus impactants pour ${currency}. Le ton du communique et les indications prospectives (forward guidance) determinent souvent la reaction plus que la decision elle-meme. Attention a la volatilite elevee.`
    },
    trade: {
      keyPoints: [
        `Balance commerciale indicateur des flux de capitaux pour ${currency}`,
        "Un surplus soutient la devise, un deficit la penalise",
        "Les relations commerciales geopolitiques influencent les anticipations",
        "Impact modere sauf surprise majeure"
      ],
      tacticalGuide: { aboveMax: { value: 20, label: "Tres positif" }, above: { value: 5, label: "positif" }, below: { value: -10, label: "negatif" }, belowMin: { value: -30, label: "Tres negatif" } },
      explanation: `La balance commerciale reflete la competitivite d'une economie. Un excedent cree une demande naturelle pour ${currency}, tandis qu'un deficit important peut peser sur la devise a long terme.`
    },
    retail: {
      keyPoints: [
        `Indicateur de la consommation des menages pour ${currency}`,
        "La consommation represente ~70% du PIB dans les economies developpees",
        "Sensible aux conditions de credit et a la confiance",
        "Impact modere a fort selon l'ecart aux previsions"
      ],
      tacticalGuide: { aboveMax: { value: 1.5, label: "Tres optimiste" }, above: { value: 0.5, label: "haussier" }, below: { value: -0.3, label: "baissier" }, belowMin: { value: -1.0, label: "Tres baissier" } },
      explanation: `Les ventes au detail refletent la sante du consommateur. Des ventes robustes soutiennent la croissance et potentiellement une politique monetaire plus restrictive, beneficiant a ${currency}.`
    },
    sentiment: {
      keyPoints: [
        `Indicateur avance de l'activite economique future pour ${currency}`,
        "Mesure les anticipations des consommateurs ou entreprises",
        "Peut preceder les changements dans les donnees reelles",
        "Impact modere mais utile pour le contexte"
      ],
      tacticalGuide: { aboveMax: { value: 110, label: "Tres optimiste" }, above: { value: 100, label: "optimiste" }, below: { value: 90, label: "pessimiste" }, belowMin: { value: 80, label: "Tres pessimiste" } },
      explanation: `Les indices de confiance anticipent souvent les tendances economiques. Un sentiment eleve suggere une consommation et des investissements futurs plus forts, ce qui est generalement positif pour ${currency}.`
    },
    speech: {
      keyPoints: [
        `Communication officielle d'un membre de la banque centrale`,
        "Le ton (hawkish/dovish) est analyse mot par mot",
        "Peut reveler des indices sur les futures decisions",
        "La volatilite peut etre elevee si des surprises emergent"
      ],
      tacticalGuide: { aboveMax: { value: 0.5, label: "Tres hawkish" }, above: { value: 0.2, label: "hawkish" }, below: { value: -0.2, label: "dovish" }, belowMin: { value: -0.5, label: "Tres dovish" } },
      explanation: `Les discours des banquiers centraux sont scrutes pour des indices sur la politique future. Un ton plus hawkish que prevu soutient ${currency}, tandis qu'un ton dovish peut la faire baisser.`
    },
    housing: {
      keyPoints: [
        `Indicateur du secteur immobilier pour ${currency}`,
        "Le logement est sensible aux taux d'interet",
        "Indicateur avance de la sante economique",
        "Impact modere sauf mouvement extreme"
      ],
      tacticalGuide: { aboveMax: { value: 15, label: "Tres fort" }, above: { value: 5, label: "solide" }, below: { value: -5, label: "faible" }, belowMin: { value: -15, label: "Contraction" } },
      explanation: `Le marche immobilier reflete la confiance des consommateurs et la sensibilite aux taux. Un secteur immobilier fort suggere une economie saine, soutenant potentiellement ${currency}.`
    },
    oil: {
      keyPoints: [
        "Les stocks de petrole influencent les prix de l'energie",
        "Impact sur l'inflation et les devises liees aux matieres premieres",
        "Publie chaque semaine par l'EIA",
        "CAD, NOK et RUB particulierement sensibles"
      ],
      tacticalGuide: { aboveMax: { value: 5, label: "Baissier petrole" }, above: { value: 2, label: "Legerement baissier" }, below: { value: -2, label: "Haussier petrole" }, belowMin: { value: -5, label: "Tres haussier" } },
      explanation: "Les stocks de petrole influencent les prix de l'energie. Une hausse des stocks pese sur les prix du brut, tandis qu'une baisse les soutient. Les devises liees aux matieres premieres reagissent en consequence."
    },
    default: {
      keyPoints: [
        `Indicateur economique pour ${currency}`,
        "Surveiller l'ecart entre le reel et les previsions",
        "Le contexte de marche influence la reaction",
        "Les revisions des donnees precedentes sont importantes"
      ],
      tacticalGuide: { aboveMax: { value: 0.4, label: "Tres optimiste" }, above: { value: 0.2, label: "haussier" }, below: { value: -0.2, label: "baissier" }, belowMin: { value: -0.4, label: "Tres baissier" } },
      explanation: `Un resultat superieur aux previsions est generalement positif pour ${currency}. Un resultat inferieur peut peser sur la devise. Surveillez le contexte global et les revisions pour une analyse complete.`
    }
  }
  
  const analysis = analyses[category] || analyses.default
  
  // Use actual event data for historical chart if available
  const historicalData: { date: string; actual: number | null; forecast: number | null }[] = []
  
  // Parse actual and previous values from the event
  const parseValue = (val: string | null): number | null => {
    if (!val) return null
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''))
    return isNaN(num) ? null : num
  }
  
  const actualVal = parseValue(event.actual)
  const forecastVal = parseValue(event.forecast)
  const previousVal = parseValue(event.previous)
  
  // Build historical data from real event values
  const months = ["Mai 2026", "Avril 2026", "Mars 2026", "Fevrier 2026", "Janvier 2026"]
  
  // Add previous month data first (oldest)
  if (previousVal !== null) {
    historicalData.push({ date: months[1], actual: previousVal, forecast: previousVal })
  }
  
  // Add current month data (most recent)
  if (actualVal !== null || forecastVal !== null) {
    historicalData.push({ 
      date: months[0], 
      actual: actualVal, 
      forecast: forecastVal 
    })
  }
  
  // Generate AI analysis summary based on the event data
  let aiAnalysis = ""
  if (actualVal !== null && forecastVal !== null) {
    const diff = actualVal - forecastVal
    const diffPercent = forecastVal !== 0 ? ((diff / Math.abs(forecastVal)) * 100).toFixed(1) : "N/A"
    
    if (diff > 0) {
      aiAnalysis = `Le resultat reel (${actualVal}) a depasse les previsions (${forecastVal}) de ${diffPercent}%. `
      if (category === 'employment' || category === 'gdp' || category === 'pmi' || category === 'retail') {
        aiAnalysis += `Cela suggere une economie plus forte que prevu, potentiellement haussier pour ${currency}.`
      } else if (category === 'inflation') {
        aiAnalysis += `Une inflation plus elevee que prevu pourrait pousser la banque centrale vers une politique plus restrictive, soutenant ${currency}.`
      } else {
        aiAnalysis += `Ce resultat positif pourrait soutenir ${currency} a court terme.`
      }
    } else if (diff < 0) {
      aiAnalysis = `Le resultat reel (${actualVal}) est inferieur aux previsions (${forecastVal}) de ${Math.abs(parseFloat(diffPercent))}%. `
      if (category === 'employment' || category === 'gdp' || category === 'pmi' || category === 'retail') {
        aiAnalysis += `Cela indique une faiblesse economique, potentiellement baissier pour ${currency}.`
      } else if (category === 'inflation') {
        aiAnalysis += `Une inflation plus faible que prevu pourrait inciter la banque centrale a maintenir une politique accommodante, pesant sur ${currency}.`
      } else {
        aiAnalysis += `Ce resultat decevant pourrait peser sur ${currency} a court terme.`
      }
    } else {
      aiAnalysis = `Le resultat est conforme aux previsions (${actualVal}). Impact limite attendu sur ${currency}, le marche ayant deja integre ce scenario.`
    }
  } else if (forecastVal !== null && previousVal !== null) {
    const expectedChange = forecastVal - previousVal
    if (expectedChange > 0) {
      aiAnalysis = `Les analystes anticipent une amelioration par rapport au mois precedent (${previousVal} -> ${forecastVal}). Si confirme, cela serait positif pour ${currency}.`
    } else if (expectedChange < 0) {
      aiAnalysis = `Les analystes s'attendent a une deterioration par rapport au mois precedent (${previousVal} -> ${forecastVal}). Prudence recommandee sur ${currency}.`
    } else {
      aiAnalysis = `Stabilite attendue par rapport au mois precedent. Impact neutre anticipe sur ${currency}.`
    }
  } else {
    aiAnalysis = `Surveillez attentivement cette publication. L'ecart par rapport aux previsions determinera la reaction de ${currency}.`
  }
  
  return { ...analysis, historicalData, aiAnalysis }
}

function getTimeUntilEvent(date: string, time: string): string {
  const now = new Date()
  const eventDate = new Date(date)
  const timeParts = time.replace(' h ', ':').replace(' h', ':00').split(':')
  eventDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1] || '0'))
  
  const diff = eventDate.getTime() - now.getTime()
  if (diff < 0) return "Passe"
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `dans environ ${days} jour${days > 1 ? 's' : ''}`
  }
  return `dans environ ${hours} heure${hours > 1 ? 's' : ''}`
}

// Mini Chart Component for Historical Data
function MiniChart({ data }: { data: { date: string; actual: number | null; forecast: number | null }[] }) {
  // Filter out entries with null values for chart calculation
  const validData = data.filter(d => d.actual !== null || d.forecast !== null)
  
  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
        Aucune donnee historique disponible
      </div>
    )
  }
  
  const allValues = validData.flatMap(d => [d.actual, d.forecast].filter((v): v is number => v !== null))
  const maxVal = Math.max(...allValues)
  const minVal = Math.min(...allValues)
  const range = maxVal - minVal || 1
  
  const chartHeight = 100
  const chartWidth = 280
  const padding = 10
  const pointSpacing = validData.length > 1 ? (chartWidth - padding * 2) / (validData.length - 1) : 0
  
  const getY = (val: number | null) => {
    if (val === null) return chartHeight / 2
    return chartHeight - padding - ((val - minVal) / range) * (chartHeight - padding * 2)
  }
  
  const actualPoints = validData
    .filter(d => d.actual !== null)
    .map((d, i) => `${padding + i * pointSpacing},${getY(d.actual)}`)
    .join(' ')
  const forecastPoints = validData
    .filter(d => d.forecast !== null)
    .map((d, i) => `${padding + i * pointSpacing},${getY(d.forecast)}`)
    .join(' ')

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 text-xs text-muted-foreground font-mono">
        {maxVal.toLocaleString()}
      </div>
      <svg width={chartWidth} height={chartHeight} className="ml-12">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="currentColor" strokeOpacity={0.1} />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="currentColor" strokeOpacity={0.1} />
        
        {/* Forecast line (gray dashed) */}
        {forecastPoints && (
          <polyline
            points={forecastPoints}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeWidth={2}
            strokeDasharray="4,4"
          />
        )}
        
        {/* Actual line (primary color) */}
        {actualPoints && (
          <polyline
            points={actualPoints}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
        )}
        
        {/* Data points */}
        {validData.map((d, i) => (
          <g key={i}>
            {d.actual !== null && (
              <circle
                cx={padding + i * pointSpacing}
                cy={getY(d.actual)}
                r={4}
                fill="hsl(var(--primary))"
              />
            )}
            {d.forecast !== null && (
              <circle
                cx={padding + i * pointSpacing}
                cy={getY(d.forecast)}
                r={3}
                fill="currentColor"
                fillOpacity={0.3}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

// Analysis Panel Component
function AnalysisPanel({ event, onClose }: { event: EconomicEvent; onClose: () => void }) {
  const analysis = generateEventAnalysis(event)
  const flagUrl = currencyFlags[event.currency]
  const timeUntil = getTimeUntilEvent(event.date, event.time)
  
  // Groq AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string>(analysis.aiAnalysis)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [isGroqAnalysis, setIsGroqAnalysis] = useState(false)
  
  // Function to fetch Groq AI analysis
  const fetchGroqAnalysis = async () => {
    setIsLoadingAI(true)
    setAiError(null)
    
    try {
      // TEMPORARILY DISABLED: calendar-analysis uses Groq causing 429 errors
      // Using simple technical fallback instead to prevent rate limiting
      const fallbackAnalysis = `Événement ${analysis.category}: ${event.event} (${event.country}). Impact: ${event.impact}. À surveiller pour réaction du marché.`
      setAiAnalysis(fallbackAnalysis)
      setIsGroqAnalysis(false)
      
      /* DISABLED - CAUSING 429 ERRORS
      const response = await fetch('/api/calendar-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            title: event.event,
            country: event.country,
            currency: event.currency,
            actual: event.actual,
            forecast: event.forecast,
            previous: event.previous,
            impact: event.impact,
            category: analysis.category,
            date: event.date,
            time: event.time,
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Analyse IA indisponible')
      }
      
      const data = await response.json()
      setAiAnalysis(data.analysis)
      setIsGroqAnalysis(true)
      */
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoadingAI(false)
    }
  }
  
  // Auto-fetch Groq analysis when panel opens
  useEffect(() => {
    fetchGroqAnalysis()
  }, [event.id])
  
  // Parse date safely
  let eventDate: Date
  if (event.date.includes('-')) {
    eventDate = new Date(event.date + 'T00:00:00')
  } else {
    eventDate = new Date(event.date)
  }
  
  const isValidDate = !isNaN(eventDate.getTime())
  const dayName = isValidDate ? dayNames.fr[eventDate.getDay()] : ''
  const monthName = isValidDate ? monthNames.fr[eventDate.getMonth()] : ''
  const dateStr = isValidDate 
    ? `${dayName} ${eventDate.getDate()} ${monthName} a ${event.time}`
    : `${event.date} a ${event.time}`

  return (
    <div className="w-[450px] border-l border-border bg-card h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header with tag */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/20 text-success text-xs">
            {flagUrl && <img src={flagUrl} alt={event.currency} className="w-5 h-4 object-cover rounded-sm" />}
            <span className="font-medium">{event.currency}</span>
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {"Cliquez sur d'autres evenements qui auront lieu ici"}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title section */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start gap-2 mb-3">
            <h2 className="text-xl font-semibold text-foreground leading-tight">{event.event}</h2>
            <button className="p-1 hover:bg-accent rounded">
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              {flagUrl && <img src={flagUrl} alt={event.currency} className="w-5 h-4 object-cover rounded-sm" />}
              <span>{countryNames[event.country] || event.country}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              event.impact === 'high' ? "bg-destructive/20 text-destructive" : 
              event.impact === 'medium' ? "bg-warning/20 text-warning" : "bg-muted"
            )}>
              {event.impact === 'high' ? 'Eleve' : event.impact === 'medium' ? 'Med' : 'Faible'}
            </span>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{timeUntil}</span>
          </div>
        </div>

        {/* Key Points */}
        <div className="p-5 border-b border-border">
          <ul className="space-y-3">
            {analysis.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tactical Guide */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guide Pratique</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Devise concernee</span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted">
                {flagUrl && <img src={flagUrl} alt={event.currency} className="w-5 h-4 object-cover rounded-sm" />}
                <span className="font-medium">{event.currency}</span>
              </span>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            {/* Above Thresholds */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Ci-dessus</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">MAX</span>
                  <span className="px-2.5 py-1 bg-success rounded text-sm font-mono font-medium text-white">
                    {analysis.tacticalGuide.aboveMax.value}
                  </span>
                </div>
                <span className="text-sm text-success font-medium w-24 text-right">{analysis.tacticalGuide.aboveMax.label}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-success/70 rounded text-sm font-mono font-medium text-white">
                    {analysis.tacticalGuide.above.value}
                  </span>
                </div>
                <span className="text-sm text-success w-24 text-right">{analysis.tacticalGuide.above.label}</span>
              </div>
            </div>

            <div className="border-t border-border my-2" />

            {/* Below Thresholds */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-destructive/70 rounded text-sm font-mono font-medium text-white">
                    {analysis.tacticalGuide.below.value}
                  </span>
                </div>
                <span className="text-sm text-destructive w-24 text-right">{analysis.tacticalGuide.below.label}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium">Ci-dessous</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">MIN</span>
                  <span className="px-2.5 py-1 bg-destructive rounded text-sm font-mono font-medium text-white">
                    {analysis.tacticalGuide.belowMin.value}
                  </span>
                </div>
                <span className="text-sm text-destructive font-medium w-24 text-right">{analysis.tacticalGuide.belowMin.label}</span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-4 flex gap-3 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p className="leading-relaxed">{analysis.explanation}</p>
          </div>
        </div>

        {/* Historical Data */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Donnees Historiques</h3>
            <span className="text-xs text-muted-foreground">Ces deux dernieres annees</span>
          </div>
          
          {/* Mini Chart */}
          <div className="mb-4">
            <MiniChart data={analysis.historicalData} />
          </div>
          
          {/* Data table */}
          <div className="space-y-1">
            {analysis.historicalData.slice(0, 3).map((data, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/30 text-sm">
                <span className="text-muted-foreground">{data.date}</span>
                <div className="flex items-center gap-6">
                  <span className={cn(
                    "font-mono font-medium",
                    data.actual !== null && data.forecast !== null ? (
                      data.actual > data.forecast ? "text-success" : 
                      data.actual < data.forecast ? "text-destructive" : "text-foreground"
                    ) : "text-muted-foreground"
                  )}>
                    {data.actual !== null ? data.actual.toLocaleString() : "---"}
                  </span>
                  <span className="text-muted-foreground font-mono w-16 text-right">
                    {data.forecast !== null ? data.forecast.toLocaleString() : "---"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="p-5 border-t border-border bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className={cn("w-5 h-5", isGroqAnalysis ? "text-emerald-500" : "text-primary")} />
              <h3 className="text-sm font-semibold text-primary">
                {isGroqAnalysis ? "Analyse Groq AI" : "Analyse IA"}
              </h3>
              {isGroqAnalysis && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded">
                  Llama 3.3 70B
                </span>
              )}
            </div>
            {!isGroqAnalysis && (
              <button
                onClick={fetchGroqAnalysis}
                disabled={isLoadingAI}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isLoadingAI 
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                )}
              >
                <Brain className={cn("w-3.5 h-3.5", isLoadingAI && "animate-pulse")} />
                {isLoadingAI ? "Analyse..." : "Analyse Groq"}
              </button>
            )}
          </div>
          
          {aiError && (
            <p className="text-sm text-destructive mb-2">{aiError}</p>
          )}
          
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {aiAnalysis}
          </p>
        </div>
      </div>
    </div>
  )
}

type DateFilter = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'all'

const dateFilterLabels: Record<string, Record<DateFilter, string>> = {
  fr: { today: "Aujourd'hui", tomorrow: 'Demain', this_week: 'Cette semaine', next_week: 'Semaine prochaine', this_month: 'Ce mois', all: 'Tout' },
  en: { today: 'Today', tomorrow: 'Tomorrow', this_week: 'This week', next_week: 'Next week', this_month: 'This month', all: 'All' },
  es: { today: 'Hoy', tomorrow: 'Manana', this_week: 'Esta semana', next_week: 'Proxima semana', this_month: 'Este mes', all: 'Todos' },
  pt: { today: 'Hoje', tomorrow: 'Amanha', this_week: 'Esta semana', next_week: 'Proxima semana', this_month: 'Este mes', all: 'Todos' },
}

function getDateRange(filter: DateFilter): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (filter) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
    case 'tomorrow':
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      return { start: tomorrow, end: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1) }
    case 'this_week':
      const dayOfWeek = today.getDay()
      const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      return { start: startOfWeek, end: endOfWeek }
    case 'next_week':
      const nextWeekDay = today.getDay()
      const startOfNextWeek = new Date(today.getTime() + (7 - nextWeekDay) * 24 * 60 * 60 * 1000)
      const endOfNextWeek = new Date(startOfNextWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      return { start: startOfNextWeek, end: endOfNextWeek }
    case 'this_month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      return { start: startOfMonth, end: endOfMonth }
    default:
      return { start: new Date(0), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
  }
}

const timezones = [
  { value: 'UTC', label: 'UTC', offset: 0 },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: 1 },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: 0 },
  { value: 'America/New_York', label: 'New York (EST/EDT)', offset: -5 },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)', offset: -6 },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', offset: -8 },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 9 },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: 8 },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 8 },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: 10 },
]

const CALENDAR_PREFS_KEY = 'orvyn_calendar_preferences'

interface CalendarPreferences {
  selectedCurrencies: string[]
  selectedImpacts: string[]
  dateFilter: DateFilter
  timezone: string
  watchlist: string[]
}

export function EconomicCalendar() {
  const { t, language } = useI18n()
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>(['high', 'medium', 'low', 'none'])
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_week')
  const [timezone, setTimezone] = useState('UTC')
  const [localTime, setLocalTime] = useState('')
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_PREFS_KEY)
      if (saved) {
        const prefs: CalendarPreferences = JSON.parse(saved)
        if (prefs.selectedCurrencies) setSelectedCurrencies(prefs.selectedCurrencies)
        if (prefs.selectedImpacts && prefs.selectedImpacts.length > 0) setSelectedImpacts(prefs.selectedImpacts)
        if (prefs.dateFilter) setDateFilter(prefs.dateFilter)
        if (prefs.timezone) setTimezone(prefs.timezone)
        if (prefs.watchlist) setWatchlist(prefs.watchlist)
      }
    } catch (e) {
      console.log('[v0] Failed to load calendar preferences:', e)
    }
    setPrefsLoaded(true)
  }, [])

  // Save preferences when they change
  useEffect(() => {
    if (!prefsLoaded) return // Don't save until initial load is complete
    
    try {
      const prefs: CalendarPreferences = {
        selectedCurrencies,
        selectedImpacts,
        dateFilter,
        timezone,
        watchlist
      }
      localStorage.setItem(CALENDAR_PREFS_KEY, JSON.stringify(prefs))
    } catch (e) {
      console.log('[v0] Failed to save calendar preferences:', e)
    }
  }, [selectedCurrencies, selectedImpacts, dateFilter, timezone, watchlist, prefsLoaded])

  // Update local time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setLocalTime(now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch all events without filters - we'll filter client-side for instant response
  const { data, isLoading, mutate, isValidating } = useSWR<CalendarData>('/api/economic-calendar', fetcher, {
    refreshInterval: 30000,
  })

  const toggleCurrency = (code: string) => {
    setSelectedCurrencies(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const toggleImpact = (key: string) => {
    setSelectedImpacts(prev => {
      if (prev.includes(key)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev
        return prev.filter(i => i !== key)
      }
      return [...prev, key]
    })
  }

  const resetFilters = () => {
    setSelectedCurrencies([])
    setSelectedImpacts(['high', 'medium', 'low', 'none'])
    setSearchQuery('')
    setDateFilter('this_week')
    setTimezone('UTC')
  }

  // Convert time to selected timezone
  const formatTimeInTimezone = (time: string, date: string) => {
    try {
      // Handle time formats like "16 h", "14 h 30", "16:00"
      let hours = 0
      let minutes = 0
      
      if (time.includes('h')) {
        const parts = time.replace(/\s+/g, ' ').split(' h ')
        hours = parseInt(parts[0]) || 0
        minutes = parseInt(parts[1]) || 0
      } else if (time.includes(':')) {
        const parts = time.split(':')
        hours = parseInt(parts[0]) || 0
        minutes = parseInt(parts[1]) || 0
      }
      
      // Parse date safely
      let eventDate: Date
      if (date.includes('-')) {
        eventDate = new Date(date + 'T00:00:00Z')
      } else {
        eventDate = new Date(date)
      }
      
      if (isNaN(eventDate.getTime())) {
        return time
      }
      
      eventDate.setUTCHours(hours, minutes, 0, 0)
      
      // Format in selected timezone
      return eventDate.toLocaleTimeString('fr-FR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(':', ' h ')
    } catch {
      return time
    }
  }

  const formatDateHeader = (dateStr: string) => {
    // Handle various date formats
    let date: Date
    if (dateStr.includes('-')) {
      // ISO format: 2026-05-04
      date = new Date(dateStr + 'T00:00:00')
    } else if (dateStr.includes('/')) {
      // Slash format: 04/05/2026 or 2026/05/04
      const parts = dateStr.split('/')
      if (parts[0].length === 4) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      } else {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      }
    } else {
      date = new Date(dateStr)
    }
    
    if (isNaN(date.getTime())) {
      return dateStr // Return original string if parsing fails
    }
    
    const dayName = dayNames[language]?.[date.getDay()] || dayNames.fr[date.getDay()]
    const monthName = monthNames[language]?.[date.getMonth()] || monthNames.fr[date.getMonth()]
    return `${dayName} ${date.getDate()} ${monthName}`
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-destructive'
      case 'medium': return 'bg-warning'
      case 'low': return 'bg-yellow-500'
      default: return 'bg-muted-foreground'
    }
  }

  const getValueColor = (actual: string | null, forecast: string | null) => {
    if (!actual || !forecast) return 'text-foreground'
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''))
    const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''))
    if (isNaN(actualNum) || isNaN(forecastNum)) return 'text-foreground'
    if (actualNum > forecastNum) return 'text-success'
    if (actualNum < forecastNum) return 'text-destructive'
    return 'text-foreground'
  }

  const isCurrentTimeSlot = (date: string, time: string) => {
    const now = new Date()
    const eventDate = new Date(date)
    if (eventDate.toDateString() !== now.toDateString()) return false
    
    const timeParts = time.replace(' h ', ':').replace(' h', ':00').split(':')
    const eventHour = parseInt(timeParts[0])
    const currentHour = now.getHours()
    return eventHour === currentHour
  }

  // Client-side filtering for instant response
  const filteredEvents = useMemo(() => {
    if (!data?.groupedEvents) return {}
    
    const filtered: Record<string, EconomicEvent[]> = {}
    const dateRange = getDateRange(dateFilter)
    
    Object.entries(data.groupedEvents).forEach(([date, events]) => {
      const eventDate = new Date(date)
      
      // Filter by date range
      if (dateFilter !== 'all' && (eventDate < dateRange.start || eventDate > dateRange.end)) {
        return
      }
      
      const matchingEvents = events.filter(ev => {
        // Filter by impact
        if (!selectedImpacts.includes(ev.impact)) {
          return false
        }
        
        // Filter by currency
        if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(ev.currency)) {
          return false
        }
        
        // Filter by search query
        if (searchQuery && !ev.event.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !ev.currency.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }
        
        return true
      })
      
      if (matchingEvents.length > 0) {
        filtered[date] = matchingEvents
      }
    })
    
    return filtered
  }, [data?.groupedEvents, selectedImpacts, selectedCurrencies, searchQuery, dateFilter])

  const renderEventRows = () => {
    if (isLoading) {
      return Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td colSpan={11} className="p-3">
            <div className="h-6 bg-muted animate-pulse rounded" />
          </td>
        </tr>
      ))
    }

    const rows: React.ReactNode[] = []
    
    Object.entries(filteredEvents).forEach(([date, events]) => {
      rows.push(
        <tr key={`header-${date}`} className="bg-muted/50">
          <td colSpan={11} className="p-3 font-semibold text-sm">
            {formatDateHeader(date)}
          </td>
        </tr>
      )
      
      events.forEach((event) => {
        const isCurrent = isCurrentTimeSlot(event.date, event.time)
        const flagUrl = currencyFlags[event.currency]
        const isSelected = selectedEvent?.id === event.id
        
        rows.push(
            <CalendarEventRow
              event={event}
              flagUrl={flagUrl}
              onBrainClick={() => {
                const isSelected = selectedEvent?.id === event.id
                setSelectedEvent(isSelected ? null : event)
              }}
              onRefresh={() => {
                mutate()
              }}
            />
        )
      })
    })
    
    return rows
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
        {/* Date Filters */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {(['today', 'tomorrow', 'this_week', 'next_week', 'this_month'] as DateFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                dateFilter === filter 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {filter === 'today' && <Calendar className="w-4 h-4" />}
              {dateFilterLabels[language]?.[filter] || dateFilterLabels.fr[filter]}
            </button>
          ))}
        </div>
        
        {/* Currency Filter */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowCurrencyDropdown(!showCurrencyDropdown)
              setShowTimezoneDropdown(false)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-sm"
          >
            {selectedCurrencies.length > 0 ? (
              <span className="flex items-center gap-1">
                <span>Pays</span>
                <span className="bg-primary text-primary-foreground px-1.5 rounded text-xs">{selectedCurrencies.length}</span>
              </span>
            ) : (
              <span>Pays</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showCurrencyDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-2">
              {currencies.map(currency => (
                <button
                  key={currency.code}
                  onClick={() => toggleCurrency(currency.code)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                    selectedCurrencies.includes(currency.code) && "bg-accent"
                  )}
                >
                  <span className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    selectedCurrencies.includes(currency.code) ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {selectedCurrencies.includes(currency.code) && (
                      <span className="text-primary-foreground text-xs">✓</span>
                    )}
                  </span>
                  <img src={currency.flag} alt={currency.code} className="w-5 h-4 object-cover rounded-sm" />
                  <span>{currency.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Impact Filters */}
        <div className="flex items-center gap-2">
          {impactFilters.map(filter => (
            <button
              key={filter.key}
              onClick={() => toggleImpact(filter.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors border",
                selectedImpacts.includes(filter.key) 
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", filter.color)} />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={resetFilters}
          className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Reinitialiser
        </button>

        {/* Timezone Selector */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowTimezoneDropdown(!showTimezoneDropdown)
              setShowCurrencyDropdown(false)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-sm font-medium"
          >
            <Clock className="w-4 h-4" />
            <span>{timezone === 'UTC' ? 'UTC' : timezones.find(tz => tz.value === timezone)?.label.split(' ')[0] || timezone}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showTimezoneDropdown && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-2 max-h-64 overflow-auto">
              {timezones.map(tz => (
                <button
                  key={tz.value}
                  onClick={() => {
                    setTimezone(tz.value)
                    setShowTimezoneDropdown(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                    timezone === tz.value && "bg-accent text-primary"
                  )}
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{tz.label}</span>
                  {timezone === tz.value && (
                    <span className="ml-auto text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
          <Bookmark className="w-4 h-4" />
          A suivre
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 rounded-lg bg-accent text-sm w-40 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button 
          onClick={() => mutate()}
          disabled={isValidating}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", isValidating && "animate-spin")} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table */}
        <div className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          selectedEvent ? "w-[calc(100%-450px)]" : "w-full"
        )}>
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">
                  <span className="text-primary font-mono text-sm">{localTime}</span>
                </th>
                <th className="p-3 font-medium">Impact</th>
                <th className="p-3 font-medium">Ccy</th>
                <th className="p-3 font-medium">Evenement</th>
                <th className="p-3 font-medium"></th>
                <th className="p-3 font-medium text-right">Reel</th>
                <th className="p-3 font-medium text-right">Previsions</th>
                <th className="p-3 font-medium text-right">
                  <span className="flex items-center justify-end gap-1">
                    Prev. bancaires
                    <Info className="w-3 h-3" />
                  </span>
                </th>
                <th className="p-3 font-medium text-right">Precedent</th>
                <th className="p-3 font-medium text-right">Min</th>
                <th className="p-3 font-medium text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              {renderEventRows()}
              {!isLoading && Object.keys(filteredEvents).length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    Aucun evenement trouve pour les filtres selectionnes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Analysis Panel */}
        {selectedEvent && (
          <AnalysisPanel 
            event={selectedEvent} 
            onClose={() => setSelectedEvent(null)} 
          />
        )}
      </div>
    </div>
  )
}
