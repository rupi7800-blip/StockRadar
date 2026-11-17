'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { STATIC } from '@/lib/mode';
import { lsGet, lsSet } from '@/lib/local';

/** Versione statica: traduzione diretta dal browser con MyMemory (gratuito, quota per utente), con cache locale. */
async function translateDirect(texts: string[], target: string, from: string): Promise<(string | null)[]> {
  const key = `cr_tr_${from}_${target}`;
  const cache = lsGet<Record<string, string>>(key, {});
  const out: (string | null)[] = texts.map((t) => cache[t] ?? null);
  const todo = texts.map((t, i) => [t, i] as const).filter(([, i]) => out[i] == null);
  let stop = false;
  const worker = async () => {
    while (todo.length && !stop) {
      const [t, i] = todo.shift()!;
      try {
        const r = await fetch(`https://api.mymemory.translated.net/get?${new URLSearchParams({ q: t.slice(0, 480), langpair: `${from}|${target}` })}`);
        const j = await r.json();
        const tr = String(j?.responseData?.translatedText ?? '');
        if (j.responseStatus !== 200 || !tr || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(tr)) { stop = /WARNING/i.test(tr); continue; }
        out[i] = tr;
        cache[t] = tr;
      } catch { stop = true; }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  lsSet(key, cache);
  return out;
}

/**
 * Tasto di traduzione diretto, disponibile su tutte le pagine.
 *  - "Italiano": notizie tradotte in italiano (predefinito)
 *  - "Originale": titoli ed estratti nella lingua della fonte
 *  - EN/ES/FR/DE/PT: traduce l'intera pagina (interfaccia + contenuti) tramite /api/translate, con cache lato server.
 */
const OPTIONS: [string, string][] = [['it', 'Italiano'], ['orig', 'Lingua originale'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português']];

export default function LangSwitch() {
  const [mode, setMode] = useState('it');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const originals = useRef(new Map<Text, string>());
  const pathname = usePathname();

  const restore = useCallback(() => {
    for (const [node, txt] of originals.current) if (node.isConnected) node.nodeValue = txt;
    originals.current.clear();
  }, []);

  const translatePage = useCallback(async (target: string) => {
    restore();
    const root = document.getElementById('app-root');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || !n.nodeValue || n.nodeValue.trim().length < 2 || !/[A-Za-zÀ-ÿ]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,code,pre,[data-notranslate],input,textarea,.t-orig')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Text[] = [];
    while (walker.nextNode() && nodes.length < 1200) nodes.push(walker.currentNode as Text);
    const unique = [...new Set(nodes.map((n) => n.nodeValue!.trim()))].filter((t) => t.length <= 1200);
    setBusy(true);
    let missing = 0;
    try {
      const map = new Map<string, string>();
      if (STATIC) {
        const tr = await translateDirect(unique.slice(0, 400), target, 'it');
        unique.slice(0, 400).forEach((t, k) => { if (tr[k]) map.set(t, tr[k]!); else missing++; });
      }
      for (let i = 0; !STATIC && i < unique.length; i += 60) {
        const batch = unique.slice(i, i + 60);
        const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: batch, target, from: 'it' }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'errore');
        const j = await r.json();
        batch.forEach((t, k) => { if (j.out[k]) map.set(t, j.out[k]); else missing++; });
      }
      for (const n of nodes) {
        const t = n.nodeValue!.trim();
        const tr = map.get(t);
        if (tr && n.isConnected) {
          originals.current.set(n, n.nodeValue!);
          n.nodeValue = n.nodeValue!.replace(t, tr);
        }
      }
      setNote(missing ? `${missing} testi non tradotti (limite del servizio di traduzione gratuito o AI non configurata).` : null);
    } catch (e) {
      setNote('Traduzione non disponibile: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [restore]);

  const apply = useCallback((m: string) => {
    document.documentElement.dataset.mode = m === 'orig' ? 'orig' : 'it';
    document.documentElement.lang = m === 'orig' || m === 'it' ? 'it' : m;
    if (m === 'it' || m === 'orig') { restore(); setNote(null); }
    else translatePage(m);
  }, [restore, translatePage]);

  useEffect(() => {
    let m = 'it';
    try { m = localStorage.getItem('sr_lang') || 'it'; } catch { /* */ }
    setMode(m);
  }, []);
  // riapplica a ogni cambio pagina
  useEffect(() => {
    const t = setTimeout(() => apply(mode), 300);
    return () => clearTimeout(t);
  }, [mode, pathname, apply]);

  const choose = (m: string) => {
    setOpen(false);
    setMode(m);
    try { localStorage.setItem('sr_lang', m); } catch { /* */ }
  };
  const short = mode === 'orig' ? 'ORIG' : mode.toUpperCase();
  return (
    <div className="relative" data-notranslate>
      <button className="btn h-9 px-2.5 text-xs" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title="Traduci la pagina">
        <span aria-hidden>文A</span> {busy ? '…' : short}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-line bg-panel p-1 shadow-xl">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-mute">Traduci pagina</div>
          {OPTIONS.map(([k, l]) => (
            <button key={k} role="menuitem" onClick={() => choose(k)} className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-panel2 ${mode === k ? 'text-accent' : ''}`}>
              {mode === k ? '✓ ' : ''}{l}
            </button>
          ))}
        </div>
      )}
      {note && <div className="absolute right-0 z-40 mt-1 w-64 rounded border border-warn/40 bg-panel p-2 text-[11px] text-warn">{note}<button className="ml-2 underline" onClick={() => setNote(null)}>ok</button></div>}
    </div>
  );
}
