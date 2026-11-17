import { Card, PageHeader, StatusBadge } from '@/components/ui';

export const metadata = { title: 'Metodologia' };

export default function Metodologia() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed">
      <PageHeader title="Metodologia e affidabilità" desc="Come Stock Radar raccoglie, raggruppa, valuta e presenta le informazioni e i dati di mercato" />
      <Card title="1. Raccolta"><div className="space-y-2 p-4 text-ink/85">
        <p>Usiamo esclusivamente feed RSS/Atom pubblici, API ufficiali e dati aperti, rispettando i limiti di utilizzo. Niente scraping non autorizzato. Di ogni articolo conserviamo titolo, estratto fornito dal feed e collegamento all&apos;originale: per il testo completo si rimanda sempre alla fonte.</p>
        <p>Ogni fonte ha un livello: <b>A</b> primaria/ufficiale (autorità di vigilanza, banche centrali, istituti statistici), <b>B</b> testata affermata, <b>C</b> secondaria o di opinione, <b>D</b> community. Per ogni fonte indichiamo il gruppo editoriale e gli eventuali conflitti d&apos;interesse (pagina Fonti).</p>
      </div></Card>
      <Card title="2. Raggruppamento degli eventi"><div className="space-y-2 p-4 text-ink/85">
        <p>Gli articoli che parlano dello stesso fatto vengono raggruppati in un <b>evento</b> (similarità dei titoli, società e indici citati, finestra di 48 ore; per gli eventi urgenti come sospensioni o fallimenti, stessa società coinvolta). Banner e liste mostrano un solo elemento per evento, evitando ripetizioni.</p>
      </div></Card>
      <Card title="3. Stati di verifica"><div className="space-y-3 p-4 text-ink/85">
        <p><StatusBadge status="CONFERMATA" compact /> almeno una fonte primaria o ufficiale riporta l&apos;evento (es. comunicato della SEC o dell&apos;ESMA, decisione di una banca centrale, dato ufficiale di un istituto statistico).</p>
        <p><StatusBadge status="CONFERMATA PARZIALMENTE" compact /> almeno due gruppi editoriali indipendenti e affermati riportano l&apos;evento senza linguaggio da indiscrezione, ma manca una conferma ufficiale.</p>
        <p><StatusBadge status="NON VERIFICATA" compact /> fonte singola, linguaggio da indiscrezione (&quot;secondo fonti&quot;, &quot;reportedly&quot;) o presenza solo su canali community.</p>
        <p><StatusBadge status="SMENTITA" compact /> un articolo del gruppo riporta una smentita esplicita.</p>
        <p><b>Indipendenza:</b> più testate dello stesso gruppo editoriale contano come una sola fonte. Anche testate diverse possono riprendere la stessa fonte originale: per questo, senza una fonte primaria, lo stato massimo è &quot;confermata parzialmente&quot;. Ogni stato è sempre accompagnato dall&apos;elenco dei motivi; le correzioni manuali della redazione sono motivate e registrate nello storico visibile nella scheda della notizia.</p>
      </div></Card>
      <Card title="4. Importanza e breaking news"><div className="space-y-2 p-4 text-ink/85">
        <p>Il punteggio considera: livello della fonte, numero di fonti indipendenti, segnali di urgenza (sospensioni, fallimenti, profit warning, frodi), presenza di indici e grandi società, provenienza istituzionale. Penalizza contenuti sponsorizzati, previsioni di prezzo e raccomandazioni. Una notizia è &quot;breaking&quot; se recente (meno di 3 ore) e urgente o ripresa da almeno 3 fonti indipendenti.</p>
      </div></Card>
      <Card title="5. Dati di mercato"><div className="space-y-2 p-4 text-ink/85">
        <p>Le quotazioni provengono da Yahoo Finance (serie giornaliera dell&apos;ultimo anno e settimanale degli ultimi 5 anni), con Stooq come alternativa automatica per gli indici principali e i titoli USA. Sono <b>ritardate</b> di circa 15–20 minuti e aggiornate periodicamente: non sono adatte per operare. L&apos;orario dell&apos;ultimo prezzo e la fonte sono sempre indicati; se una fonte non risponde viene mostrato l&apos;ultimo dato valido marcato &quot;non aggiornato&quot;, mai valori inventati.</p>
        <p><b>Calcoli</b>: variazione della seduta sulla chiusura precedente; variazioni a 1 settimana, 1 mese, 3 mesi e 1 anno sull&apos;ultima chiusura disponibile alla data; &quot;da inizio anno&quot; sull&apos;ultima chiusura dell&apos;anno precedente; volatilità = deviazione standard dei rendimenti logaritmici giornalieri delle ultime 60 sedute × √252; massimo ribasso = perdita massima da un picco nell&apos;ultimo anno; rendimento da dividendo = dividendi pagati negli ultimi 12 mesi / prezzo; volumi anomali = volume della seduta / media delle 20 sedute precedenti. I settori sono medie semplici (non ponderate) dei titoli monitorati.</p>
        <p><b>Orari delle borse</b>: calcolati sul calendario settimanale di ciascuna piazza; le festività nazionali non sono considerate.</p>
      </div></Card>
      <Card title="6. Intelligenza artificiale"><div className="space-y-2 p-4 text-ink/85">
        <p>Traduzioni, riassunti, analisi e confronti possono essere generati da modelli AI di diversi fornitori, con passaggio automatico a un modello alternativo in caso di errore. I contenuti esterni sono trattati come dati non attendibili: le istruzioni eventualmente contenute negli articoli vengono ignorate e segnalate. Le analisi separano fatti, dichiarazioni, indiscrezioni e interpretazioni, e non costituiscono consulenza finanziaria.</p>
        <p>Senza un modello AI configurato i titoli vengono tradotti con un servizio gratuito a quota limitata; ciò che non è tradotto è indicato con [EN].</p>
      </div></Card>
    </div>
  );
}
