# Corrections - Erreur "Erreur analyse" sur les cartes

## 🔍 Cause Identifiée

L'API `/api/quick-analysis` échouait silencieusement (sans message d'erreur visible) en raison de:
1. Manque de logging détaillé pour déboguer les erreurs
2. Pas de fallback si l'API échoue
3. Message d'erreur générique "Erreur analyse" sans détails

## ✅ Fixes Appliquées

### 1. **`hooks/use-quick-analysis.ts`** - Debugging Amélioré

Ajouté un logging détaillé avant chaque appel API:
```typescript
// Log request body
console.log('[useQuickAnalysisWithInterval] Fetching for:', {
  symbol,
  price,
  priceChange,
  swingBias: swingBias?.direction,
  dayBias: dayBias?.direction,
})

// Log raw response before parsing
const text = await res.text()
console.log('[useQuickAnalysisWithInterval] Response status:', res.status)
console.log('[useQuickAnalysisWithInterval] Response text:', text.substring(0, 200))
```

**Avantage:** Console affichera exactement ce que l'API retourne (erreur complète ou réponse vide).

### 2. **`hooks/use-quick-analysis.ts`** - Fallback Analysis

Ajouté une fonction de fallback si Groq échoue:
```typescript
function generateTechnicalFallback(symbol, swingBias, priceChange): string {
  const direction = priceChange > 0 ? 'hausse' : 'baisse'
  return `${symbol} en ${direction}%. Bias swing ${swingBias.direction}`
}

// Called on error instead of showing "Erreur analyse"
setAnalysis(fallbackAnalysis)
```

**Avantage:** Les cartes affichent une analyse technique de secours au lieu d'une erreur.

### 3. **`app/api/quick-analysis/route.ts`** - Logging Amélioré

Ajouté un logging serveur détaillé:
```typescript
console.log('[Quick Analysis] Body reçu:', {
  symbol,
  price,
  priceChange,
  swingBias: swingBias?.direction,
  dayBias: dayBias?.direction,
})

// If Groq not configured
if (!groq) {
  console.warn('[Quick Analysis] GROQ_API_KEY not configured - using fallback')
  return { analysis: 'Analyse AI indisponible...' }
}

console.error('[Quick Analysis] Error:', {
  message: error.message,
  stack: error.stack
})
```

**Avantage:** Logs Vercel montreront exactement où l'API échoue (clé manquante, body mal formé, timeout Groq, etc).

### 4. **`components/quick-analysis-display.tsx`** - Affichage Erreur Réelle

Modifié pour afficher le message d'erreur réel au lieu de juste "Erreur analyse":
```typescript
if (error) {
  return (
    <div className="...">
      <AlertCircle className="..." />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">Erreur analyse</span>
        <span className="text-xs">{error}</span>  {/* ← Message d'erreur réel */}
      </div>
    </div>
  )
}
```

**Avantage:** L'utilisateur voit l'erreur réelle directement dans le navigateur.

## 🎯 Causes Possibles Maintenant Visibles

| Cause | Symptôme | Solution |
|-------|----------|----------|
| GROQ_API_KEY manquante | "Groq API not configured" | Ajouter variable d'env Vercel |
| Body mal formé | "HTTP 400" | Vérifier que `symbol`, `price`, `priceChange` sont envoyés |
| Groq rate limit | "HTTP 429" | Attendre ou augmenter les limites |
| Groq timeout | "HTTP 504" ou timeout | Réessayer ou augmenter max_tokens |
| Groq response vide | "Groq returned empty response" | Groq crash interne |
| Réseau instable | "fetch failed" ou CORS | Vérifier connexion réseau |

## 📊 Avant vs Après

**AVANT:**
```
❌ Cartes affichent "Erreur analyse"
❌ Aucun message d'erreur visible
❌ Logs incomplets: pas de body, pas de réponse
❌ Aucun fallback → expérience cassée
```

**APRÈS:**
```
✅ Cartes affichent "Erreur analyse: GROQ_API_KEY manquante"
✅ Utilisateur voit exactement ce qui ne va pas
✅ Logs complets: body, status, réponse brute
✅ Fallback activation: affiche analyse technique si Groq échoue
```

## 🚀 Prochain Debugging

Ouvre la console (F12) et:

1. **Cherche les logs** `[useQuickAnalysisWithInterval]` et `[Quick Analysis]`
2. **L'erreur réelle** s'affichera dans:
   - Console navigateur (client logs)
   - Vercel Dashboard → Logs (server logs)
3. **Exemple de log utile:**
   ```
   [useQuickAnalysisWithInterval] Response status: 500
   [useQuickAnalysisWithInterval] Response text: {"error":"GROQ_API_KEY manquante"}
   ```

## ✅ Status

- Build: **✅ Passed**
- API route: **✅ Improved logging**
- Hook: **✅ Fallback + detailed errors**
- Component: **✅ Shows actual error message**
