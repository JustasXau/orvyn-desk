# Production End-to-End Test Scenarios

## Scénario 1: XAU/USD Complet

**Test:** Validate que XAU/USD affiche toutes les données correctement.

### Steps:
1. Ouvrir dashboard et cliquer sur XAU/USD card
2. Vérifier affichage en temps réel du prix
3. Vérifier que Bias Swing ≠ Bias Day (valeurs différentes - pas de doublons)
4. Vérifier que l'analyse IA mentionne une news spécifique
5. Cliquer sur bouton Rapport → vérifier que rapport s'affiche sans erreur
6. Scroller jusqu'au calendrier → vérifier filtré (seulement USD/OR, pas EUR/GBP)

**Expected Results:**
- ✅ Prix mis à jour toutes les 60 secondes
- ✅ Swing 75% Bullish / Day 65% Bearish (DIFFÉRENTES)
- ✅ Analyse IA: "Tensions Iran soutiennent l'or malgré dollar fort"
- ✅ Rapport complet sans "Erreur analyse"
- ✅ Calendrier montre seulement NFP, CPI, FOMC (pas datas européennes)

### Résultat: □ PASS □ FAIL

---

## Scénario 2: Changement de Paire XAU/USD → EUR/USD

**Test:** Validate que toutes les données changent immédiatement au changement de paire.

### Steps:
1. Sur XAU/USD, noter les valeurs: prix, swingBias, dayBias, analyse IA
2. Cliquer sur EUR/USD dans la liste
3. Immédiatement après changement, vérifier:
   - Toutes les valeurs changent (pas les anciennes valeurs)
   - Bias Swing ≠ Bias Day (toujours différentes)
   - Analyse IA DIFFÉRENTE et contextualisée EUR/USD
   - Calendrier montre USD+EUR (pas OR)
   - Corrélations changent (au lieu de XAU corrélations, voir EUR corrélations)

**Expected Results:**
- ✅ Prix EUR/USD ~1.08 (pas 2050)
- ✅ Analyse mentionne EUR/ECB, pas OR/Iran
- ✅ Calendrier: ECB meetings, inflation data (pas NFP OR data)

### Résultat: □ PASS □ FAIL

---

## Scénario 3: News Haute Importance

**Test:** Validate que les news HIGH IMPACT sont traitées correctement.

### Steps:
1. Si NFP ou CPI dans le fil d'actualité de la journée:
   - Aller sur USD pairs (EUR/USD, GBP/USD, USD/JPY)
   - Vérifier que l'analyse IA MENTIONNE explicitement "NFP" ou "CPI"
   - Vérifier que le calendrier l'affiche en ROUGE pour ces paires
2. Pour XAU/USD: vérifier que l'analyse mentionne aussi "NFP" si disponible
3. Pour GBP/USD: vérifier que NFP est mentionné (USD impact GBP)

**Expected Results:**
- ✅ EUR/USD analyse: "NFP affaiblit EUR vs USD"
- ✅ Calendrier EUR/USD: NFP en ROUGE
- ✅ XAU/USD analyse: "NFP fort soutient USD, pression sur l'or"

### Résultat: □ PASS □ FAIL

---

## Scénario 4: Rapport Complet Contextualisé

**Test:** Validate que les rapports sont uniques et contextualisés par paire.

### Steps:
1. Ouvrir XAU/USD → cliquer Rapport
2. Copier la première paragraphe de l'analyse
3. Fermer rapport
4. Cliquer EUR/USD → cliquer Rapport
5. Comparer la première paragraphe

**Expected Results:**
- ✅ XAU/USD rapport: Mentionne "Safe haven", "géopolitique Iran", "inflation USD"
- ✅ EUR/USD rapport: Mentionne "ECB", "economic divergence", "USD strength"
- ✅ AUCUNE phrase identique entre les deux rapports (100% contextualisés)

### Résultat: □ PASS □ FAIL

---

## Scénario 5: Stabilité - 10 Minutes

**Test:** Validate que le système reste stable sans erreurs.

### Steps:
1. Ouvrir dashboard avec 3 paires (XAU/USD, EUR/USD, GBP/USD)
2. Laisser tourner 10 minutes
3. Tous les 2 minutes:
   - Vérifier que les prix changent
   - Vérifier que les analyses se mettent à jour
   - Ouvrir console F12 → vérifier aucune erreur (exception: network warnings OK)
4. Après 10 minutes:
   - Vérifier aucun appel API qui reste en "pending"
   - Vérifier pas de "Erreur analyse" visible
   - Vérifier toutes les cartes toujours chargées

**Expected Results:**
- ✅ Prix changent régulièrement
- ✅ Console: Zéro erreurs JavaScript
- ✅ Analyses se mettent à jour (dernière mise à jour < 5 minutes)
- ✅ Aucun appel API qui freeze/timeout

### Résultat: □ PASS □ FAIL

---

## Résumé Final des Tests

| Scénario | Résultat | Problème | Correction |
|----------|----------|----------|------------|
| XAU/USD complet | □ ✅ □ ❌ | | |
| Changement paire | □ ✅ □ ❌ | | |
| News haute impact | □ ✅ □ ❌ | | |
| Rapport complet | □ ✅ □ ❌ | | |
| Stabilité 10min | □ ✅ □ ❌ | | |

---

## Notes Complémentaires

### Checklist Production:
- [ ] Toutes les env vars configurées dans Vercel
- [ ] GROQ_API_KEY fonctionnelle (test depuis composant)
- [ ] FINNHUB_API_KEY fonctionnelle
- [ ] Supabase connectée (news/calendrier sync)
- [ ] Redis Upstash connecté (caching actif)
- [ ] Tous les 25 endpoints retournent 200 OK

### Commandes de Debug:
```bash
# Voir les logs live
vercel logs --follow

# Tester un endpoint spécifique
curl "https://yourapp.vercel.app/api/pair-data?symbol=XAU/USD"

# Voir les env vars (depuis Vercel Dashboard)
Settings → Environment Variables
```

### Si Erreurs:
1. Vérifier console F12 (erreur client)
2. Vérifier Vercel logs (erreur serveur)
3. Vérifier que les env vars sont set et non vides
4. Redéployer si changements env vars
