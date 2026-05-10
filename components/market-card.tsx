"use client"

import { DnaButton } from './dna-button'

import { useState } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { TradingViewPrice } from "./tradingview-price"
import { CorrelationSection } from "./correlation-gauge"


// Technical analysis response type
interface TechnicalAnalysisResponse {
  symbol: string
  swing: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }
  day: { bias: 'bull' | 'bear' | 'neu'; confidence: number; signals: string[] }
  currentPrice: number
  source: string
  timestamp: string
}

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

interface MarketCardProps {
  symbol: string
  bias: "bull" | "bear" | "neu"
  confidence: number
  summary: string
  factors: string[]
  changePercent: number
  bulkAnalysis?: string  // Bulk analysis from parent TradingDashboard
  compact?: boolean  // Compact mode for correlation cards
  onSymbolChange?: (newSymbol: string) => void
  onDeepDive?: () => void  // Handler for Deep Dive button click
}

// Complete list of all CFD tradable instruments
const allInstruments = {
  watchlist: {
    label: 'Watchlist',
    items: [] as { symbol: string; description: string; type: string }[]
  },
  forex: {
    label: 'Forex',
    items: [
      // Majors
      { symbol: 'EUR/USD', description: 'Euro / U.S. Dollar', type: 'major' },
      { symbol: 'GBP/USD', description: 'British Pound / U.S. Dollar', type: 'major' },
      { symbol: 'USD/JPY', description: 'U.S. Dollar / Japanese Yen', type: 'major' },
      { symbol: 'USD/CHF', description: 'U.S. Dollar / Swiss Franc', type: 'major' },
      { symbol: 'AUD/USD', description: 'Australian Dollar / U.S. Dollar', type: 'major' },
      { symbol: 'USD/CAD', description: 'U.S. Dollar / Canadian Dollar', type: 'major' },
      { symbol: 'NZD/USD', description: 'New Zealand Dollar / U.S. Dollar', type: 'major' },
      // EUR Crosses
      { symbol: 'EUR/GBP', description: 'Euro / British Pound', type: 'cross' },
      { symbol: 'EUR/JPY', description: 'Euro / Japanese Yen', type: 'cross' },
      { symbol: 'EUR/CHF', description: 'Euro / Swiss Franc', type: 'cross' },
      { symbol: 'EUR/AUD', description: 'Euro / Australian Dollar', type: 'cross' },
      { symbol: 'EUR/CAD', description: 'Euro / Canadian Dollar', type: 'cross' },
      { symbol: 'EUR/NZD', description: 'Euro / New Zealand Dollar', type: 'cross' },
      // GBP Crosses
      { symbol: 'GBP/JPY', description: 'British Pound / Japanese Yen', type: 'cross' },
      { symbol: 'GBP/CHF', description: 'British Pound / Swiss Franc', type: 'cross' },
      { symbol: 'GBP/AUD', description: 'British Pound / Australian Dollar', type: 'cross' },
      { symbol: 'GBP/CAD', description: 'British Pound / Canadian Dollar', type: 'cross' },
      { symbol: 'GBP/NZD', description: 'British Pound / New Zealand Dollar', type: 'cross' },
      // AUD Crosses
      { symbol: 'AUD/JPY', description: 'Australian Dollar / Japanese Yen', type: 'cross' },
      { symbol: 'AUD/CHF', description: 'Australian Dollar / Swiss Franc', type: 'cross' },
      { symbol: 'AUD/CAD', description: 'Australian Dollar / Canadian Dollar', type: 'cross' },
      { symbol: 'AUD/NZD', description: 'Australian Dollar / New Zealand Dollar', type: 'cross' },
      // CAD Crosses
      { symbol: 'CAD/JPY', description: 'Canadian Dollar / Japanese Yen', type: 'cross' },
      { symbol: 'CAD/CHF', description: 'Canadian Dollar / Swiss Franc', type: 'cross' },
      // NZD Crosses
      { symbol: 'NZD/JPY', description: 'New Zealand Dollar / Japanese Yen', type: 'cross' },
      { symbol: 'NZD/CHF', description: 'New Zealand Dollar / Swiss Franc', type: 'cross' },
      { symbol: 'NZD/CAD', description: 'New Zealand Dollar / Canadian Dollar', type: 'cross' },
      // CHF Crosses
      { symbol: 'CHF/JPY', description: 'Swiss Franc / Japanese Yen', type: 'cross' },
      // Exotics
      { symbol: 'USD/MXN', description: 'U.S. Dollar / Mexican Peso', type: 'exotic' },
      { symbol: 'USD/ZAR', description: 'U.S. Dollar / South African Rand', type: 'exotic' },
      { symbol: 'USD/TRY', description: 'U.S. Dollar / Turkish Lira', type: 'exotic' },
      { symbol: 'USD/SGD', description: 'U.S. Dollar / Singapore Dollar', type: 'exotic' },
      { symbol: 'USD/HKD', description: 'U.S. Dollar / Hong Kong Dollar', type: 'exotic' },
      { symbol: 'USD/SEK', description: 'U.S. Dollar / Swedish Krona', type: 'exotic' },
      { symbol: 'USD/NOK', description: 'U.S. Dollar / Norwegian Krone', type: 'exotic' },
      { symbol: 'USD/DKK', description: 'U.S. Dollar / Danish Krone', type: 'exotic' },
      { symbol: 'USD/PLN', description: 'U.S. Dollar / Polish Zloty', type: 'exotic' },
      { symbol: 'EUR/TRY', description: 'Euro / Turkish Lira', type: 'exotic' },
      { symbol: 'EUR/PLN', description: 'Euro / Polish Zloty', type: 'exotic' },
      { symbol: 'EUR/SEK', description: 'Euro / Swedish Krona', type: 'exotic' },
      { symbol: 'EUR/NOK', description: 'Euro / Norwegian Krone', type: 'exotic' },
    ]
  },
  indices: {
    label: 'Indices',
    items: [
      // US Indices
      { symbol: 'US30', description: 'Dow Jones Industrial Average', type: 'us' },
      { symbol: 'US100', description: 'NASDAQ 100', type: 'us' },
      { symbol: 'US500', description: 'S&P 500', type: 'us' },
      { symbol: 'US2000', description: 'Russell 2000', type: 'us' },
      // European Indices
      { symbol: 'GER40', description: 'DAX 40 Germany', type: 'europe' },
      { symbol: 'UK100', description: 'FTSE 100 UK', type: 'europe' },
      { symbol: 'FRA40', description: 'CAC 40 France', type: 'europe' },
      { symbol: 'EU50', description: 'Euro Stoxx 50', type: 'europe' },
      { symbol: 'SPA35', description: 'IBEX 35 Spain', type: 'europe' },
      { symbol: 'ITA40', description: 'FTSE MIB Italy', type: 'europe' },
      { symbol: 'NED25', description: 'AEX 25 Netherlands', type: 'europe' },
      { symbol: 'SUI20', description: 'SMI 20 Switzerland', type: 'europe' },
      // Asia Pacific Indices
      { symbol: 'JPN225', description: 'Nikkei 225 Japan', type: 'asia' },
      { symbol: 'HK50', description: 'Hang Seng Hong Kong', type: 'asia' },
      { symbol: 'AUS200', description: 'ASX 200 Australia', type: 'asia' },
      { symbol: 'CHN50', description: 'China A50', type: 'asia' },
      { symbol: 'SGP20', description: 'Singapore 20', type: 'asia' },
      { symbol: 'KOR200', description: 'KOSPI 200 Korea', type: 'asia' },
    ]
  },
  commodities: {
    label: 'Commodities',
    items: [
      // Precious Metals
      { symbol: 'XAU/USD', description: 'Gold Spot / U.S. Dollar', type: 'metal' },
      { symbol: 'XAG/USD', description: 'Silver Spot / U.S. Dollar', type: 'metal' },
      { symbol: 'XPT/USD', description: 'Platinum Spot / U.S. Dollar', type: 'metal' },
      { symbol: 'XPD/USD', description: 'Palladium Spot / U.S. Dollar', type: 'metal' },
      { symbol: 'COPPER', description: 'Copper Futures', type: 'metal' },
      // Energy
      { symbol: 'WTI', description: 'WTI Crude Oil', type: 'energy' },
      { symbol: 'BRENT', description: 'Brent Crude Oil', type: 'energy' },
      { symbol: 'NGAS', description: 'Natural Gas', type: 'energy' },
      // Agriculture
      { symbol: 'WHEAT', description: 'Wheat Futures', type: 'agriculture' },
      { symbol: 'CORN', description: 'Corn Futures', type: 'agriculture' },
      { symbol: 'SOYBEAN', description: 'Soybean Futures', type: 'agriculture' },
      { symbol: 'COFFEE', description: 'Coffee Futures', type: 'agriculture' },
      { symbol: 'SUGAR', description: 'Sugar Futures', type: 'agriculture' },
      { symbol: 'COTTON', description: 'Cotton Futures', type: 'agriculture' },
    ]
  },
  crypto: {
    label: 'Crypto',
    items: [
      { symbol: 'BTC/USD', description: 'Bitcoin / U.S. Dollar', type: 'crypto' },
      { symbol: 'ETH/USD', description: 'Ethereum / U.S. Dollar', type: 'crypto' },
      { symbol: 'XRP/USD', description: 'Ripple / U.S. Dollar', type: 'crypto' },
      { symbol: 'SOL/USD', description: 'Solana / U.S. Dollar', type: 'crypto' },
      { symbol: 'ADA/USD', description: 'Cardano / U.S. Dollar', type: 'crypto' },
      { symbol: 'DOGE/USD', description: 'Dogecoin / U.S. Dollar', type: 'crypto' },
      { symbol: 'AVAX/USD', description: 'Avalanche / U.S. Dollar', type: 'crypto' },
      { symbol: 'DOT/USD', description: 'Polkadot / U.S. Dollar', type: 'crypto' },
      { symbol: 'LINK/USD', description: 'Chainlink / U.S. Dollar', type: 'crypto' },
      { symbol: 'MATIC/USD', description: 'Polygon / U.S. Dollar', type: 'crypto' },
      { symbol: 'LTC/USD', description: 'Litecoin / U.S. Dollar', type: 'crypto' },
      { symbol: 'UNI/USD', description: 'Uniswap / U.S. Dollar', type: 'crypto' },
    ]
  },
  stocks: {
    label: 'Stocks',
    items: [
      // Tech
      { symbol: 'AAPL', description: 'Apple Inc.', type: 'tech' },
      { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'tech' },
      { symbol: 'GOOGL', description: 'Alphabet Inc.', type: 'tech' },
      { symbol: 'AMZN', description: 'Amazon.com Inc.', type: 'tech' },
      { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'tech' },
      { symbol: 'META', description: 'Meta Platforms Inc.', type: 'tech' },
      { symbol: 'TSLA', description: 'Tesla Inc.', type: 'tech' },
      { symbol: 'AMD', description: 'Advanced Micro Devices', type: 'tech' },
      { symbol: 'INTC', description: 'Intel Corporation', type: 'tech' },
      { symbol: 'CRM', description: 'Salesforce Inc.', type: 'tech' },
      // Finance
      { symbol: 'JPM', description: 'JPMorgan Chase & Co.', type: 'finance' },
      { symbol: 'BAC', description: 'Bank of America Corp.', type: 'finance' },
      { symbol: 'GS', description: 'Goldman Sachs Group', type: 'finance' },
      { symbol: 'MS', description: 'Morgan Stanley', type: 'finance' },
      { symbol: 'V', description: 'Visa Inc.', type: 'finance' },
      { symbol: 'MA', description: 'Mastercard Inc.', type: 'finance' },
    ]
  }
}

// Report data for each asset
const reportData: Record<string, {
  bearishFactors: { title: string; description: string; isBreaking?: boolean; breakingText?: string; breakingTime?: string }[]
  bullishFactors: { title: string; description: string; isBreaking?: boolean; breakingText?: string; breakingTime?: string }[]
}> = {
  "XAU/USD": {
    bearishFactors: [
      {
        title: "Les tensions avec l'Iran s'intensifient",
        description: "La guerre en cours exerce une pression à la baisse sur l'or sous le régime actuel"
      },
      {
        title: "Prise de bénéfices après une remontée",
        description: "Les traders vendent leurs gains accumulés après la flambée liée à la situation géopolitique, ce qui accentue la pression à la hausse sur l'offre"
      },
      {
        title: "Déboulonage des positions surchargées",
        description: "Les positions longues surchargées se dénouent suite à la décision de la Fed de maintenir ses taux inchangés, amplifiant ainsi les flux baissiers"
      },
      {
        title: "Une réévaluation des taux dans un contexte de politique monétaire restrictive de la Fed est en cours",
        description: "Les trois voix dissidentes contre un assouplissement de la politique monétaire indiquent que le comité s'oriente vers une position neutre ; les probabilités d'une baisse des taux s'amenuisent",
        isBreaking: true,
        breakingText: "FED : LE VOTE EN FAVEUR DE LA POLITIQUE MONÉTAIRE S'EST DÉROULÉ À 8 CONTRE 4, M. MIRAN AYANT EXPRIMÉ SON DISSIDENCE EN FAVEUR D'UNE BAISSE DES TAUX DE 0,25 POINT DE POURCENTAGE",
        breakingTime: "Il y a 8 heures"
      },
      {
        title: "L'inflation des prix de l'énergie persiste",
        description: "Powell : la flambée des prix de l'énergie n'a pas encore atteint son pic ; il attendra qu'elle commence à redescendre avant de baisser les taux"
      }
    ],
    bullishFactors: [
      {
        title: "La tendance à l'assouplissement de la Fed reste inchangée",
        description: "Le maintien du libellé du communiqué laisse entrevoir de futures hausses de taux et soutient l'or",
        isBreaking: true,
        breakingText: "BREAKINGVIEWS - LA MAISON BLANCHE SE CRÉE SON PROPRE CAUCHEMAR AVEC LA FED",
        breakingTime: "Il y a 1 heure"
      },
      {
        title: "Achats d'or par les banques centrales",
        description: "Les achats continus de la Pologne et de la Chine créent un seuil de demande structurel"
      },
      {
        title: "Les rendements réels restent stables",
        description: "L'absence de hausse des rendements obligataires maintient la compétitivité de l'or, qui ne rapporte pas de rendement"
      },
      {
        title: "Déclarations de Powell sur l'énergie",
        description: "Il reconnaît l'inflation, mais l'absence de hausse immédiate fait pencher la balance vers des baisses"
      },
      {
        title: "Appétit pour le risque alimenté par les espoirs d'un cessez-le-feu",
        description: "Les négociations de cessez-le-feu en Ukraine et en Iran réduisent la demande d'or comme valeur refuge"
      }
    ]
  },
  "US30": {
    bearishFactors: [
      {
        title: "Incertitudes sur la politique commerciale",
        description: "Les menaces de nouveaux tarifs douaniers pèsent sur le sentiment des entreprises industrielles"
      },
      {
        title: "Résultats d'entreprises mitigés",
        description: "Les grandes capitalisations du Dow affichent des perspectives prudentes pour le trimestre à venir"
      },
      {
        title: "Hausse des coûts de main-d'œuvre",
        description: "L'inflation salariale persistante réduit les marges des entreprises industrielles"
      }
    ],
    bullishFactors: [
      {
        title: "Résilience de l'économie américaine",
        description: "Les données économiques continuent de surprendre à la hausse, soutenant les valeurs cycliques"
      },
      {
        title: "Rotation sectorielle en cours",
        description: "Les flux sortants de la tech vers les valeurs traditionnelles du Dow"
      },
      {
        title: "Stabilité des taux d'intérêt",
        description: "La pause de la Fed offre de la visibilité aux entreprises pour leurs investissements"
      }
    ]
  },
  "US100": {
    bearishFactors: [
      {
        title: "Valorisations tendues",
        description: "Les multiples de valorisation des grandes tech restent élevés par rapport aux moyennes historiques"
      },
      {
        title: "Doutes sur la rentabilité de l'IA",
        description: "Les investisseurs questionnent le retour sur investissement des dépenses massives en IA"
      },
      {
        title: "Rotation vers les valeurs défensives",
        description: "Les flux sortent des valeurs de croissance vers les secteurs plus stables"
      }
    ],
    bullishFactors: [
      {
        title: "Innovation continue dans l'IA",
        description: "Les nouvelles applications d'IA générative ouvrent de nouveaux marchés"
      },
      {
        title: "Solidité des bilans",
        description: "Les géants tech disposent de réserves de cash importantes pour les rachats d'actions"
      },
      {
        title: "Croissance des revenus cloud",
        description: "L'adoption du cloud continue d'accélérer dans tous les secteurs"
      }
    ]
  },
  "DXY": {
    bearishFactors: [
      {
        title: "Fin du cycle de hausse de la Fed",
        description: "Les anticipations de baisse des taux pèsent sur l'attractivité du dollar"
      },
      {
        title: "Diversification des réserves",
        description: "Les banques centrales réduisent leur exposition au dollar dans leurs réserves"
      },
      {
        title: "Déficit budgétaire croissant",
        description: "L'augmentation de la dette américaine questionne la soutenabilité à long terme"
      }
    ],
    bullishFactors: [
      {
        title: "Différentiel de taux favorable",
        description: "Les taux américains restent plus élevés que ceux des autres grandes économies"
      },
      {
        title: "Statut de valeur refuge",
        description: "Les tensions géopolitiques renforcent la demande de dollars"
      },
      {
        title: "Faiblesse des alternatives",
        description: "L'euro et le yen font face à leurs propres défis économiques"
      }
    ]
  }
}

// Trading Badge Component with real data
function TradingBadge({ 
  label, 
  bias, 
  confidence,
  signals,
  isLoading,
  compact = false
}: { 
  label: string
  bias: 'bull' | 'bear' | 'neu'
  confidence?: number
  signals?: string[]
  isLoading?: boolean
  compact?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  // Determine bias strength based on confidence
  const getBiasLabel = () => {
    if (!confidence) return bias === 'bull' ? 'Bullish' : bias === 'bear' ? 'Bearish' : 'Neutral'
    
    if (confidence >= 75) {
      return bias === 'bull' ? 'Strongly Bullish' : bias === 'bear' ? 'Strongly Bearish' : 'Neutral'
    } else if (confidence >= 60) {
      return bias === 'bull' ? 'Bullish' : bias === 'bear' ? 'Bearish' : 'Neutral'
    } else {
      return bias === 'bull' ? 'Slightly Bullish' : bias === 'bear' ? 'Slightly Bearish' : 'Neutral'
    }
  }
  
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 rounded-lg border bg-muted/50 border-border",
        compact ? "px-2 py-1" : "px-3 py-1.5"
      )}>
        <Loader2 className={cn("animate-spin text-muted-foreground", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
        <span className={cn("text-muted-foreground uppercase tracking-wide", compact ? "text-[8px]" : "text-[10px]")}>{label}</span>
      </div>
    )
  }
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={cn(
        "flex items-center rounded-lg border",
        compact ? "gap-1 px-2.5 py-1.5" : "gap-2 px-3 py-1.5 cursor-help",
        bias === 'bull' ? "bg-success/10 border-success/30" : 
        bias === 'bear' ? "bg-destructive/10 border-destructive/30" : 
        "bg-warning/10 border-warning/30"
      )}>
        <span className={cn(
          "rounded-full",
          compact ? "w-1.5 h-1.5" : "w-2 h-2",
          bias === 'bull' ? "bg-success" : bias === 'bear' ? "bg-destructive" : "bg-warning"
        )} />
        <span className={cn(
          "text-muted-foreground uppercase tracking-wide",
          compact ? "text-[9px]" : "text-[10px]"
        )}>{label}</span>
        <span className={cn(
          "font-medium flex items-center gap-0.5",
          compact ? "text-[9px]" : "text-xs",
          bias === 'bull' ? "text-success" : bias === 'bear' ? "text-destructive" : "text-warning"
        )}>
          {getBiasLabel()}
          {!compact && bias === 'bull' && <TrendingUp className="w-3 h-3" />}
          {!compact && bias === 'bear' && <TrendingDown className="w-3 h-3" />}
        </span>
        {confidence && (
          <span className={cn(
            "text-muted-foreground",
            compact ? "text-[8px]" : "text-[10px]"
          )}>({confidence}%)</span>
        )}
      </div>
      
      {/* Tooltip with signals */}
      {showTooltip && signals && signals.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 p-3 bg-popover border border-border rounded-lg shadow-xl">
          <p className="text-xs font-medium mb-2">Signaux techniques:</p>
          <ul className="space-y-1">
            {signals.slice(0, 5).map((signal, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                  bias === 'bull' ? "bg-success" : bias === 'bear' ? "bg-destructive" : "bg-warning"
                )} />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}



// Generate dynamic AI analysis based on symbol and REAL bias/confidence from API
function generateAIAnalysis(symbol: string, bias: 'bull' | 'bear' | 'neu', confidence: number = 50) {
  // Confidence-aware analysis that matches the dashboard bias
  const confLevel = confidence >= 60 ? 'forte' : confidence >= 40 ? 'moderee' : 'faible'
  
  const analyses: Record<string, { bull: string; bear: string; neu: string }> = {
    'XAU/USD': {
      bull: `Tendance haussiere sur l'or (confiance ${confLevel}). Les indicateurs techniques montrent une structure de prix ascendante. Support actif des banques centrales.`,
      bear: `Pression baissiere sur l'or (confiance ${confLevel}). Hausse des rendements reels et dollar fort pesent sur les metaux precieux.`,
      neu: `L'or consolide sans direction claire (signal ${confLevel}). Phase d'attente avant les prochains catalyseurs macro. Rester neutre.`
    },
    'XAG/USD': {
      bull: `L'argent montre une tendance haussiere (confiance ${confLevel}). Demande industrielle et correlation avec l'or soutiennent le metal.`,
      bear: `L'argent sous pression (confiance ${confLevel}). Inquietudes sur la croissance mondiale et ratio or/argent defavorable.`,
      neu: `L'argent oscille sans direction (signal ${confLevel}). Volatilite elevee, attendre un signal plus clair.`
    },
    'EUR/USD': {
      bull: `Euro en tendance haussiere (confiance ${confLevel}). Donnees europeennes positives et divergence BCE favorable.`,
      bear: `Euro faible (confiance ${confLevel}). Divergence Fed/BCE et croissance zone euro en question.`,
      neu: `EUR/USD consolide (signal ${confLevel}). Marches en attente des banques centrales.`
    },
    'GBP/USD': {
      bull: `Sterling en hausse (confiance ${confLevel}). Donnees UK solides et BoE ferme sur les taux.`,
      bear: `Cable sous pression (confiance ${confLevel}). Incertitudes UK et dollar refuge dominant.`,
      neu: `GBP/USD neutre (signal ${confLevel}). Surveillance inflation UK et BoE.`
    },
    'USD/JPY': {
      bull: `Dollar/Yen haussier (confiance ${confLevel}). Differentiel de taux Fed/BoJ favorable au dollar.`,
      bear: `Yen en reprise (confiance ${confLevel}). Speculations d'intervention BoJ et normalisation.`,
      neu: `USD/JPY en range (signal ${confLevel}). Niveaux d'intervention a surveiller.`
    },
    'US30': {
      bull: `Dow Jones haussier (confiance ${confLevel}). Valeurs industrielles et financieres en progression.`,
      bear: `Dow sous pression (confiance ${confLevel}). Craintes recession et resultats mitiges.`,
      neu: `Dow consolide (signal ${confLevel}). Equilibre entre resilience et risques de taux.`
    },
    'US100': {
      bull: `Nasdaq haussier (confiance ${confLevel}). Tech et IA soutiennent les mega-caps.`,
      bear: `Nasdaq en correction (confiance ${confLevel}). Prises de benefices et rotation sectorielle.`,
      neu: `Nasdaq neutre (signal ${confLevel}). Consolidation en cours, attendre direction.`
    },
    'US500': {
      bull: `S&P 500 haussier (confiance ${confLevel}). Largeur de marche positive et benefices solides.`,
      bear: `S&P 500 sous pression (confiance ${confLevel}). Valorisations elevees et prudence des investisseurs.`,
      neu: `S&P 500 consolide (signal ${confLevel}). Niveaux techniques cles testes.`
    },
    'DXY': {
      bull: `Dollar fort (confiance ${confLevel}). Fed hawkish et statut valeur refuge.`,
      bear: `Dollar en recul (confiance ${confLevel}). Attentes baisse taux et diversification reserves.`,
      neu: `DXY en range (signal ${confLevel}). Attente catalyseurs pour direction.`
    },
    'BTC/USD': {
      bull: `Bitcoin haussier (confiance ${confLevel}). Adoption institutionnelle et ETF spot favorables.`,
      bear: `Bitcoin sous pression (confiance ${confLevel}). Prises de benefices et incertitudes reglementaires.`,
      neu: `Bitcoin consolide (signal ${confLevel}). Range entre supports et resistances majeurs.`
    },
    'WTI': {
      bull: `Petrole WTI haussier (confiance ${confLevel}). Tensions geopolitiques et coupes OPEP+.`,
      bear: `WTI en baisse (confiance ${confLevel}). Craintes demande et stocks americains.`,
      neu: `Petrole neutre (signal ${confLevel}). Equilibre geopolitique et fondamentaux.`
    }
  }
  
  const defaultAnalysis = {
    bull: `${symbol} en tendance haussiere (confiance ${confLevel}). Indicateurs techniques positifs.`,
    bear: `${symbol} sous pression baissiere (confiance ${confLevel}). Signaux techniques negatifs.`,
    neu: `${symbol} neutre (signal ${confLevel}). Attendre catalyseurs pour direction claire.`
  }
  
  return (analyses[symbol] || defaultAnalysis)[bias]
}

// Pair data response type
interface PairDataResponse {
  price: number
  change: number
  changePercent: number
  swingBias: { bias: 'bull' | 'bear' | 'neu'; confidence: number }
  dayBias: { bias: 'bull' | 'bear' | 'neu'; confidence: number }
}

// Default watchlist for non-authenticated users
const DEFAULT_WATCHLIST = ['XAU/USD', 'XAG/USD', 'EUR/USD', 'US30', 'BTC/USD']

export function MarketCard({ symbol, bias, confidence, summary, factors, changePercent = 0, bulkAnalysis, compact = false, onDeepDive }: MarketCardProps) {
  const { t } = useI18n()

  // Fetch bias data from API
  const { data: pairData, isLoading: isLoadingPairData } = useSWR<PairDataResponse>(
    `/api/pair-data?symbol=${encodeURIComponent(symbol)}`,
    fetcher,
    { 
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 30000
    }
  )

  // Use real API data for swing/day bias - show actual direction, confidence indicates strength
  const swingBias = pairData?.swingBias?.bias || bias
  const dayBias = pairData?.dayBias?.bias || bias
  const swingConfidence = pairData?.swingBias?.confidence || confidence
  const dayConfidence = pairData?.dayBias?.confidence || confidence
  const currentPrice = pairData?.currentPrice || 0
  const priceChange = pairData?.change?.percent || 0
  
  
  // Market context detection
  const hasConflict = swingBias !== 'neu' && dayBias !== 'neu' && swingBias !== dayBias
  const marketContext = hasConflict ? 'PULLBACK' : (swingBias === 'neu' && dayBias === 'neu' ? 'RANGE' : 'TREND')
  
  const swingSignals: string[] = []
  const daySignals: string[] = []
  const isLoadingTechnical = isLoadingPairData

  const biasColors = {
    bull: "bg-success/10 text-success border-success/30",
    bear: "bg-destructive/10 text-destructive border-destructive/30",
    neu: "bg-warning/10 text-warning border-warning/30",
  }

  const biasText = {
    bull: t('bullish'),
    bear: t('bearish'),
    neu: t('neutral'),
  }

  const confBarColor = {
    bull: "bg-emerald-500",
    bear: "bg-red-500",
    neu: "bg-amber-500",
  }

  const report = reportData[symbol] || reportData["XAU/USD"]

  return (
    <>
      <div className={cn(
        "bg-card border border-border rounded-xl flex flex-col",
        compact ? "p-3" : "p-5"
      )}>
        {/* Header: Symbol + Price + Correlations */}
        <div className={cn(
          "flex items-start justify-between gap-4",
          compact ? "mb-2" : "mb-4"
        )}>
          <div className="flex-1 min-w-0">
            {/* Symbol name - no dropdown, fixed pairs */}
            <h3 className={cn(
              "font-semibold tracking-tight",
              compact ? "text-base" : "text-lg"
            )}>{symbol}</h3>
            
            {/* Price Display - Direct from TradingView (same source as chart) */}
            <div className={compact ? "-mt-0.5" : "-mt-1"}>
              <TradingViewPrice symbol={symbol} compact={compact} />
            </div>
          </div>
          
          {/* Correlations Section - Circular gauges */}
          {!compact && <CorrelationSection symbol={symbol} className="shrink-0" />}
        </div>

        {/* Swing Trading & Day Trading Badges - Always visible, full labels */}
        <div className={cn(
          "flex items-center gap-2 flex-wrap",
          compact ? "mb-3" : "mb-4"
        )}>
          {/* Swing Trading Badge - longer term bias from API */}
          <TradingBadge 
            label={t('swingTrading')}
            bias={swingBias}
            confidence={swingConfidence}
            signals={compact ? [] : swingSignals}
            isLoading={isLoadingTechnical}
          />
          {/* Day Trading Badge - short term bias from API */}
          <TradingBadge 
            label={t('dayTrading')}
            bias={dayBias}
            confidence={dayConfidence}
            signals={compact ? [] : daySignals}
            isLoading={isLoadingTechnical}
            compact={compact}
          />

        </div>

        {/* Confidence Bar - Uses SWING confidence (primary bias) - Hidden in compact mode */}
        {!compact && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{t('confidence')} (Swing)</span>
              <span className="text-xs font-medium">{swingConfidence}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", confBarColor[swingBias])}
                style={{ width: `${swingConfidence}%` }}
              />
            </div>
          </div>
        )}

        {/* Deep Dive DNA Button */}
        <div className="flex justify-end mt-1">
          <DnaButton onClick={() => onDeepDive && onDeepDive()} />
        </div>

        </div>

    </>
  )
}

// Loading skeleton
export function MarketCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="mb-4">
        <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-1.5 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="h-3 w-20 bg-muted rounded animate-pulse mb-2" />
      <div className="h-12 bg-muted rounded animate-pulse" />
      <div className="mt-4 h-10 bg-muted rounded-lg animate-pulse" />
      <div className="mt-4 pt-3 border-t border-border">
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}
