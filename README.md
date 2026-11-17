# STOCK RADAR — *Le borse del mondo, sotto controllo*

Piattaforma web installabile (PWA) di informazione e monitoraggio sui mercati azionari mondiali, in italiano, con attenzione particolare a **Piazza Affari**.
Stessa impostazione di Crypto Radar: raccoglie quotazioni e notizie da fonti gratuite e autorizzate, traduce, raggruppa gli articoli sullo stesso evento, ne valuta l'affidabilità in modo trasparente e li presenta per area geografica e per tema.

> Nessun dato viene inventato: se una fonte non risponde, l'interfaccia lo dice e mostra l'ultimo dato valido marcato come **non aggiornato**. Le quotazioni gratuite sono **ritardate di 15–20 minuti**: l'app non è uno strumento per operare.

## Cosa contiene

- **195 strumenti monitorati** (`src/lib/market/catalog.ts`):
  - **25 indici**: FTSE MIB; S&P 500, Nasdaq Composite, Nasdaq 100, Dow Jones, Russell 2000; Euro Stoxx 50, Stoxx 600, DAX, CAC 40, FTSE 100, IBEX 35, AEX, SMI; Nikkei, Hang Seng, Shanghai, Sensex, Nifty 50, Kospi, Taiex, ASX 200; TSX, Bovespa, IPC Messico;
  - **titoli**: 40 italiani (FTSE MIB e principali), 49 USA, 38 europei, 23 asiatici, 4 delle altre Americhe;
  - **indicatori**: VIX, Treasury 10 anni, EUR/USD, Brent, oro; **11 ETF settoriali** SPDR.
- **Per ogni strumento**: prezzo nella valuta di quotazione, variazione della seduta, 1 settimana, 1 mese, 3 mesi, da inizio anno, 1 anno; intervallo a 52 settimane; volatilità annua; massimo ribasso; volumi rispetto alla media; gap di apertura; rendimento da dividendo e ultimo stacco; grafico da 1 mese a 5 anni; notizie collegate; titoli dello stesso settore.
- **Pagine**: Radar (home), Mercati, Italia, Wall Street, Europa, Asia, Settori, Trimestrali e dividendi (calendario USA), IPO e operazioni (calendario IPO USA, OPA, fusioni, buyback, aumenti di capitale), Macro e banche centrali (VIX, tassi BCE, FRED facoltativo), Regole e vigilanza, Esperti, Rischi e tutele (frodi, sospensioni, truffe), Guida alla Borsa (basi, ordini, strumenti, **tasse in Italia**, rischi, glossario), Watchlist, Avvisi, Ricerca, Archivio, Fonti, Metodologia.
- **Orari delle borse** in tempo reale nel browser (aperta/chiusa con ora locale; festività non considerate).
- **Movimenti anomali** con soglie dichiarate: ±5% titoli, ±2,5% indici, gap ≥3%, volumi ≥2,5× media, nuovi massimi/minimi a 52 settimane, VIX ≥30.
- **Avvisi**: prezzo sopra/sotto soglia, variazione della seduta, volumi anomali, massimi/minimi, indici oltre ±%, VIX, trimestrali dei titoli in watchlist, notizie su un titolo, Piazza Affari, OPA/IPO, allarmi confermati, banche centrali, parole chiave.
- **AI** (facoltativa, più fornitori con fallback): traduzioni, analisi degli eventi, briefing giornaliero, confronto tra esperti.

## 1. Due modi di farla funzionare da GitHub

### A) Versione statica su GitHub Pages (gratuita, già configurata)
Il workflow `.github/workflows/pages.yml` ogni 30 minuti raccoglie quotazioni e notizie, le traduce e (se ci sono chiavi AI) le analizza, genera il sito e lo pubblica su `https://<utente>.github.io/StockRadar/`.

**Attivazione (una volta):**
1. Repository → **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
2. (Consigliato) **Settings → Secrets and variables → Actions**: `CONTACT_EMAIL` (richiesto dalla SEC), `MYMEMORY_EMAIL` e almeno una chiave AI (`GEMINI_API_KEY` o `GROQ_API_KEY` hanno piani gratuiti; oppure `ANTHROPIC_API_KEY`). Facoltativa: `FRED_API_KEY`.
3. **Actions → "Pubblica su GitHub Pages" → Run workflow** per la prima pubblicazione (poi parte da sola).

Le quotazioni, i calendari e i tassi BCE **non richiedono chiavi**. Con un repository pubblico Pages e Actions sono gratuiti.

| Funzione | Versione statica |
|---|---|
| Quotazioni, indici, settori, notizie, affidabilità | ✅ aggiornati ogni ~30 min |
| Grafici 1 mese – 5 anni, ricerca, watchlist | ✅ nel browser (watchlist salvata sul dispositivo) |
| Orari delle borse | ✅ calcolati nel browser |
| Avvisi | ✅ controllati nel browser **solo mentre l'app è aperta** |
| Analisi AI | ✅ automatiche sugli eventi principali; ❌ su richiesta |
| Pannello admin | ❌ — fonti in `src/lib/sources/catalog.ts`, titoli in `src/lib/market/catalog.ts` |

Prova in locale: `npm run ingest && NEXT_PUBLIC_BASE_PATH=/StockRadar npm run build:static` → cartella `out/`.

### B) App completa (server Node)
Tutte le funzioni (admin, push in background, AI su richiesta, aggiornamento ogni 10 minuti). Requisiti: **Node.js ≥ 22.13**.

```bash
npm install
cp .env.example .env        # imposta almeno ADMIN_PASSWORD
npm run build && npm start  # http://localhost:3000
```
Oppure Docker (`docker compose up -d --build`) o Render (`render.yaml`, piano Starter con disco).

## 2. Fonti

**Dati di mercato (gratuiti, senza chiave):**
| Fonte | Uso | Note |
|---|---|---|
| Yahoo Finance (endpoint pubblico "chart") | quotazioni, serie 1 anno giornaliera e 5 anni settimanale, dividendi | fonte principale; ritardo 15–20 min; endpoint non documentato ufficialmente |
| Stooq | riserva automatica per indici principali e titoli USA | senza dividendi; limite giornaliero per IP |
| Nasdaq (api.nasdaq.com) | calendario trimestrali e IPO USA | può rifiutare richieste automatiche |
| BCE Data Portal | tassi ufficiali BCE | API ufficiale |
| FRED | Fed Funds, inflazione, disoccupazione USA | chiave gratuita facoltativa |

**Notizie (RSS ufficiali):** CNBC (top, trimestrali, Europa, Asia, economia), MarketWatch, Wall Street Journal Markets, Bloomberg Markets, Financial Times Markets, Yahoo Finance, Seeking Alpha Market Currents, Business Insider Markets, Investing.com, The Guardian, BBC, Deutsche Welle, Nikkei Asia, South China Morning Post, The Economic Times.
**Italia:** Il Sole 24 Ore (Finanza, Economia), ANSA Economia, Corriere Economia, la Repubblica Economia, Wall Street Italia, Money.it, Investing.com Italia, FinanzaOnline.
**Autorità e fonti ufficiali:** SEC (comunicati e azioni legali), ESMA, Federal Reserve, BCE, Bank of England, BLS, BEA.
**Esperti:** Aswath Damodaran, Calculated Risk, Barry Ritholtz, Ben Carlson, Abnormal Returns, Nick Maggiulli, Liberty Street Economics (Fed di New York).
**Community (mai usata come conferma):** Reddit r/stocks, r/investing, r/wallstreetbets, r/ItaliaPersonalFinance.

Per ogni fonte sono indicati livello di affidabilità, gruppo editoriale e conflitti d'interesse (pagina **/fonti**). Testate dello stesso gruppo (es. MarketWatch e WSJ) contano come una sola fonte nella verifica.

### Valutate e non integrate
| Servizio | Motivo |
|---|---|
| Borsa Italiana, Consob | nessun feed RSS o API pubblica documentata: le loro notizie arrivano tramite ANSA e Sole 24 Ore; nelle pagine ci sono i collegamenti diretti |
| Reuters, Associated Press | nessun feed RSS pubblico |
| Quotazioni in tempo reale (borse, Bloomberg, Refinitiv) | a pagamento |
| Alpha Vantage, Finnhub, Twelve Data, Financial Modeling Prep | chiave obbligatoria e limiti gratuiti troppo bassi per ~195 strumenti ogni 30 minuti; integrabili in seguito come riserva |
| Raccomandazioni delle banche d'affari | non pubbliche |
| X/Twitter | API a pagamento |

## 3. Architettura

Uguale a Crypto Radar (Next.js 15 + TypeScript + Tailwind, SQLite integrato, grafici SVG senza librerie). Le parti specifiche dei mercati azionari:
```
src/lib/market/
  catalog.ts     strumenti, borse e orari, settori (condiviso con il browser)
  providers.ts   Yahoo Finance e Stooq, calcolo di variazioni, volatilità, ribasso, dividendi
  ingest.ts      job: quotazioni, storico 5 anni a rotazione, calendari Nasdaq
  derived.ts     anomalie, classifiche, ampiezza di mercato, settori
src/lib/classify.ts   sezioni (Italia, USA, Europa, Asia, trimestrali, operazioni, macro, regole, rischi) e titoli citati
src/lib/ingest/macro.ts  tassi BCE, FRED
```
**Aggiungere un titolo:** una riga in `src/lib/market/catalog.ts` (simbolo Yahoo, nome, borsa, settore, nomi con cui compare nelle notizie).

**Aggiornamenti (app completa, modificabili da Admin → Job):** quotazioni 10 min; storico 5 anni a rotazione (ogni strumento una volta al giorno); calendari e tassi BCE 6 h; notizie ogni minuto secondo la frequenza di ciascuna fonte; traduzioni 2 min; avvisi 1 min.

## 4. Credenziali

Vedi `.env.example`. Obbligatoria solo `ADMIN_PASSWORD` (app completa). Consigliate `CONTACT_EMAIL` e una chiave AI. Facoltative `FRED_API_KEY`, `MYMEMORY_EMAIL`, chiavi VAPID (generate automaticamente).

## 5. Sicurezza

- Chiavi API solo lato server; mai registrate nei log (le query string non vengono salvate).
- Area admin: password con confronto a tempo costante, max 5 tentativi/15 min per IP, sessione firmata HMAC (httpOnly, SameSite=Strict, 12 h), registro attività.
- Tutte le richieste che modificano dati richiedono la stessa origine (CSRF); rate limiting per IP sulle API (più stretto su AI e traduzione).
- Input validati con schemi Zod; query SQL sempre parametrizzate; nessun HTML esterno renderizzato (solo testo) e link limitati a http/https; Content-Security-Policy e header di sicurezza.
- Feed XML con DTD/ENTITY rifiutati; test delle fonti con blocco degli indirizzi interni (SSRF).
- Prompt injection: i contenuti esterni sono racchiusi in delimitatori e dichiarati non attendibili; l'AI non ha strumenti né accesso alla configurazione; l'output è validato contro uno schema e scartato se non conforme.
- Backup giornaliero automatico + download da Admin.

---

## 6. Verifiche eseguite

Il codice compila (app completa e versione statica). Tutte le pagine sono state aperte senza errori anche a larghezza smartphone; calcoli, tabelle e grafici sono stati controllati con quotazioni **simulate solo in locale** (non presenti nel repository). La raccolta reale di notizie è stata provata con SEC e BCE; classificazione per sezione e riconoscimento dei titoli sono stati provati su titoli di esempio in italiano e inglese.

**Non provato dal vivo:** Yahoo Finance, Stooq, Nasdaq, BCE Data Portal e la maggior parte delle testate, perché bloccati dalla rete dell'ambiente di sviluppo. Alla prima esecuzione su GitHub controlla **/fonti** e, in fondo a **/mercati**, l'elenco degli strumenti non aggiornati: simboli o feed errati si correggono in una riga.

---

⚖ *Stock Radar ha scopo informativo. Nessun contenuto costituisce consulenza finanziaria, legale o fiscale né sollecitazione all'investimento. Investire in azioni comporta il rischio di perdere il capitale.*
