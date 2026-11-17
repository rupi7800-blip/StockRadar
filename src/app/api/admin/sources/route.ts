import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { run, audit } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSource } from '@/lib/sources/registry';
export const dynamic = 'force-dynamic';
const Base = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(['news', 'official', 'regulator', 'macro', 'expert', 'community', 'data']),
  kind: z.enum(['rss', 'bybit', 'okx', 'statuspage', 'data']),
  url: z.string().url().max(500).refine((u) => /^https?:\/\//.test(u), 'solo http/https'),
  homepage: z.string().url().max(500).optional().nullable(),
  content_type: z.string().max(200).optional().nullable(),
  lang: z.string().max(5).default('en'),
  frequency_sec: z.number().int().min(0).max(7 * 86400),
  tier: z.enum(['A', 'B', 'C', 'D']),
  owner_group: z.string().max(120).optional().nullable(),
  official: z.boolean().default(false),
  section_hint: z.string().max(30).optional().nullable(),
  reliability_note: z.string().max(500).optional().nullable(),
  conflicts: z.string().max(500).optional().nullable(),
  api_limits: z.string().max(300).optional().nullable(),
  filter_keywords: z.string().max(500).optional().nullable().refine((s) => { if (!s) return true; try { new RegExp(s); return true; } catch { return false; } }, 'espressione regolare non valida'),
  enabled: z.boolean().default(true),
});
export const POST = handler(async (req) => {
  await requireAdmin();
  const d = await body(req, Base.extend({ id: z.string().regex(/^[a-z0-9-]{2,60}$/) }));
  if (getSource(d.id)) return bad('Esiste già una fonte con questo id');
  run(`INSERT INTO sources(id,name,category,kind,url,homepage,content_type,lang,frequency_sec,enabled,tier,owner_group,official,section_hint,reliability_note,conflicts,api_limits,filter_keywords)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    d.id, d.name, d.category, d.kind, d.url, d.homepage ?? null, d.content_type ?? null, d.lang, d.frequency_sec, d.enabled ? 1 : 0, d.tier, d.owner_group ?? d.name, d.official ? 1 : 0, d.section_hint ?? null, d.reliability_note ?? null, d.conflicts ?? null, d.api_limits ?? null, d.filter_keywords ?? null);
  audit('source_create', { id: d.id });
  return json({ ok: true });
});
export const PATCH = handler(async (req) => {
  await requireAdmin();
  const d = await body(req, Base.partial().extend({ id: z.string() }));
  if (!getSource(d.id)) return bad('Fonte inesistente', 404);
  const cols = Object.keys(d).filter((k) => k !== 'id');
  for (const k of cols) {
    let v = (d as Record<string, unknown>)[k];
    if (typeof v === 'boolean') v = v ? 1 : 0;
    run(`UPDATE sources SET ${k} = ?, updated_at = datetime('now') WHERE id = ?`, v ?? null, d.id); // k validato dallo schema
  }
  if (d.enabled === true) run("UPDATE sources SET consecutive_failures = 0, status = CASE WHEN status = 'disabled' THEN 'unknown' ELSE status END WHERE id = ?", d.id);
  if (d.enabled === false) run("UPDATE sources SET status = 'disabled' WHERE id = ?", d.id);
  audit('source_update', { id: d.id, cols });
  return json({ ok: true });
});
export const DELETE = handler(async (req) => {
  await requireAdmin();
  const { id } = await body(req, z.object({ id: z.string() }));
  run("UPDATE sources SET enabled = 0, status = 'disabled' WHERE id = ?", id); // disattivazione: lo storico articoli resta consultabile
  audit('source_disable', { id });
  return json({ ok: true });
});
