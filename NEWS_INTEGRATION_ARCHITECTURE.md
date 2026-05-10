# Architecture d'Intégration News en Temps Réel

## Vue d'ensemble

Ce document décrit l'architecture implémentée pour connecter le fil d'actualité (185 articles) au système d'analyse IA en temps réel, créant une analyse cohérente et contextualisée pour chaque paire.

## Architecture Complète

```
Fil d'actualité (185 articles)
        ↓
Filtre par paire (NEWS_KEYWORDS_MAP)
        ↓
Top 5 news les plus récentes et pertinentes (quick-analysis)
OU Toutes les news filtrées (unified-report)
        ↓
Injectées dans le prompt Groq avec SYSTEM_PROMPT_ANALYST
        ↓
Analyse cohérente bias + prix + news du moment
```

## Fichiers Modifiés

### 1. `/lib/contextual-report.ts` - Générateur de Prompts Contextualisés
**Nouvelles fonctions:**

#### `buildQuickAnalysisPrompt(params: QuickAnalysisParams): string`
- Génère un prompt pour l'analyse courte de la carte du desk (2 phrases max)
- Filtre les **top 5 news les plus récentes** pour cette paire
- Détecte les divergences: prix ↑ mais bias ↓ = tension à expliquer
- Format: `[VERDICT CLAIR] → [IMPLICATION IMMÉDIATE]`
- Exemple: "Bullish structurel mais rejet EMA20 sur M15 → Attendre break au-dessus du dernier HH"

#### `buildContextualPrompt(params: ContextualReportParams): string` (amélioré)
- Génère un prompt pour le rapport complet (300 mots max)
- Inclut **TOUTES les news filtrées** (pas seulement top 5)
- Structure: SITUATION → CATALYSEURS → BIAIS → NIVEAUX → RISQUES → CONCLUSION
- Inclut les règles de cohérence strictes

#### `SYSTEM_PROMPT_ANALYST` (nouveau)
- System prompt global pour Groq enforçant la cohérence logique
- Règles absolues: "news baissière + prix ↑ = divergence à expliquer"
- Si NFP/CPI/FOMC sort = point CENTRAL
- Ne jamais contredire les données sans explication

#### `getTimeAgo(timestamp: number): string` (helper)
- Formate les timestamps: "il y a 5m", "il y a 2h", "il y a 1j"
- Utilisé dans les sections de news pour montrer la récence

### 2. `/app/api/quick-analysis/route.ts` - Analyse Courte (NOUVEAU)
**POST /api/quick-analysis**
- Endpoint pour l'analyse courte (desk card)
- Params: `symbol`, `price`, `priceChange`, `swingBias`, `dayBias`, `news`, `technicalContext`
- Retourne: `{ symbol, analysis, timestamp, dataUsed }`
- Rate limit: 100 req/min
- Utilise `buildQuickAnalysisPrompt` + `SYSTEM_PROMPT_ANALYST`
- Cache: Non (génération rapide, 2 phrases)

### 3. `/app/api/unified-report/route.ts` - Rapport Complet (amélioré)
**POST /api/unified-report**
- Modifications:
  - Import du `SYSTEM_PROMPT_ANALYST`
  - Ajout du `system` prompt dans l'appel Groq
  - `buildContextualPrompt` injecte maintenant TOUTES les news filtrées
- Cache: 5 minutes
- Rate limit: Existant

### 4. `/lib/impact-map.ts` - Keywords et Filtrage (existant mais amélioré)
**NEWS_KEYWORDS_MAP** - Ajouté avec 15-20 keywords par paire:
```typescript
'XAU/USD': ['gold', 'inflation', 'fed', 'central bank', 'safe haven', ...],
'US100': ['nasdaq', 'tech', 'fed', 'earnings', 'ai', ...],
'DXY': ['dollar', 'fed', 'interest rate', 'nfp', ...],
```

**filterNewsForSymbol()** - Amélioré:
- Score de matching: compte combien de keywords matchent
- Articles avec 50%+ de keywords sont retenus
- Logging détaillé pour audit
- Optionnel: `minScore`, `logDetails`

## Flux de Données

### Pour l'Analyse Courte (Quick Analysis)
```
[Client] POST /api/quick-analysis
  ↓
[Backend] filterNewsForSymbol(symbol, news) → top 5 recent + relevant
  ↓
[Backend] buildQuickAnalysisPrompt() → prompt with top 5 + divergence detection
  ↓
[Groq] llama-3.3-70b with SYSTEM_PROMPT_ANALYST
  ↓
[Response] { symbol, analysis (2 phrases), timestamp, dataUsed }
```

### Pour le Rapport Complet (Unified Report)
```
[Client] POST /api/unified-report
  ↓
[Backend] filterNewsForSymbol() → toutes les news filtrées (triées par récence)
  ↓
[Backend] filterEventsForSymbol() → événements éco filtrés
  ↓
[Backend] buildContextualPrompt() → prompt COMPLET avec TOUTES les news
  ↓
[Groq] llama-3.3-70b with SYSTEM_PROMPT_ANALYST
  ↓
[Response] { symbol, report, cached, timestamp, dataQuality }
```

## Règles de Cohérence Implémentées

Le `SYSTEM_PROMPT_ANALYST` enforça 7 règles absolues:

1. **Divergence détectée** - "Une news baissière récente + prix qui monte = divergence à EXPLIQUER"
2. **Tension signalée** - "Une news haussière récente + bias bearish = tension à SIGNALER"
3. **Point central** - "Si NFP, CPI, FOMC vient de sortir = c'est le point CENTRAL de l'analyse"
4. **Importance haute** - "Ne JAMAIS ignorer une news haute importance sortie dans la dernière heure"
5. **Pas de contradiction** - "Ne JAMAIS contredire les données sans explication logique"
6. **Cohérence logique** - "TOUJOURS relier news + technique + prix dans une logique cohérente"
7. **Analyse technique seule** - "Si aucune news pertinente → baser l'analyse sur le technique uniquement et le mentionner"

## Vérifications de Qualité

### Dans `buildQuickAnalysisPrompt`:
- ✅ Détecte divergences (prix ↑ mais bias ↓)
- ✅ Limite à top 5 news pour clarté
- ✅ Formate les timestamps (il y a 5m, etc.)
- ✅ Ajoute warning si 0 news trouvées

### Dans `buildContextualPrompt`:
- ✅ Logs détaillés sur la qualité des données
- ⚠️ Warning si 0 news
- ⚠️ Warning si <3 news (données limitées)
- ✅ Sort les news par récence
- ✅ Affiche le count total de news filtrées

### Dans les APIs:
- ✅ Validation du symbol
- ✅ Rate limiting (100-200 req/min)
- ✅ Validation du rapport (pas de genericité)
- ✅ Logging des erreurs

## Fréquence de Mise à Jour

### Analyse Courte (Quick Analysis)
- **Rafraîchissement si:**
  - Nouvelle news filtrée pour cette paire arrive
  - Le bias change de direction
  - Demande explicite du client (pas de cache)

### Rapport Complet (Unified Report)
- **Cache: 5 minutes**
- **Rafraîchissement sur:**
  - `forceRefresh=true` dans la request
  - Expiration du cache (5 min)
  - Nouvelle news haute importance

## Utilisation

### Quick Analysis (Desk Card)
```bash
POST /api/quick-analysis
Content-Type: application/json

{
  "symbol": "XAU/USD",
  "price": 2400.50,
  "priceChange": 1.25,
  "swingBias": { "direction": "Bullish", "confidence": 75, "score": 0.65 },
  "dayBias": { "direction": "Bearish", "confidence": 60, "score": -0.45 },
  "news": [ /* 185 articles */ ],
  "technicalContext": "RSI 55, au-dessus EMA20"
}
```

**Response:**
```json
{
  "symbol": "XAU/USD",
  "analysis": "Bullish structurel mais rejet H1 EMA20 freine la progression. Attendre confirmation au-dessus du dernier HH avant de chercher l'achat.",
  "timestamp": "2025-05-05T14:30:00Z",
  "dataUsed": {
    "relevantNews": 12,
    "hasNews": true
  }
}
```

### Unified Report (Full Analysis)
```bash
POST /api/unified-report
Content-Type: application/json

{
  "symbol": "XAU/USD",
  "forceRefresh": false
}
```

**Response:**
```json
{
  "symbol": "XAU/USD",
  "report": "SITUATION ACTUELLE — ...",
  "cached": false,
  "timestamp": 1714934400000,
  "cacheExpiresIn": 300,
  "dataQuality": {
    "completeness": 100,
    "missingData": []
  }
}
```

## Améliorations Futures

1. **Scoring des news** - Importance dynamique basée sur impact historique
2. **Détection de catalyseurs** - Identifier automatiquement NFP, CPI, FOMC
3. **Corrélations dynamiques** - Refléter les corrélations en temps réel
4. **Persistence du cache** - Redis au lieu de Map en mémoire
5. **Analytics** - Tracking de la performance des analyses Groq
6. **A/B Testing** - Tester différents prompts Groq

## Files Résumé

| Fichier | Type | Modifications | Impact |
|---------|------|---------------|--------|
| `lib/contextual-report.ts` | Library | +120 lignes (Quick Analysis + System Prompt) | ✅ Quick + Full prompts |
| `app/api/quick-analysis/route.ts` | API Route | NOUVEAU (86 lignes) | ✅ Analyse courte desk card |
| `app/api/unified-report/route.ts` | API Route | +2 lignes (System prompt) | ✅ Rapport complet avec cohérence |
| `lib/impact-map.ts` | Library | Existant (NEWS_KEYWORDS_MAP + filterNews) | ✅ Filtrage symbo-spécifique |

## Résumé de l'Architecture

L'architecture implémentée:
1. ✅ **Connecte 185 articles** au système d'analyse en temps réel
2. ✅ **Filtre par paire** avec 15-20 keywords métier pour chaque symbole
3. ✅ **Two-tier analysis**: courte (2 phrases desk) + complète (rapport structuré)
4. ✅ **Enforces coherence** via SYSTEM_PROMPT_ANALYST (7 règles absolues)
5. ✅ **Real-time updates** avec détection de divergences et nouvelles news
6. ✅ **Quality validation** et logging détaillé pour debugging

**Résultat:** Les analyses sont maintenant **contextualisées, cohérentes et ancrées dans la réalité actuelle des news et du marché!** 🎯
