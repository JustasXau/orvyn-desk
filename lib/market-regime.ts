/**
 * Market Regime Detection
 * Determines the current macro environment: Risk-On, Risk-Off, Stagflation, Goldilocks
 */

export type MarketRegime = 'RISK_ON' | 'RISK_OFF' | 'STAGFLATION' | 'GOLDILOCKS' | 'TRANSITIONAL'

export interface RegimeAnalysis {
  regime: MarketRegime
  confidence: number // 0-100
  signals: string[]
  description: string
  implicationsGold: string
  implicationsEquities: string
  implicationsDollar: string
}

interface BiasData {
  symbol: string
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: number
}

/**
 * Detect market regime from cross-asset biases
 * 
 * Risk-On: Equities up, VIX down, Gold down, Dollar down
 * Risk-Off: Equities down, VIX up, Gold up, Dollar up (flight to safety)
 * Stagflation: Equities down, Gold up, Inflation expectations up, Growth down
 * Goldilocks: Equities up, Inflation stable, Growth positive, VIX low
 */
export function detectMarketRegime(biases: BiasData[]): RegimeAnalysis {
  const getBias = (symbol: string): BiasData | undefined => 
    biases.find(b => b.symbol === symbol || b.symbol.includes(symbol))
  
  const us500 = getBias('US500') || getBias('SPX')
  const us100 = getBias('US100') || getBias('NDX')
  const vix = getBias('VIX')
  const gold = getBias('XAU') || getBias('GOLD')
  const dxy = getBias('DXY') || getBias('USD')
  const us10y = getBias('US10Y') || getBias('TNX')
  
  const signals: string[] = []
  let riskOnScore = 0
  let riskOffScore = 0
  let stagflationScore = 0
  let goldilicksScore = 0
  
  // Equities sentiment
  if (us500?.direction === 'BULLISH') {
    riskOnScore += 25
    goldilicksScore += 20
    signals.push('S&P 500 haussier')
  } else if (us500?.direction === 'BEARISH') {
    riskOffScore += 25
    stagflationScore += 15
    signals.push('S&P 500 baissier')
  }
  
  if (us100?.direction === 'BULLISH') {
    riskOnScore += 20
    signals.push('Nasdaq haussier')
  } else if (us100?.direction === 'BEARISH') {
    riskOffScore += 20
    signals.push('Nasdaq baissier')
  }
  
  // VIX sentiment (inverse logic)
  if (vix?.direction === 'BEARISH') {
    riskOnScore += 20
    goldilicksScore += 15
    signals.push('VIX en baisse (confiance)')
  } else if (vix?.direction === 'BULLISH') {
    riskOffScore += 25
    signals.push('VIX en hausse (stress)')
  }
  
  // Gold sentiment
  if (gold?.direction === 'BULLISH') {
    riskOffScore += 20
    stagflationScore += 20
    signals.push('Or haussier (valeur refuge)')
  } else if (gold?.direction === 'BEARISH') {
    riskOnScore += 15
    signals.push('Or baissier (appetit pour le risque)')
  }
  
  // Dollar sentiment
  if (dxy?.direction === 'BULLISH') {
    riskOffScore += 15
    signals.push('Dollar fort (fuite vers la securite)')
  } else if (dxy?.direction === 'BEARISH') {
    riskOnScore += 15
    signals.push('Dollar faible (risk-on)')
  }
  
  // Yields
  if (us10y?.direction === 'BULLISH') {
    stagflationScore += 15
    signals.push('Rendements en hausse')
  } else if (us10y?.direction === 'BEARISH') {
    goldilicksScore += 10
    signals.push('Rendements en baisse')
  }
  
  // Determine dominant regime
  const scores = [
    { regime: 'RISK_ON' as MarketRegime, score: riskOnScore },
    { regime: 'RISK_OFF' as MarketRegime, score: riskOffScore },
    { regime: 'STAGFLATION' as MarketRegime, score: stagflationScore },
    { regime: 'GOLDILOCKS' as MarketRegime, score: goldilicksScore },
  ].sort((a, b) => b.score - a.score)
  
  const topScore = scores[0].score
  const secondScore = scores[1].score
  
  // If scores are close, regime is transitional
  const regime = (topScore - secondScore) < 15 ? 'TRANSITIONAL' : scores[0].regime
  const confidence = Math.min(100, topScore)
  
  const descriptions: Record<MarketRegime, string> = {
    'RISK_ON': 'Appetit pour le risque eleve - Les investisseurs recherchent des actifs a rendement plus eleve',
    'RISK_OFF': 'Aversion au risque - Fuite vers les valeurs refuges (or, yen, obligations)',
    'STAGFLATION': 'Croissance faible + inflation elevee - Environnement difficile pour les actifs',
    'GOLDILOCKS': 'Croissance moderee + inflation maitrisee - Environnement ideal pour les actions',
    'TRANSITIONAL': 'Regime en transition - Signaux mixtes, prudence recommandee',
  }
  
  const goldImplications: Record<MarketRegime, string> = {
    'RISK_ON': 'Or sous pression - Les flux vont vers les actifs risques',
    'RISK_OFF': 'Or soutenu - Demande de valeur refuge active',
    'STAGFLATION': 'Or tres haussier - Protection contre inflation + incertitude',
    'GOLDILOCKS': 'Or neutre a baissier - Pas de besoin de protection',
    'TRANSITIONAL': 'Or volatil - Suivre le DXY et les taux reels',
  }
  
  const equitiesImplications: Record<MarketRegime, string> = {
    'RISK_ON': 'Actions haussieres - Favoriser tech et growth',
    'RISK_OFF': 'Actions sous pression - Favoriser defensives',
    'STAGFLATION': 'Actions tres bearish - Secteurs energie et matieres premieres peuvent surperformer',
    'GOLDILOCKS': 'Actions haussieres - Large rally possible',
    'TRANSITIONAL': 'Actions volatiles - Reduire exposition',
  }
  
  const dollarImplications: Record<MarketRegime, string> = {
    'RISK_ON': 'Dollar faible - Carry trades actifs',
    'RISK_OFF': 'Dollar fort - Flight to safety',
    'STAGFLATION': 'Dollar mixte - Depend de la politique Fed',
    'GOLDILOCKS': 'Dollar stable a faible',
    'TRANSITIONAL': 'Dollar volatil',
  }
  
  return {
    regime,
    confidence,
    signals,
    description: descriptions[regime],
    implicationsGold: goldImplications[regime],
    implicationsEquities: equitiesImplications[regime],
    implicationsDollar: dollarImplications[regime],
  }
}

/**
 * Check for cross-asset contradictions
 */
export function detectContradictions(biases: BiasData[]): string[] {
  const contradictions: string[] = []
  
  const getBias = (symbol: string): BiasData | undefined => 
    biases.find(b => b.symbol === symbol || b.symbol.includes(symbol))
  
  const us500 = getBias('US500')
  const vix = getBias('VIX')
  const gold = getBias('XAU')
  const dxy = getBias('DXY')
  const us100 = getBias('US100')
  const us10y = getBias('US10Y')
  
  // US500 Bullish + VIX Bullish = contradiction
  if (us500?.direction === 'BULLISH' && vix?.direction === 'BULLISH') {
    contradictions.push('ALERTE: S&P 500 haussier mais VIX aussi haussier - Signal de prudence')
  }
  
  // US100 Bullish + US10Y strongly Bullish = contradiction (high rates = bearish tech)
  if (us100?.direction === 'BULLISH' && us10y?.direction === 'BULLISH' && (us10y?.confidence || 0) > 70) {
    contradictions.push('ALERTE: Nasdaq haussier mais taux 10Y en forte hausse - Tension potentielle')
  }
  
  // Gold and DXY both strongly bullish = unusual
  if (gold?.direction === 'BULLISH' && dxy?.direction === 'BULLISH') {
    contradictions.push('NOTE: Or et Dollar tous deux haussiers - Regime de peur extreme ou biais incorrects')
  }
  
  // Gold and Silver diverging strongly
  const silver = getBias('XAG')
  if (gold?.direction !== silver?.direction && gold && silver) {
    contradictions.push('NOTE: Or et Argent divergent - Verifier ratio Gold/Silver')
  }
  
  return contradictions
}
