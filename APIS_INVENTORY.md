# Inventaire des APIs - ORVYNDESK

## APIs avec cle (configurees dans .env)

### 1. FRED - Federal Reserve Economic Data
- **Variable env** : `FRED_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://fred.stlouisfed.org/docs/api/api_key.html
- **Limite gratuite** : Illimitee
- **Utilisee dans** :
  - `app/api/economics/route.ts`
  - `app/api/interest-rates/route.ts`
- **Couvre** : PIB, inflation (CPI/PCE/PPI), emploi, taux fed funds, US10Y, indicateurs macro US

---

### 2. Groq - LLM IA
- **Variable env** : `GROQ_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://console.groq.com
- **Limite gratuite** : 14,400 req/jour
- **Utilisee dans** :
  - `app/api/ai-analysis/route.ts`
  - `app/api/ai/analyze/route.ts`
  - `app/api/bulk-analysis/route.ts`
  - `app/api/calendar-analysis/route.ts`
  - `app/api/candle-analysis/route.ts`
  - `app/api/orvyn/route.ts`
  - `app/api/orvyn/analysis/route.ts`
  - `app/api/quick-analysis/route.ts`
  - `app/api/unified-report/route.ts`
  - `lib/pipeline-flow.ts`
- **Couvre** : Analyses IA, biais directionnels, ORVYN engine

---

### 3. Finnhub
- **Variable env** : `FINNHUB_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://finnhub.io/dashboard
- **Limite gratuite** : 60 req/min
- **Utilisee dans** :
  - `app/api/market-data/route.ts`
  - `app/api/news/route.ts`
  - `app/api/economic-calendar/route.ts`
  - `app/api/candle-analysis/route.ts`
  - `app/api/technical-analysis/route.ts`
  - `app/api/trump/route.ts`
  - `lib/get-market-data.ts`
  - `lib/pipeline-flow.ts`
- **Couvre** : Prix actions/forex, news, calendrier economique, chandeliers

---

### 4. Alpha Vantage
- **Variable env** : `ALPHA_VANTAGE_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://www.alphavantage.co/support/#api-key
- **Limite gratuite** : 25 req/jour
- **Utilisee dans** :
  - `app/api/dual-bias/route.ts`
  - `app/api/historical-prices/route.ts`
  - `app/api/technical-indicators/route.ts`
  - `app/api/news/route.ts`
- **Couvre** : Indicateurs techniques (RSI, MACD, ATR, ADX, EMA, STOCH), historique Forex/actions/commodites, news sentiment

---

### 5. NewsAPI
- **Variable env** : `NEWS_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://newsapi.org/account
- **Limite gratuite** : 100 req/jour (dev)
- **Utilisee dans** :
  - `app/api/news/route.ts`
  - `app/api/trump/route.ts`
- **Couvre** : News business/forex generales, news Trump/geopolitique

---

### 6. GNews
- **Variable env** : `GNEWS_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://gnews.io/dashboard
- **Limite gratuite** : 100 req/jour
- **Utilisee dans** :
  - `app/api/news/route.ts`
- **Couvre** : Headlines monde, business, geopolitique (OR/Russie/Iran/Chine)

---

### 7. Polygon.io
- **Variable env** : `POLYGON_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://polygon.io/dashboard
- **Limite gratuite** : Illimitee (donnees retardees)
- **Utilisee dans** :
  - `app/api/news/route.ts`
- **Couvre** : News financieres actions

---

### 8. MarketAux
- **Variable env** : `MARKETAUX_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://www.marketaux.com/dashboard
- **Limite gratuite** : 100 req/jour
- **Utilisee dans** :
  - `app/api/news/route.ts`
- **Couvre** : News marches financiers

---

### 9. NewsData.io
- **Variable env** : `NEWSDATA_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://newsdata.io/api-key
- **Limite gratuite** : 200 req/jour
- **Utilisee dans** :
  - `app/api/news/route.ts`
- **Couvre** : News financieres multi-sources

---

### 10. Supabase
- **Variables env** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Statut** : Configuree
- **Dashboard** : https://app.supabase.com
- **Limite gratuite** : 500MB DB, 2GB bandwidth
- **Utilisee dans** :
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `lib/supabase/middleware.ts`
  - `lib/pipeline-flow.ts`
  - `lib/trading-pipeline.ts`
  - `app/auth/login/page.tsx`
  - `app/auth/sign-up/page.tsx`
- **Couvre** : Auth utilisateurs, stockage analyses, persistance donnees

---

### 11. Upstash Redis (Rate Limiting)
- **Variables env** : `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- **Statut** : Configuree
- **Dashboard** : https://console.upstash.com
- **Limite gratuite** : 10,000 req/jour
- **Utilisee dans** :
  - `lib/rate-limit.ts`
- **Couvre** : Rate limiting des API calls

---

### 12. Metals API
- **Variable env** : `METALS_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://metals-api.com/dashboard
- **Utilisee dans** :
  - `app/api/metals/route.ts`
- **Couvre** : Prix spot metaux (XAU, XAG, XCU, XPT, XPD)

---

### 13. GoldAPI
- **Variable env** : `GOLDAPI_KEY`
- **Statut** : A verifier
- **Dashboard** : https://www.goldapi.io/dashboard
- **Utilisee dans** :
  - `lib/get-market-data.ts`
- **Couvre** : Prix or en temps reel

---

### 14. Twelve Data
- **Variable env** : `TWELVE_DATA_API_KEY` / `TWELVEDATA_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://twelvedata.com/account/api-keys
- **Limite gratuite** : 800 req/jour
- **Utilisee dans** :
  - `app/api/twelve-data/route.ts`
  - `app/api/technical-analysis/route.ts`
  - `lib/get-market-data.ts`
- **Couvre** : Series temporelles actions/forex/indices, prix en direct

---

### 15. ExchangeRate API
- **Variable env** : `EXCHANGE_RATE_API_KEY`
- **Statut** : Configuree
- **Dashboard** : https://app.exchangerate-api.com/dashboard
- **Limite gratuite** : 1,500 req/mois
- **Utilisee dans** :
  - `app/api/exchange-rates/route.ts`
- **Couvre** : Taux de change toutes devises (fallback Frankfurter)

---

## APIs gratuites sans cle

### 1. Yahoo Finance
- **URL de base** : `https://query1.finance.yahoo.com/v8/finance/chart/`
- **Type** : REST JSON
- **Utilisee dans** :
  - `app/api/candles/route.ts`
  - `app/api/correlations/route.ts`
  - `app/api/deep-dive/route.ts`
  - `app/api/ohlc/route.ts`
  - `app/api/orvyn/analysis/route.ts`
  - `app/api/pair-data/route.ts`
  - `app/api/tv-price/route.ts`
  - `app/api/unified-data/route.ts`
  - `app/api/yahoo-price/route.ts`
- **Couvre** : XAU/USD, DXY, VIX, US10Y (^TNX), toutes paires forex, indices

---

### 2. Stooq
- **URL de base** : `https://stooq.com/q/d/l/`
- **Type** : CSV
- **Utilisee dans** :
  - `app/api/stooq/route.ts`
- **Couvre** : XAU/USD, ^DJI (Dow Jones), historique complet

---

### 3. Frankfurter
- **URL de base** : `https://api.frankfurter.app/latest`
- **Type** : REST JSON
- **Utilisee dans** :
  - `app/api/exchange-rates/route.ts`
- **Couvre** : Taux de change BCE (EUR base) - fallback

---

### 4. World Bank
- **URL de base** : `https://api.worldbank.org/v2/country/`
- **Type** : REST JSON
- **Utilisee dans** :
  - `app/api/world-bank/route.ts`
- **Couvre** : PIB, inflation, chomage, IDE, 190+ pays, donnees annuelles

---

### 5. CoinGecko
- **URL de base** : `https://api.coingecko.com/api/v3/`
- **Type** : REST JSON
- **Utilisee dans** :
  - `app/api/historical-prices/route.ts`
- **Couvre** : Historique crypto (BTC, ETH, etc.)

---

### 6. ForexFactory Calendar (FF)
- **URL de base** : `https://nfs.faireconomy.media/ff_calendar_thisweek.json`
- **Type** : REST JSON
- **Utilisee dans** :
  - `app/api/economic-calendar/route.ts`
- **Couvre** : Calendrier economique hebdomadaire

---

### 7. RSS2JSON
- **URL de base** : `https://api.rss2json.com/v1/api.json`
- **Type** : REST JSON (proxy RSS)
- **Utilisee dans** :
  - `app/api/news/route.ts`
- **Couvre** : Flux RSS: Investing.com, ForexLive, CNBC, Bloomberg, MarketWatch, Cointelegraph, ZeroHedge, FXStreet

---

### 8. Reuters RSS
- **URL** : `https://feeds.reuters.com/reuters/politicsNews`
- **Type** : RSS XML
- **Utilisee dans** :
  - `app/api/trump/route.ts`
- **Couvre** : News politique US (Trump tracker)

---

### 9. BBC RSS
- **URL** : `https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml`
- **Type** : RSS XML
- **Utilisee dans** :
  - `app/api/trump/route.ts`
- **Couvre** : News US/Canada (Trump tracker)

---

### 10. TradingView Symbol Search
- **URL de base** : `https://symbol-search.tradingview.com/symbol_search/v3/`
- **Type** : REST JSON
- **Utilisee dans** :
  - `app/api/tv-price/route.ts`
- **Couvre** : Recherche de symboles TradingView

---

## Tableau recapitulatif

| API | Type | Cle requise | Variable env | Categorie | Route |
|-----|------|-------------|--------------|-----------|-------|
| FRED | Macro US | Oui | FRED_API_KEY | Macro | app/api/economics, interest-rates |
| Groq | IA LLM | Oui | GROQ_API_KEY | IA | app/api/orvyn, ai-analysis, ... |
| Finnhub | Marches | Oui | FINNHUB_API_KEY | Prix/News | app/api/market-data, news, ... |
| Alpha Vantage | Technique | Oui | ALPHA_VANTAGE_API_KEY | Indicateurs | app/api/technical-indicators, ... |
| NewsAPI | News | Oui | NEWS_API_KEY | News | app/api/news, trump |
| GNews | News | Oui | GNEWS_API_KEY | News | app/api/news |
| Polygon | News | Oui | POLYGON_API_KEY | News | app/api/news |
| MarketAux | News | Oui | MARKETAUX_API_KEY | News | app/api/news |
| NewsData | News | Oui | NEWSDATA_API_KEY | News | app/api/news |
| Supabase | BDD/Auth | Oui | NEXT_PUBLIC_SUPABASE_URL | Base de donnees | lib/supabase/... |
| Upstash Redis | Cache | Oui | KV_REST_API_URL | Rate limit | lib/rate-limit.ts |
| Metals API | Metaux | Oui | METALS_API_KEY | Metaux | app/api/metals |
| GoldAPI | Or | Oui | GOLDAPI_KEY | Or | lib/get-market-data.ts |
| Twelve Data | Marches | Oui | TWELVE_DATA_API_KEY | Prix/Tech | app/api/twelve-data, technical-analysis |
| ExchangeRate | Forex | Oui | EXCHANGE_RATE_API_KEY | Forex | app/api/exchange-rates |
| Yahoo Finance | Marches | Non | - | Prix/OHLC | app/api/candles, ohlc, yahoo-price, ... |
| Stooq | Historique | Non | - | Historique | app/api/stooq |
| Frankfurter | Forex | Non | - | Taux change | app/api/exchange-rates |
| World Bank | Macro Monde | Non | - | Macro | app/api/world-bank |
| CoinGecko | Crypto | Non | - | Crypto | app/api/historical-prices |
| ForexFactory | Calendrier | Non | - | Calendrier | app/api/economic-calendar |
| RSS2JSON | News RSS | Non | - | News | app/api/news |
| Reuters RSS | News | Non | - | Geopolitique | app/api/trump |
| BBC RSS | News | Non | - | Geopolitique | app/api/trump |
| TradingView | Symboles | Non | - | Prix | app/api/tv-price |

---

## Stats

- **Total APIs connectees** : 25
- **Avec cle** : 15
- **Sans cle** : 10
- **Routes API** : 39

### Categories couvertes
- **Macro economique** : FRED, World Bank, ForexFactory
- **Prix marches** : Yahoo Finance, Finnhub, Twelve Data, Stooq, TradingView
- **Indicateurs techniques** : Alpha Vantage, Twelve Data, Finnhub
- **News** : Finnhub, NewsAPI, GNews, Polygon, MarketAux, NewsData, RSS2JSON, Reuters, BBC
- **Forex** : ExchangeRate, Frankfurter, Alpha Vantage, Yahoo Finance
- **Metaux** : Metals API, GoldAPI, Yahoo Finance, Stooq
- **Crypto** : CoinGecko, Yahoo Finance
- **IA / Analyses** : Groq
- **BDD / Auth** : Supabase
- **Cache / Rate limit** : Upstash Redis

---

## Actifs couverts

| Actif | APIs |
|-------|------|
| XAU/USD (Or) | Yahoo Finance, Stooq, Metals API, GoldAPI, Alpha Vantage |
| DXY (Dollar Index) | Yahoo Finance (DX-Y.NYB) |
| VIX | Yahoo Finance (^VIX) |
| US10Y | Yahoo Finance (^TNX), FRED (DGS10) |
| EUR/USD, GBP/USD, etc. | Yahoo Finance, Finnhub, Alpha Vantage, ExchangeRate, Frankfurter |
| S&P 500 | Yahoo Finance, Finnhub, Twelve Data |
| Dow Jones | Stooq (^DJI), Yahoo Finance |
| Actions US (AAPL, MSFT...) | Twelve Data, Yahoo Finance, Finnhub |
| Crypto (BTC, ETH) | CoinGecko, Yahoo Finance |
| Metaux (XAG, XCU, XPT) | Metals API |
| Macro US | FRED (30+ indicateurs) |
| Macro Mondiale | World Bank (190+ pays) |
