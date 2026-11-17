import Link from 'next/link';
import { Card, PageHeader, Disclaimer } from '@/components/ui';

export const metadata = { title: 'Guida alla Borsa' };

type Sec = { id: string; title: string; items: [string, string][] };

const SECTIONS: Sec[] = [
  {
    id: 'basi', title: 'Come funziona la Borsa',
    items: [
      ['Azione', 'Una quota di proprietà di una società. Dà diritto a una parte degli utili (dividendi, se distribuiti) e, per le azioni ordinarie, al voto in assemblea. Il valore dipende da quanto gli investitori sono disposti a pagare: può salire o scendere anche molto.'],
      ['Borsa e negoziazione continua', 'Le borse incrociano ordini di acquisto e di vendita. A Milano la negoziazione continua va dalle 9:00 alle 17:30, preceduta da un\'asta di apertura e chiusa da un\'asta di chiusura che determina il prezzo ufficiale di riferimento. A Wall Street le contrattazioni regolari vanno dalle 15:30 alle 22:00 ora italiana (con differenze di un\'ora nelle settimane in cui l\'ora legale non coincide).'],
      ['Indice di borsa', 'Un paniere di titoli che misura l\'andamento di un mercato. La maggior parte (S&P 500, FTSE MIB, DAX) è ponderata per capitalizzazione: le società più grandi pesano di più. Il Dow Jones è invece ponderato per prezzo, quindi conta di più chi ha il prezzo per azione più alto. Il DAX è un indice "total return" (include i dividendi reinvestiti), quasi tutti gli altri no.'],
      ['Prezzi ritardati', 'I dati gratuiti (come quelli di questa app) arrivano con 15–20 minuti di ritardo. Per operare servono le quotazioni in tempo reale del proprio intermediario.'],
      ['Sospensioni', 'Se un titolo si muove troppo in poco tempo, la borsa lo sospende per qualche minuto (a Milano "sospensione per eccesso di rialzo/ribasso"). Negli USA esistono anche i "circuit breaker" che fermano l\'intero mercato in caso di crollo dell\'S&P 500.'],
    ],
  },
  {
    id: 'leggere', title: 'Leggere una quotazione',
    items: [
      ['Variazione della seduta', 'Differenza percentuale tra l\'ultimo prezzo e la chiusura del giorno di borsa precedente.'],
      ['Da inizio anno (YTD)', 'Variazione rispetto all\'ultima chiusura dell\'anno precedente.'],
      ['Intervallo a 52 settimane', 'Prezzo minimo e massimo dell\'ultimo anno. Un titolo vicino al massimo è in tendenza positiva, ma non significa che continuerà a salire (né che un titolo sui minimi sia "a sconto").'],
      ['Capitalizzazione', 'Prezzo per numero di azioni: il valore di borsa dell\'intera società.'],
      ['Volumi', 'Numero di azioni scambiate. Volumi molto superiori alla media (qui: oltre 2,5 volte la media di 20 sedute) indicano che sta succedendo qualcosa: notizie, risultati, operazioni.'],
      ['Gap', 'Differenza tra il prezzo di apertura e la chiusura precedente: spesso segue notizie uscite a mercato chiuso, come le trimestrali.'],
      ['Rendimento da dividendo', 'Dividendi pagati negli ultimi 12 mesi divisi per il prezzo attuale. Non è garantito: la società può ridurre o sospendere la cedola.'],
      ['Volatilità', 'Quanto oscilla il prezzo. Qui è calcolata sui rendimenti giornalieri delle ultime 60 sedute e riportata su base annua. Un titolo con volatilità del 40% oscilla molto più di uno al 15%.'],
      ['Massimo ribasso', 'La perdita più ampia dell\'ultimo anno, da un picco al minimo successivo. Dà un\'idea concreta di quanto si poteva perdere comprando nel momento peggiore.'],
      ['P/E (prezzo/utili)', 'Prezzo dell\'azione diviso l\'utile per azione (EPS). Indica quanti anni di utili attuali il mercato "paga". Va confrontato con società simili e con la crescita attesa: un P/E basso può segnalare problemi, uno alto aspettative elevate.'],
    ],
  },
  {
    id: 'ordini', title: 'Comprare e vendere',
    items: [
      ['Ordine al meglio (a mercato)', 'Viene eseguito subito al miglior prezzo disponibile. Rischioso sui titoli poco scambiati o all\'apertura, quando il prezzo può essere lontano da quello atteso.'],
      ['Ordine con limite di prezzo', 'Si indica il prezzo massimo per comprare (o minimo per vendere). Protegge dal prezzo, ma può non essere eseguito.'],
      ['Stop loss', 'Ordine di vendita che scatta quando il prezzo scende sotto una soglia. Limita le perdite, ma in caso di forte ribasso o apertura in gap può essere eseguito a un prezzo peggiore della soglia.'],
      ['Spread denaro-lettera', 'Differenza tra il miglior prezzo in acquisto e in vendita: è un costo implicito, più alto sui titoli poco liquidi.'],
      ['Costi', 'Commissioni dell\'intermediario, eventuali costi di cambio valuta per i titoli esteri, imposte. Sui piccoli importi incidono molto: confrontali prima di scegliere un intermediario.'],
    ],
  },
  {
    id: 'strumenti', title: 'Strumenti per investire in azioni',
    items: [
      ['Azioni singole', 'Massimo controllo, ma il rischio è concentrato: una sola società può perdere gran parte del valore o fallire.'],
      ['ETF azionari', 'Fondi quotati che replicano un indice (es. tutto il mercato mondiale o l\'S&P 500) con costi annui spesso bassi. In Italia si acquistano gli ETF di diritto europeo (UCITS) dotati di documento KID. Diversificano, ma seguono il mercato anche nei ribassi.'],
      ['Fondi comuni', 'Gestiti attivamente da professionisti; costi generalmente più alti degli ETF. Molti fondi attivi nel lungo periodo fanno peggio del loro indice di riferimento al netto dei costi.'],
      ['Certificati', 'Prodotti strutturati emessi da banche, legati all\'andamento di azioni o indici. Possono avere protezioni condizionate, cedole e scadenze: sono complessi e hanno anche il rischio di insolvenza dell\'emittente.'],
      ['CFD, opzioni e prodotti a leva', 'Amplificano guadagni e perdite. Le autorità europee obbligano i broker a pubblicare la percentuale di clienti al dettaglio che perde denaro con i CFD: di solito è la maggioranza.'],
    ],
  },
  {
    id: 'fisco', title: 'Tasse in Italia (persone fisiche)',
    items: [
      ['Plusvalenze', 'I guadagni dalla vendita di azioni sono tassati al 26%. Con il regime amministrato (il più comune) ci pensa l\'intermediario come sostituto d\'imposta; con il regime dichiarativo vanno indicati nella dichiarazione dei redditi.'],
      ['Minusvalenze', 'Le perdite su azioni sono "redditi diversi" e si possono compensare con plusvalenze future entro il quarto anno successivo. Attenzione: i guadagni sugli ETF e sui fondi sono invece "redditi di capitale" e non possono assorbire le minusvalenze.'],
      ['Dividendi', 'Ritenuta del 26%. Sui dividendi esteri si applica anche la ritenuta del Paese della società (per esempio negli USA, ridotta con il modulo W-8BEN): una parte dell\'imposta estera può essere recuperata, ma con procedure spesso lunghe.'],
      ['Tobin tax', 'Imposta sulle transazioni finanziarie sugli acquisti di azioni di società con sede in Italia e capitalizzazione media di almeno 500 milioni di euro: 0,1% se l\'acquisto avviene su un mercato regolamentato, 0,2% altrimenti. Imposte simili esistono in Francia e Spagna.'],
      ['Imposta di bollo', 'Ogni anno lo 0,2% del valore del deposito titoli presso intermediari italiani. Per i titoli detenuti all\'estero si paga l\'IVAFE, con la stessa aliquota, in dichiarazione dei redditi.'],
      ['Verifica sempre', 'Aliquote e regole possono cambiare con le leggi di bilancio. Per casi particolari rivolgiti a un commercialista o al CAF.'],
    ],
  },
  {
    id: 'rischi', title: 'I rischi da conoscere',
    items: [
      ['Rischio specifico', 'Legato alla singola società (conti deludenti, scandali, concorrenza). Si riduce diversificando su molti titoli, settori e Paesi.'],
      ['Rischio di mercato', 'Le crisi colpiscono quasi tutte le azioni insieme: nel 2008 e nel 2020 le borse mondiali hanno perso oltre il 30% in pochi mesi. La diversificazione non lo elimina; serve un orizzonte lungo e denaro che non servirà a breve.'],
      ['Rischio di cambio', 'Un titolo americano comprato in euro guadagna o perde anche per il cambio euro/dollaro.'],
      ['Rischio di liquidità', 'I titoli poco scambiati possono essere difficili da vendere al prezzo desiderato.'],
      ['Errori comportamentali', 'Comprare dopo forti rialzi per paura di restare fuori, vendere nel panico durante i ribassi, concentrare tutto su pochi titoli "di moda": sono le cause più frequenti di perdite tra i piccoli risparmiatori.'],
      ['Tutela del deposito', 'I titoli depositati presso una banca o una SIM restano di proprietà del cliente e sono separati dal patrimonio dell\'intermediario. In caso di insolvenza dell\'intermediario interviene anche il Fondo Nazionale di Garanzia (fino a 20.000 € per investitore). Nessuna tutela copre le perdite dovute all\'andamento del mercato.'],
    ],
  },
  {
    id: 'glossario', title: 'Glossario rapido',
    items: [
      ['Ticker', 'Sigla che identifica un titolo (es. AAPL per Apple, ENI per Eni). Su Yahoo Finance le borse estere hanno un suffisso: .MI Milano, .DE Xetra, .PA Parigi, .L Londra, .T Tokyo, .HK Hong Kong.'],
      ['EPS e guidance', 'EPS è l\'utile per azione. La guidance sono le previsioni che la società stessa comunica sui conti futuri: spesso muove il titolo più dei risultati appena pubblicati.'],
      ['Buyback', 'La società ricompra le proprie azioni: riduce il numero di azioni in circolazione e restituisce liquidità ai soci.'],
      ['OPA / OPS', 'Offerta pubblica di acquisto (in contanti) o di scambio (in azioni) rivolta a tutti gli azionisti di una società quotata.'],
      ['IPO', 'Prima quotazione in borsa di una società (in Italia "matricola").'],
      ['Frazionamento (split)', 'Divisione di ogni azione in più azioni di valore proporzionalmente minore: non cambia il valore dell\'investimento.'],
      ['Correzione e mercato orso', 'Si parla di correzione con un calo di almeno il 10% dai massimi e di "bear market" (mercato orso) oltre il 20%. "Bull market" (toro) è una fase di rialzo prolungata.'],
      ['Vendita allo scoperto', 'Vendere azioni prese in prestito per ricomprarle dopo a prezzo più basso. Gli "short seller" che pubblicano rapporti critici su una società hanno un interesse economico nel ribasso.'],
      ['Profit warning', 'Annuncio con cui una società avverte che i risultati saranno peggiori del previsto.'],
      ['Pre-market e after-hours', 'Negoziazione fuori dall\'orario principale (soprattutto negli USA), con pochi scambi e prezzi più volatili.'],
    ],
  },
];

export default function Guida() {
  return (
    <div className="space-y-4">
      <PageHeader title="Guida alla Borsa" desc="Le basi per leggere i mercati, capire costi, tasse e rischi, riconoscere le truffe" color="#14b8a6" />
      <nav className="flex flex-wrap gap-1.5" aria-label="Indice della guida">
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="chip border-line text-mute hover:text-ink">{s.title}</a>)}
      </nav>
      {SECTIONS.map((s) => (
        <Card key={s.id} id={s.id} title={s.title}>
          <dl className="divide-y divide-line">
            {s.items.map(([t, d]) => <div key={t} className="px-4 py-2.5"><dt className="text-sm font-semibold">{t}</dt><dd className="mt-0.5 text-sm text-mute">{d}</dd></div>)}
          </dl>
        </Card>
      ))}
      <p className="text-xs text-mute">Vedi anche: <Link href="/rischi" className="text-accent">Rischi e tutele</Link> · <Link href="/metodologia" className="text-accent">Come sono calcolati i dati di Stock Radar</Link>. Per approfondire: le pagine di educazione finanziaria di Consob, Banca d&apos;Italia e del Comitato per l&apos;educazione finanziaria (quellocheconta.gov.it).</p>
      <Disclaimer text="Questa guida ha scopo divulgativo e non costituisce consulenza finanziaria o fiscale. Le norme fiscali sono riassunte in forma semplificata e possono cambiare." />
    </div>
  );
}
