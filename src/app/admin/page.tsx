import fs from 'node:fs';
import { isAdmin, adminConfigured } from '@/lib/auth';
import { all, get, dbPath, getSetting } from '@/lib/db';
import { listSources } from '@/lib/sources/registry';
import { JOBS, jobFrequency, jobDisabled, schedulerState } from '@/lib/scheduler';
import { aiConfig, usageSummary } from '@/lib/ai';
import { PROVIDERS, providerConfigured, type ProviderId } from '@/lib/ai/providers';
import { DEFAULT_CATEGORY_KEYWORDS } from '@/lib/classify';
import { newsStats } from '@/lib/news';
import { PageHeader, Card } from '@/components/ui';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminPanel from '@/components/admin/AdminPanel';
import { timeAgo } from '@/lib/text';
import { STATIC } from '@/lib/mode';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Amministrazione', robots: { index: false } };

const ENV_KEYS: [string, string, string][] = [
  ['ADMIN_PASSWORD', 'Password area amministrativa (min 10 caratteri)', 'obbligatoria'],
  ['SESSION_SECRET', 'Segreto firma sessioni (≥ 32 caratteri)', 'consigliata (altrimenti generata e salvata nel DB)'],
  ['CRON_SECRET', 'Protezione endpoint /api/cron per scheduler esterni', 'facoltativa'],
  ['FRED_API_KEY', 'FRED (gratuita): Fed Funds, inflazione e disoccupazione USA', 'facoltativa'],
  ['MYMEMORY_EMAIL', 'Alza la quota di traduzione gratuita a 50.000 caratteri/giorno', 'facoltativa'],
  ['VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY', 'Chiavi notifiche push (generate automaticamente se assenti)', 'facoltativa'],
  ['CONTACT_EMAIL', 'Contatto nello User-Agent (richiesto da SEC per uso intensivo)', 'consigliata'],
];

const since24 = () => new Date(Date.now() - 86400e3).toISOString().replace('T', ' ').slice(0, 19);

export default async function Admin() {
  if (STATIC) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Amministrazione" desc="Versione statica (GitHub Pages)" />
        <Card title="Pannello non disponibile in questa versione">
          <div className="space-y-2 p-4 text-sm text-mute">
            <p>Il sito pubblicato su GitHub Pages è statico: non ha un server con cui gestire impostazioni o accessi. La configurazione si fa direttamente nel repository GitHub:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>Fonti</b>: file <code>src/lib/sources/catalog.ts</code> (aggiungi, modifica o imposta <code>enabled: false</code>).</li>
              <li><b>Chiavi API</b> (AI, FRED…): Settings → Secrets and variables → Actions.</li>
              <li><b>Titoli e indici monitorati</b>: file <code>src/lib/market/catalog.ts</code>.</li>
              <li><b>Frequenza di aggiornamento</b>: file <code>.github/workflows/pages.yml</code> (riga <code>cron</code>).</li>
              <li><b>Stato delle fonti</b>: pagina <a className="text-accent" href="../fonti/">Fonti</a>; log di ogni aggiornamento nella scheda Actions del repository.</li>
            </ul>
            <p>Il pannello completo è disponibile nella versione con server (vedi README → Deploy completo).</p>
          </div>
        </Card>
      </div>
    );
  }
  if (!adminConfigured()) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageHeader title="Amministrazione" desc="Area protetta" />
        <Card title="Area disattivata">
          <p className="p-4 text-sm text-mute">Per attivarla imposta la variabile <code>ADMIN_PASSWORD</code> (almeno 10 caratteri) nel file <code>.env</code> del server e riavvia l&apos;applicazione.</p>
        </Card>
      </div>
    );
  }
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm">
        <PageHeader title="Amministrazione" desc="Accesso riservato" />
        <AdminLogin />
      </div>
    );
  }

  const sources = listSources();
  const st = newsStats();
  const u = usageSummary();
  const last = get<{ at: string }>('SELECT MAX(finished_at) AS at FROM ingest_runs WHERE ok = 1')?.at ?? null;
  const errors24 = get<{ n: number }>('SELECT COUNT(*) n FROM api_log WHERE ok = 0 AND at >= ?', since24())!.n;
  const calls24 = get<{ n: number; avg: number }>('SELECT COUNT(*) n, AVG(duration_ms) avg FROM api_log WHERE at >= ?', since24())!;
  const avgJob = get<{ avg: number }>('SELECT AVG(duration_ms) avg FROM ingest_runs WHERE ok = 1 AND started_at >= ?', new Date(Date.now() - 86400e3).toISOString())!.avg;
  const recentErrors = all<{ source_id: string; endpoint: string; status: number; error: string; at: string }>('SELECT source_id, endpoint, status, error, at FROM api_log WHERE ok = 0 ORDER BY id DESC LIMIT 40');
  const jobErrors = all<{ job: string; error: string; started_at: string }>('SELECT job, error, started_at FROM ingest_runs WHERE ok = 0 ORDER BY id DESC LIMIT 20');
  const jobs = JOBS.map((j) => {
    const r = get<{ started_at: string; ok: number | null; items: number; duration_ms: number | null; error: string | null }>(
      'SELECT started_at, ok, items, duration_ms, error FROM ingest_runs WHERE job = ? ORDER BY id DESC LIMIT 1', j.id,
    );
    return { id: j.id, label: j.label, every: jobFrequency(j), defaultEvery: j.every, disabled: jobDisabled(j), last: r ?? null };
  });
  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath()).size; } catch { dbSize = 0; }
  const integrity = get<{ quick_check: string }>('PRAGMA quick_check')?.quick_check ?? 'n.d.';
  const aiByProvider = all<{ provider: string; model: string; n: number; cost: number; errors: number }>(
    'SELECT provider, model, COUNT(*) n, SUM(cost_usd) cost, SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) errors FROM ai_usage WHERE substr(at,1,7) = ? GROUP BY provider, model',
    new Date().toISOString().slice(0, 7),
  );
  const audit = all<{ action: string; detail: string; at: string }>('SELECT action, detail, at FROM admin_audit ORDER BY id DESC LIMIT 20');
  const providers = (Object.keys(PROVIDERS) as ProviderId[]).map((p) => ({ id: p, ...PROVIDERS[p], configured: providerConfigured(p) }));
  const subs = get<{ n: number }>('SELECT COUNT(*) n FROM push_subs')!.n;
  const devices = get<{ n: number }>('SELECT COUNT(*) n FROM devices')!.n;
  const rules = get<{ n: number }>('SELECT COUNT(*) n FROM alert_rules WHERE enabled = 1')!.n;
  const sched = schedulerState();

  return (
    <div className="space-y-4">
      <PageHeader title="Pannello di amministrazione" desc={`Scheduler ${sched.started ? 'attivo' : 'NON attivo'} · job in esecuzione: ${sched.running.join(', ') || 'nessuno'}`} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <K l="Fonti attive" v={`${sources.filter((s) => s.enabled && s.status === 'ok').length} / ${sources.filter((s) => s.enabled).length}`} />
        <K l="Notizie acquisite" v={st.total.toLocaleString('it-IT')} s={`${st.today} nelle ultime 24h`} />
        <K l="Ultimo aggiornamento" v={timeAgo(last)} />
        <K l="Errori API (24h)" v={String(errors24)} s={`${calls24.n} chiamate · media ${Math.round(calls24.avg ?? 0)} ms`} warn={errors24 > 50} />
        <K l="Database" v={`${(dbSize / 1e6).toFixed(1)} MB`} s={`integrità: ${integrity}`} warn={integrity !== 'ok'} />
        <K l="AI questo mese" v={`$${u.monthCost.toFixed(3)}`} s={`${u.monthRequests} richieste · ${u.todayErrors} errori oggi`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <K l="Tempo medio di elaborazione job (24h)" v={`${Math.round(avgJob ?? 0)} ms`} />
        <K l="Dispositivi / regole alert attive" v={`${devices} / ${rules}`} />
        <K l="Iscrizioni push" v={String(subs)} />
      </div>
      <AdminPanel
        sources={sources}
        jobs={jobs}
        ai={{ config: aiConfig(), providers, usage: u, byProvider: aiByProvider }}
        keywords={{ defaults: DEFAULT_CATEGORY_KEYWORDS, custom: getSetting<Record<string, string>>('category_keywords', {}) }}
        blocked={getSetting<string[]>('blocked_url_patterns', [])}
        errors={recentErrors}
        jobErrors={jobErrors}
        audit={audit}
        env={ENV_KEYS.map(([k, d, r]) => ({ key: k, desc: d, req: r, set: k.split(' / ').every((x) => !!process.env[x]) }))}
      />
    </div>
  );
}

function K({ l, v, s, warn }: { l: string; v: string; s?: string; warn?: boolean }) {
  return (
    <div className={`card px-4 py-3 ${warn ? 'border-warn/50' : ''}`}>
      <div className="text-xs text-mute">{l}</div>
      <div className={`text-lg font-bold ${warn ? 'text-warn' : ''}`}>{v}</div>
      {s && <div className="text-[11px] text-mute">{s}</div>}
    </div>
  );
}
