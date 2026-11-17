import 'server-only';
import { setCache, setCacheError } from '../db';
import { fetchJson } from '../http';
import { markSuccess, markFailure, getSource } from '../sources/registry';

/** Tassi ufficiali BCE dall'API pubblica della Banca centrale europea (nessuna chiave). */
export async function refreshEcbRates() {
  const series: [string, string][] = [
    ['FM/D.U2.EUR.4F.KR.DFR.LEV', 'Tasso sui depositi (DFR)'],
    ['FM/D.U2.EUR.4F.KR.MRR_FR.LEV', 'Tasso sulle operazioni di rifinanziamento principali'],
  ];
  const out: { id: string; label: string; value: number | null; date: string | null }[] = [];
  let err = '';
  for (const [key, label] of series) {
    try {
      const r = await fetchJson<any>(`https://data-api.ecb.europa.eu/service/data/${key}?lastNObservations=1&format=jsondata`, { sourceId: 'ecb-data' });
      const ds = r?.dataSets?.[0]?.series;
      const s0 = ds ? (Object.values(ds)[0] as any) : null;
      const obs = s0?.observations ? (Object.entries(s0.observations) as [string, number[]][]) : [];
      const last = obs[obs.length - 1];
      const dates = r?.structure?.dimensions?.observation?.[0]?.values ?? [];
      out.push({ id: key, label, value: last ? Number(last[1][0]) : null, date: last ? dates[Number(last[0])]?.id ?? null : null });
    } catch (e) {
      err = (e as Error).message;
    }
  }
  if (!out.length) {
    if (getSource('ecb-data')) markFailure('ecb-data', err);
    setCacheError('macro:ecb', err);
    throw new Error('BCE: ' + err);
  }
  if (getSource('ecb-data')) markSuccess('ecb-data', 0);
  setCache('macro:ecb', out, 'BCE Data Portal');
  return out.length;
}

export async function refreshMacro() {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    setCacheError('macro:fred', 'FRED_API_KEY non configurata');
    return 0;
  }
  const series: [string, string, string][] = [
    ['FEDFUNDS', 'Tasso Fed Funds effettivo', '%'],
    ['CPIAUCSL', 'Inflazione USA (CPI, indice)', 'indice'],
    ['DGS10', 'Rendimento Treasury 10 anni', '%'],
    ['UNRATE', 'Disoccupazione USA', '%'],
    ['DTWEXBGS', 'Indice dollaro (broad)', 'indice'],
  ];
  const out = [];
  for (const [id, label, unit] of series) {
    const r = await fetchJson<any>(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=13`,
      { sourceId: 'fred' },
    );
    const obs = (r.observations as { date: string; value: string }[]).filter((o) => o.value !== '.');
    const last = obs[0];
    let yoy: number | null = null;
    if (id === 'CPIAUCSL' && obs[12]) yoy = (Number(obs[0].value) / Number(obs[12].value) - 1) * 100;
    out.push({ id, label, unit, value: last ? Number(last.value) : null, date: last?.date ?? null, yoy });
  }
  setCache('macro:fred', out, 'FRED');
  return out.length;
}
