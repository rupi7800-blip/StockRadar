import { Card, PageHeader, TierChip } from '@/components/ui';
import Ago from '@/components/Ago';
import { listSources, CATEGORY_LABEL, TIER_LABEL } from '@/lib/sources/registry';
import { timeAgo, fmtDateTime } from '@/lib/text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fonti e stato dei servizi' };

const ST: Record<string, string> = { ok: 'text-up', error: 'text-down', unknown: 'text-mute', disabled: 'text-mute' };
const STL: Record<string, string> = { ok: '● attiva', error: '● in errore', unknown: '○ in attesa', disabled: '○ disattivata' };

export default function Fonti() {
  const s = listSources();
  const cats = [...new Set(s.map((x) => x.category))];
  const ok = s.filter((x) => x.status === 'ok').length;
  return (
    <div className="space-y-4">
      <PageHeader title="Fonti e stato dei servizi" desc={`${s.length} fonti registrate · ${ok} funzionanti ora · se una fonte smette di funzionare il sistema la segnala e continua con le altre`} />
      <Card title="Legenda livelli di fonte"><ul className="grid gap-2 p-4 text-sm sm:grid-cols-4">{Object.entries(TIER_LABEL).map(([k, v]) => <li key={k} className="flex items-center gap-2"><TierChip tier={k} /> {v}</li>)}</ul></Card>
      {cats.map((c) => (
        <Card key={c} title={CATEGORY_LABEL[c] ?? c}>
          <div className="overflow-x-auto"><table className="tbl min-w-[900px]">
            <thead><tr><th>Fonte</th><th>Contenuti</th><th>Livello</th><th>Frequenza</th><th>Stato</th><th>Ultimo aggiornamento riuscito</th><th>Limiti API</th><th>Affidabilità documentata</th></tr></thead>
            <tbody>{s.filter((x) => x.category === c).map((x) => (
              <tr key={x.id}>
                <td><a href={x.homepage ?? x.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{x.name}</a><div className="max-w-[220px] truncate text-[10px] text-mute" data-notranslate>{x.url}</div></td>
                <td className="text-xs text-mute">{x.content_type}</td>
                <td><TierChip tier={x.tier} official={!!x.official} /></td>
                <td className="text-xs text-mute">{x.frequency_sec ? (x.frequency_sec >= 3600 ? `${Math.round(x.frequency_sec / 3600)} h` : `${Math.round(x.frequency_sec / 60)} min`) : 'su richiesta'}</td>
                <td className={`text-xs ${ST[x.enabled ? x.status : 'disabled']}`} title={x.last_error ?? ''}>{STL[x.enabled ? x.status : 'disabled']}{x.status === 'error' && x.enabled ? <div className="max-w-[200px] truncate text-[10px]">{x.last_error}</div> : null}</td>
                <td className="text-xs text-mute" title={fmtDateTime(x.last_success)}>{x.last_success ? <Ago iso={x.last_success} /> : 'mai'}</td>
                <td className="max-w-[200px] text-[11px] text-mute">{x.api_limits ?? '—'}</td>
                <td className="max-w-[260px] text-[11px] text-mute">{x.reliability_note}{x.conflicts && <div className="text-warn">Conflitti: {x.conflicts}</div>}</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
      ))}
    </div>
  );
}
