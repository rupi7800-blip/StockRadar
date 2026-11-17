import 'server-only';
import { XMLParser } from 'fast-xml-parser';
import { stripHtml, truncate, safeUrl } from './text';

export type FeedItem = { guid: string; url: string; title: string; excerpt: string; author: string | null; publishedAt: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: false, // decodifica manuale e sicura in stripHtml
  htmlEntities: false,
  trimValues: true,
});

function txt(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return txt(v[0]);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('#text' in o) return txt(o['#text']);
    if ('@_href' in o) return txt(o['@_href']);
    if ('name' in o) return txt(o.name);
  }
  return '';
}
function arr<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}
function date(v: unknown): string {
  const s = txt(v);
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : '';
}

export function parseFeed(xml: string): FeedItem[] {
  if (/<!ENTITY/i.test(xml)) throw new Error('Feed con DTD/ENTITY rifiutato'); // anti XXE / billion laughs
  const doc = parser.parse(xml) as Record<string, any>;
  const out: FeedItem[] = [];
  const now = Date.now();

  const rssItems = doc?.rss?.channel?.item ?? doc?.['rdf:RDF']?.item;
  if (rssItems) {
    for (const it of arr<any>(rssItems)) {
      const link = safeUrl(txt(it.link) || txt(it.guid));
      const title = stripHtml(txt(it.title));
      if (!link || !title) continue;
      const desc = stripHtml(txt(it.description) || txt(it['content:encoded']));
      out.push({
        guid: txt(it.guid) || link,
        url: link,
        title: truncate(title, 300),
        excerpt: truncate(desc, 600),
        author: stripHtml(txt(it['dc:creator']) || txt(it.author)) || null,
        publishedAt: date(it.pubDate) || date(it['dc:date']) || new Date(now).toISOString(),
      });
    }
    return out;
  }
  const entries = doc?.feed?.entry;
  if (entries) {
    for (const e of arr<any>(entries)) {
      const links = arr<any>(e.link);
      const alt = links.find((l) => !l?.['@_rel'] || l['@_rel'] === 'alternate') ?? links[0];
      const link = safeUrl(alt?.['@_href'] ?? txt(alt));
      const title = stripHtml(txt(e.title));
      if (!link || !title) continue;
      out.push({
        guid: txt(e.id) || link,
        url: link,
        title: truncate(title, 300),
        excerpt: truncate(stripHtml(txt(e.summary) || txt(e.content)), 600),
        author: stripHtml(txt(arr<any>(e.author)[0]?.name ?? e.author)) || null,
        publishedAt: date(e.published) || date(e.updated) || new Date(now).toISOString(),
      });
    }
    return out;
  }
  throw new Error('Formato feed non riconosciuto');
}
