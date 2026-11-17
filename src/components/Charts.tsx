/** Grafici SVG leggeri (nessuna libreria esterna): rendering lato server, veloci anche su mobile. */
export function Sparkline({ data, width = 100, height = 28, className = '' }: { data: number[] | null | undefined; width?: number; height?: number; className?: string }) {
  if (!data || data.length < 2) return <span className="text-[10px] text-mute">—</span>;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * width).toFixed(1)},${(height - ((v - min) / span) * (height - 2) - 1).toFixed(1)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function BarList({ items, format }: { items: { label: string; value: number; sub?: string; href?: string }[]; format: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2 p-4">
      {items.map((it) => (
        <li key={it.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span className="truncate">{it.href ? <a href={it.href} className="hover:underline">{it.label}</a> : it.label}{it.sub && <span className="ml-1 text-xs text-mute">{it.sub}</span>}</span>
            <span className="shrink-0 tabular-nums text-mute">{format(it.value)}</span>
          </div>
          <div className="h-1.5 rounded bg-panel2"><div className="h-1.5 rounded bg-accent/70" style={{ width: `${(it.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const color = value < 25 ? '#ef4444' : value < 45 ? '#f97316' : value < 55 ? '#eab308' : value < 75 ? '#84cc16' : '#22c55e';
  const a = Math.PI * (1 - value / 100);
  const x = 50 + 38 * Math.cos(a), y = 50 - 38 * Math.sin(a);
  return (
    <svg viewBox="0 0 100 58" className="h-20 w-36" aria-label={`${value} — ${label}`}>
      <path d="M12 50 A38 38 0 0 1 88 50" fill="none" stroke="#262b33" strokeWidth="8" strokeLinecap="round" />
      <path d={`M12 50 A38 38 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <text x="50" y="48" textAnchor="middle" fill="#e7eaee" fontSize="16" fontWeight="700">{value}</text>
    </svg>
  );
}

export function LineChart({ points, height = 220 }: { points: [number, number][]; height?: number }) {
  if (points.length < 2) return <div className="p-6 text-center text-sm text-mute">Dati insufficienti per il grafico.</div>;
  const W = 800, H = height, P = 4;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(' ');
  const up = ys[ys.length - 1] >= ys[0];
  const c = up ? '#22c55e' : '#ef4444';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label="Grafico prezzo">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity="0.25" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${sx(x1)} ${H} L${sx(x0)} ${H} Z`} fill="url(#g)" />
      <path d={d} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
