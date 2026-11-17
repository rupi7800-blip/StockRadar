import { z } from 'zod';
import { json, handler, body } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { setSetting, audit } from '@/lib/db';
export const dynamic = 'force-dynamic';
const Provider = z.enum(['anthropic', 'openai', 'gemini', 'groq', 'mistral', 'openrouter', 'ollama']);
const Settings = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('ai_config'),
    value: z.object({
      enabled: z.boolean(),
      chain: z.array(z.object({ provider: Provider, model: z.string().regex(/^[\w.:/-]{1,100}$/), enabled: z.boolean() })).max(14),
      monthlyBudgetUsd: z.number().min(0).max(10000),
      dailyRequestLimit: z.number().int().min(0).max(100000),
      features: z.object({ translate: z.boolean(), analyze: z.boolean(), briefing: z.boolean(), autoAnalyzeTop: z.number().int().min(0).max(50) }),
      prices: z.record(z.tuple([z.number().min(0), z.number().min(0)])).optional(),
    }),
  }),
  z.object({ key: z.literal('job_frequencies'), value: z.record(z.number().int().min(30).max(7 * 86400)) }),
  z.object({ key: z.literal('jobs_disabled'), value: z.array(z.string().max(40)).max(50) }),
  z.object({
    key: z.literal('category_keywords'),
    value: z.record(z.string().max(2000).refine((s) => { try { new RegExp(s, 'i'); return true; } catch { return false; } }, 'regex non valida')),
  }),
  z.object({ key: z.literal('blocked_url_patterns'), value: z.array(z.string().min(3).max(200)).max(200) }),
]);
export const POST = handler(async (req) => {
  await requireAdmin();
  const s = await body(req, Settings);
  setSetting(s.key, s.value);
  audit('settings', { key: s.key });
  return json({ ok: true });
});
