'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Source = {
  id: string; name: string; category: string; kind: string; url: string; homepage: string | null; content_type: string | null; lang: string;
  frequency_sec: number; enabled: number; tier: string; owner_group: string | null; official: number; section_hint: string | null;
  reliability_note: string | null; conflicts: string | null; api_limits: string | null; filter_keywords: string | null;
  status: string; last_success: string | null; last_error: string | null; consecutive_failures: number; items_total: number;
};
type Job = { id: string; label: string; every: number; defaultEvery: number; disabled: boolean; last: { started_at: string; ok: number | null; items: number; duration_ms: number | null; error: string | null } | null };
type Provider = { id: string; label: string; env: string; defaultModel: string; docs: string; free: string; configured: boolean };
type AiCfg = { enabled: boolean; chain: { provider: string; model: string; enabled: boolean }[]; monthlyBudgetUsd: number; dailyRequestLimit: number; features: { translate: boolean; analyze: boolean; briefing: boolean; autoAnalyzeTop: number }; prices: Record<string, [number, number]> };

type Props = {
  sources: Source[]; jobs: Job[];
  ai: { config: AiCfg; providers: Provider[]; usage: { monthCost: number; monthRequests: number; monthTokensIn: number; monthTokensOut: number; todayRequests: number; todayErrors: number; avgMs: number }; byProvider: { provider: string; model: string; n: number; cost: number; errors: number }[] };
  keywords: { defaults: Record<string, string>; custom: Record<string, string> };
  blocked: string[];
  errors: { source_id: string; endpoint: string; status: number; error: string; at: string }[];
  jobErrors: { job: string; error: string; started_at: string }[];
  audit: { action: string; detail: string; at: string }[];
  env: { key: string; desc: string; req: string; set: boolean }[];
};

const TABS = ['Fonti', 'Job e frequenze', 'AI', 'Categorie', 'Errori e log', 'Configurazione'] as const;
const CATS = ['news', 'official', 'regulator', 'macro', 'expert', 'community', 'data'];

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}

export default function AdminPanel(p: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Fonti');
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const act = async (fn: () => Promise<unknown>, ok = 'Fatto') => {
    setMsg('…');
    try { const r = await fn(); setMsg(typeof r === 'string' ? r : ok); router.refresh(); } catch (e) { setMsg('Errore: ' + (e as Error).message); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : ''}`}>{t}</button>)}
        <a href="/api/admin/backup" className="btn ml-auto">⤓ Backup database</a>
        <button className="btn" onClick={() => act(() => api('/api/admin/logout', 'POST'), 'Disconnesso')}>Esci</button>
      </div>
      {msg && <div className="rounded border border-line bg-panel2 px-3 py-2 text-xs">{msg} <button className="ml-2 text-mute" onClick={() => setMsg(null)}>×</button></div>}
      {tab === 'Fonti' && <Sources {...p} act={act} />}
      {tab === 'Job e frequenze' && <Jobs jobs={p.jobs} act={act} />}
      {tab === 'AI' && <Ai ai={p.ai} act={act} />}
      {tab === 'Categorie' && <Keywords keywords={p.keywords} blocked={p.blocked} act={act} />}
      {tab === 'Errori e log' && <Logs {...p} />}
      {tab === 'Configurazione' && <Env env={p.env} />}
    </div>
  );
}

type Act = (fn: () => Promise<unknown>, ok?: string) => void;

function Sources({ sources, act }: Props & { act: Act }) {
  const [edit, setEdit] = useState<Partial<Source> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filter, setFilter] = useState('');
  const [test, setTest] = useState<string | null>(null);
  const list = sources.filter((s) => !filter || s.category === filter || s.status === filter);
  const save = () => {
    if (!edit) return;
    const body = {
      id: edit.id, name: edit.name, category: edit.category, kind: edit.kind, url: edit.url, homepage: edit.homepage || null, content_type: edit.content_type || null,
      lang: edit.lang || 'en', frequency_sec: Number(edit.frequency_sec), tier: edit.tier, owner_group: edit.owner_group || null, official: !!edit.official,
      section_hint: edit.section_hint || null, reliability_note: edit.reliability_note || null, conflicts: edit.conflicts || null, api_limits: edit.api_limits || null,
      filter_keywords: edit.filter_keywords || null, enabled: !!edit.enabled,
    };
    act(() => api('/api/admin/sources', isNew ? 'POST' : 'PATCH', body), 'Fonte salvata');
    setEdit(null);
  };
  const testFeed = async () => {
    setTest('Prova in corso…');
    try {
      const r = await api('/api/admin/test-source', 'POST', { url: edit?.url });
      setTest(r.ok ? `OK: ${r.count} elementi. Esempi: ${r.sample.map((s: { title: string }) => s.title).join(' | ')}` : `Errore: ${r.error}`);
    } catch (e) { setTest('Errore: ' + (e as Error).message); }
  };
  const F = (k: keyof Source, label: string, type = 'text') => (
    <label className="text-xs"><span className="text-mute">{label}</span>
      <input type={type} className="input mt-1" value={String(edit?.[k] ?? '')} onChange={(e) => setEdit({ ...edit, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} />
    </label>
  );
  return (
    <div className="card">
      <div className="card-h">
        <span>Fonti ({sources.length})</span>
        <span className="flex gap-2">
          <select className="input h-8 w-auto py-0 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Tutte</option><option value="error">In errore</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          <button className="btn btn-primary" onClick={() => { setIsNew(true); setEdit({ kind: 'rss', category: 'news', tier: 'B', lang: 'en', frequency_sec: 900, enabled: 1 }); }}>+ Nuova fonte</button>
        </span>
      </div>
      {edit && (
        <div className="grid gap-2 border-b border-line bg-panel2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {isNew && F('id', 'Id (minuscole, cifre, trattini)')}
          {F('name', 'Nome')}
          <label className="text-xs"><span className="text-mute">Categoria</span><select className="input mt-1" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs"><span className="text-mute">Tipo</span><select className="input mt-1" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>{['rss', 'bybit', 'okx', 'statuspage', 'data'].map((c) => <option key={c}>{c}</option>)}</select></label>
          <div className="sm:col-span-2">{F('url', 'URL feed / API')}</div>
          {F('homepage', 'Sito')}
          {F('content_type', 'Tipologia contenuti')}
          <label className="text-xs"><span className="text-mute">Livello</span><select className="input mt-1" value={edit.tier} onChange={(e) => setEdit({ ...edit, tier: e.target.value })}>{['A', 'B', 'C', 'D'].map((c) => <option key={c}>{c}</option>)}</select></label>
          {F('frequency_sec', 'Frequenza (secondi)', 'number')}
          {F('lang', 'Lingua (it, en…)')}
          {F('owner_group', 'Gruppo editoriale (indipendenza)')}
          {F('section_hint', 'Sezione predefinita (es. italia, usa, risultati)')}
          {F('filter_keywords', 'Filtro parole (regex, opzionale)')}
          {F('api_limits', 'Limiti API')}
          {F('reliability_note', 'Affidabilità documentata')}
          {F('conflicts', 'Conflitti d\'interesse')}
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!edit.official} onChange={(e) => setEdit({ ...edit, official: e.target.checked ? 1 : 0 })} /> Fonte ufficiale</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked ? 1 : 0 })} /> Attiva</label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button className="btn btn-primary" onClick={save}>Salva</button>
            {edit.kind === 'rss' && <button className="btn" onClick={testFeed}>Prova feed</button>}
            <button className="btn" onClick={() => { setEdit(null); setTest(null); }}>Annulla</button>
            {test && <span className="text-xs text-mute">{test}</span>}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="tbl min-w-[900px]">
          <thead><tr><th>Fonte</th><th>Cat.</th><th>Liv.</th><th>Freq.</th><th>Stato</th><th>Articoli</th><th>Ultimo OK</th><th></th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className={s.enabled ? '' : 'opacity-50'}>
                <td><div className="font-medium">{s.name}</div><div className="max-w-xs truncate text-[10px] text-mute">{s.url}</div></td>
                <td className="text-xs">{s.category}</td>
                <td className="text-xs">{s.tier}{s.official ? ' ✓' : ''}</td>
                <td className="text-xs">{s.frequency_sec}s</td>
                <td className={`text-xs ${s.status === 'ok' ? 'text-up' : s.status === 'error' ? 'text-down' : 'text-mute'}`} title={s.last_error ?? ''}>{s.enabled ? s.status : 'disattiva'}{s.consecutive_failures > 0 ? ` (${s.consecutive_failures}×)` : ''}<div className="max-w-[180px] truncate text-[10px]">{s.last_error}</div></td>
                <td className="text-xs">{s.items_total}</td>
                <td className="text-xs text-mute">{s.last_success ? new Date(s.last_success).toLocaleString('it-IT') : 'mai'}</td>
                <td className="whitespace-nowrap text-right">
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => { setIsNew(false); setEdit(s); setTest(null); }}>Modifica</button>{' '}
                  {s.kind !== 'data' && <button className="btn px-2 py-0.5 text-xs" onClick={() => act(async () => { const r = await api('/api/admin/run', 'POST', { source: s.id }); return r.ok ? `${s.name}: ${r.items} nuovi articoli` : `${s.name}: ${r.error}`; })}>Aggiorna ora</button>}{' '}
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => act(() => api('/api/admin/sources', 'PATCH', { id: s.id, enabled: !s.enabled }))}>{s.enabled ? 'Disattiva' : 'Attiva'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Jobs({ jobs, act }: { jobs: Job[]; act: Act }) {
  const [freq, setFreq] = useState<Record<string, number>>(Object.fromEntries(jobs.map((j) => [j.id, j.every])));
  const [disabled, setDisabled] = useState<string[]>(jobs.filter((j) => j.disabled).map((j) => j.id));
  return (
    <div className="card">
      <div className="card-h">Acquisizione automatica <button className="btn btn-primary" onClick={() => act(async () => { await api('/api/admin/settings', 'POST', { key: 'job_frequencies', value: freq }); await api('/api/admin/settings', 'POST', { key: 'jobs_disabled', value: disabled }); })}>Salva frequenze</button></div>
      <div className="overflow-x-auto">
        <table className="tbl min-w-[800px]">
          <thead><tr><th>Job</th><th>Frequenza (s)</th><th>Attivo</th><th>Ultima esecuzione</th><th>Esito</th><th></th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td><div className="font-medium">{j.label}</div><div className="text-[10px] text-mute">{j.id} · predefinita {j.defaultEvery}s</div></td>
                <td><input type="number" min={30} className="input w-28 py-1" value={freq[j.id]} onChange={(e) => setFreq({ ...freq, [j.id]: Math.max(30, Number(e.target.value)) })} /></td>
                <td><input type="checkbox" checked={!disabled.includes(j.id)} onChange={(e) => setDisabled(e.target.checked ? disabled.filter((x) => x !== j.id) : [...disabled, j.id])} /></td>
                <td className="text-xs text-mute">{j.last ? new Date(j.last.started_at).toLocaleString('it-IT') : 'mai'}</td>
                <td className={`text-xs ${j.last?.ok === 1 ? 'text-up' : j.last?.ok === 0 ? 'text-down' : 'text-mute'}`}>{j.last ? (j.last.ok === 1 ? `ok · ${j.last.items} el. · ${j.last.duration_ms} ms` : j.last.ok === 0 ? (j.last.error ?? 'errore').slice(0, 120) : 'in corso') : '—'}</td>
                <td><button className="btn px-2 py-0.5 text-xs" onClick={() => act(async () => { const r = await api('/api/admin/run', 'POST', { job: j.id }); return r.ok ? `${j.label}: ok (${r.items})` : r.skipped ? 'già in esecuzione' : `${j.label}: ${r.error}`; })}>Esegui ora</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[11px] text-mute">Frequenze minime consigliate per non essere bloccati dalle fonti gratuite: quotazioni Yahoo ≥ 300 s (circa 190 richieste per giro); calendari Nasdaq ≥ 3600 s. Ogni fonte di notizie ha inoltre una propria frequenza (scheda Fonti).</p>
    </div>
  );
}

function Ai({ ai, act }: { ai: Props['ai']; act: Act }) {
  const [cfg, setCfg] = useState<AiCfg>(ai.config);
  const set = (patch: Partial<AiCfg>) => setCfg({ ...cfg, ...patch });
  const move = (i: number, d: number) => {
    const c = [...cfg.chain];
    const [x] = c.splice(i, 1);
    c.splice(Math.max(0, Math.min(c.length, i + d)), 0, x);
    set({ chain: c });
  };
  const configured = new Set(ai.providers.filter((p) => p.configured).map((p) => p.id));
  return (
    <div className="space-y-3">
      <div className="card p-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> AI attiva</label>
          <label className="text-xs"><span className="text-mute">Budget mensile (USD)</span><input type="number" step="0.5" min={0} className="input mt-1" value={cfg.monthlyBudgetUsd} onChange={(e) => set({ monthlyBudgetUsd: Number(e.target.value) })} /></label>
          <label className="text-xs"><span className="text-mute">Limite richieste/giorno</span><input type="number" min={0} className="input mt-1" value={cfg.dailyRequestLimit} onChange={(e) => set({ dailyRequestLimit: Number(e.target.value) })} /></label>
          <label className="text-xs"><span className="text-mute">Analisi automatiche (eventi top, ogni 30 min)</span><input type="number" min={0} max={50} className="input mt-1" value={cfg.features.autoAnalyzeTop} onChange={(e) => set({ features: { ...cfg.features, autoAnalyzeTop: Number(e.target.value) } })} /></label>
          {(['translate', 'analyze', 'briefing'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={cfg.features[k]} onChange={(e) => set({ features: { ...cfg.features, [k]: e.target.checked } })} /> {k === 'translate' ? 'Traduzione AI' : k === 'analyze' ? 'Analisi automatiche' : 'Briefing orario'}</label>
          ))}
        </div>
        <div className="mt-3 text-xs text-mute">Consumi del mese: ${ai.usage.monthCost.toFixed(4)} · {ai.usage.monthRequests} richieste · {ai.usage.monthTokensIn.toLocaleString('it-IT')} token in / {ai.usage.monthTokensOut.toLocaleString('it-IT')} out · oggi {ai.usage.todayRequests} richieste, {ai.usage.todayErrors} errori · tempo medio {ai.usage.avgMs} ms</div>
      </div>
      <div className="card">
        <div className="card-h">Catena dei modelli (ordine = priorità; il successivo viene usato se il precedente fallisce)</div>
        <ul className="divide-y divide-line">
          {cfg.chain.map((s, i) => {
            const prov = ai.providers.find((p) => p.id === s.provider);
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                <span className="w-5 text-mute">{i + 1}</span>
                <input type="checkbox" checked={s.enabled} onChange={(e) => { const c = [...cfg.chain]; c[i] = { ...s, enabled: e.target.checked }; set({ chain: c }); }} />
                <span className="w-36 font-medium">{prov?.label ?? s.provider}</span>
                <input className="input w-56 py-1" value={s.model} onChange={(e) => { const c = [...cfg.chain]; c[i] = { ...s, model: e.target.value.trim() }; set({ chain: c }); }} />
                <span className={`text-xs ${configured.has(s.provider) ? 'text-up' : 'text-mute'}`}>{configured.has(s.provider) ? '● chiave presente' : `○ manca ${prov?.env}`}</span>
                <span className="ml-auto flex gap-1">
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => move(i, -1)}>↑</button>
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => move(i, 1)}>↓</button>
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => set({ chain: [...cfg.chain.slice(0, i + 1), { ...s }, ...cfg.chain.slice(i + 1)] })} title="Duplica per usare un secondo modello dello stesso fornitore">⧉</button>
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => set({ chain: cfg.chain.filter((_, k) => k !== i) })}>×</button>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-2">
          <button className="btn btn-primary" onClick={() => act(() => api('/api/admin/settings', 'POST', { key: 'ai_config', value: cfg }), 'Configurazione AI salvata')}>Salva configurazione AI</button>
          <button className="btn" onClick={() => set({ chain: ai.providers.map((p) => ({ provider: p.id, model: p.defaultModel, enabled: true })) })}>Ripristina catena predefinita</button>
        </div>
      </div>
      <div className="card">
        <div className="card-h">Fornitori disponibili</div>
        <table className="tbl">
          <thead><tr><th>Fornitore</th><th>Variabile</th><th>Stato</th><th>Costi</th><th>Chiave</th></tr></thead>
          <tbody>{ai.providers.map((p) => <tr key={p.id}><td>{p.label}</td><td className="font-mono text-xs">{p.env}</td><td className={p.configured ? 'text-up' : 'text-mute'}>{p.configured ? 'configurato' : 'non configurato'}</td><td className="text-xs text-mute">{p.free}</td><td><a className="text-xs text-accent" href={p.docs} target="_blank" rel="noopener noreferrer">ottieni ↗</a></td></tr>)}</tbody>
        </table>
      </div>
      {ai.byProvider.length > 0 && (
        <div className="card">
          <div className="card-h">Consumi per modello (mese)</div>
          <table className="tbl"><thead><tr><th>Fornitore</th><th>Modello</th><th>Richieste</th><th>Errori</th><th>Costo stimato</th></tr></thead>
            <tbody>{ai.byProvider.map((r) => <tr key={r.provider + r.model}><td>{r.provider}</td><td className="font-mono text-xs">{r.model}</td><td>{r.n}</td><td>{r.errors}</td><td>${(r.cost ?? 0).toFixed(4)}</td></tr>)}</tbody></table>
          <p className="px-4 py-2 text-[11px] text-mute">Costo stimato con i prezzi per milione di token configurati (Anthropic precompilati). Per gli altri fornitori il costo è 0 finché non si inseriscono i prezzi nella configurazione.</p>
        </div>
      )}
    </div>
  );
}

function Keywords({ keywords, blocked, act }: { keywords: Props['keywords']; blocked: string[]; act: Act }) {
  const [kw, setKw] = useState<Record<string, string>>({ ...keywords.defaults, ...keywords.custom });
  const [bl, setBl] = useState(blocked.join('\n'));
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="card-h">Parole chiave per la classificazione nelle sezioni (espressioni regolari)</div>
        <div className="grid gap-2 p-4 md:grid-cols-2">
          {Object.entries(kw).map(([k, v]) => (
            <label key={k} className="text-xs"><span className="font-semibold">{k}</span>
              <textarea className="input mt-1 font-mono text-[11px]" rows={3} value={v} onChange={(e) => setKw({ ...kw, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line px-4 py-2">
          <button className="btn btn-primary" onClick={() => act(() => api('/api/admin/settings', 'POST', { key: 'category_keywords', value: Object.fromEntries(Object.entries(kw).filter(([k, v]) => v !== keywords.defaults[k])) }))}>Salva</button>
          <button className="btn" onClick={() => setKw({ ...keywords.defaults })}>Ripristina predefinite</button>
        </div>
      </div>
      <div className="card">
        <div className="card-h">URL da escludere (uno per riga, corrispondenza parziale)</div>
        <div className="p-4"><textarea className="input font-mono text-xs" rows={5} value={bl} onChange={(e) => setBl(e.target.value)} placeholder="es. /sponsored/" /></div>
        <div className="border-t border-line px-4 py-2"><button className="btn btn-primary" onClick={() => act(() => api('/api/admin/settings', 'POST', { key: 'blocked_url_patterns', value: bl.split('\n').map((x) => x.trim()).filter((x) => x.length >= 3) }))}>Salva</button></div>
      </div>
    </div>
  );
}

function Logs({ errors, jobErrors, audit }: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="card"><div className="card-h">Ultimi errori delle chiamate API</div>
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto text-xs">{errors.map((e, i) => <li key={i} className="px-4 py-1.5"><b>{e.source_id}</b> <span className="text-mute">{e.endpoint}</span> · {e.status || 'rete'} · {e.error}<div className="text-[10px] text-mute">{e.at} UTC</div></li>)}</ul>
      </div>
      <div className="space-y-3">
        <div className="card"><div className="card-h">Job falliti</div>
          <ul className="max-h-[30vh] divide-y divide-line overflow-y-auto text-xs">{jobErrors.map((e, i) => <li key={i} className="px-4 py-1.5"><b>{e.job}</b> · {e.error}<div className="text-[10px] text-mute">{new Date(e.started_at).toLocaleString('it-IT')}</div></li>)}</ul>
        </div>
        <div className="card"><div className="card-h">Registro attività amministrative</div>
          <ul className="max-h-[30vh] divide-y divide-line overflow-y-auto text-xs">{audit.map((a, i) => <li key={i} className="px-4 py-1.5"><b>{a.action}</b> <span className="text-mute">{a.detail}</span><div className="text-[10px] text-mute">{a.at} UTC</div></li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function Env({ env }: { env: Props['env'] }) {
  return (
    <div className="card">
      <div className="card-h">Variabili d&apos;ambiente (lato server — i valori non vengono mai mostrati)</div>
      <table className="tbl"><thead><tr><th>Variabile</th><th>Uso</th><th>Necessità</th><th>Stato</th></tr></thead>
        <tbody>{env.map((e) => <tr key={e.key}><td className="font-mono text-xs">{e.key}</td><td className="text-xs">{e.desc}</td><td className="text-xs text-mute">{e.req}</td><td className={e.set ? 'text-up' : 'text-mute'}>{e.set ? 'impostata' : 'assente'}</td></tr>)}</tbody></table>
      <p className="px-4 py-2 text-[11px] text-mute">Le chiavi si impostano nel file <code>.env</code> sul server (vedi <code>.env.example</code> e README) e richiedono il riavvio dell&apos;app. Per motivi di sicurezza non è possibile inserirle da questa interfaccia.</p>
    </div>
  );
}
