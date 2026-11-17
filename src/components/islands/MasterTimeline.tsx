/**
 * Master timeline (spec §8): one rail per domain, zoomable from decades to days, with the
 * correlation rail visually separated below the fact rails — the seam between Layer A and
 * Layer B made literal. Server-rendered at full range; the client adds zoom, pan and tooltips.
 */
import { scaleUtc } from 'd3-scale';
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';

export interface TimelineEvent { id: string; domain: string; date: string; title: string }
export interface TimelineMarker { id: string; date: string; title: string; strength: string }

interface Props {
  events: TimelineEvent[];
  markers: TimelineMarker[];
  domains: { id: string; label: string }[];
  /** Domain id → CSS colour expression. */
  colors: Record<string, string>;
}

const W = 960, PAD_L = 116, PAD_R = 12, RAIL = 30, GAP = 22, AXIS = 24;
const DAY = 86_400_000;
const MIN_SPAN = 7 * DAY, MAX_SPAN = 40 * 365 * DAY;

const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export default function MasterTimeline({ events, markers, domains, colors }: Props) {
  const full = useMemo<[number, number]>(() => {
    const ts = [...events.map((e) => t(e.date)), ...markers.map((m) => t(m.date))];
    if (ts.length === 0) { const now = Date.now(); return [now - 365 * DAY, now]; }
    const lo = Math.min(...ts), hi = Math.max(...ts);
    const pad = Math.max(DAY * 3, (hi - lo) * 0.02);
    return [lo - pad, hi + pad];
  }, [events, markers]);
  const [view, setView] = useState<[number, number]>(full);
  const [tip, setTip] = useState<{ x: number; y: number; value: string; label: string } | null>(null);
  const drag = useRef<{ x: number; view: [number, number] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const factH = domains.length * RAIL;
  const H = factH + GAP + RAIL + AXIS;
  const x = scaleUtc().domain(view).range([PAD_L, W - PAD_R]);
  const ticks = x.ticks(8);
  const fmt = x.tickFormat(8);

  const clamp = ([a, b]: [number, number]): [number, number] => {
    let span = Math.min(MAX_SPAN, Math.max(MIN_SPAN, b - a));
    const mid = (a + b) / 2;
    return [mid - span / 2, mid + span / 2];
  };
  const zoom = (factor: number, at = 0.5) => setView(([a, b]) => {
    const span = b - a, pivot = a + span * at;
    return clamp([pivot - (pivot - a) * factor, pivot + (b - pivot) * factor]);
  });
  const pan = (frac: number) => setView(([a, b]) => [a + (b - a) * frac, b + (b - a) * frac]);
  const preset = (days: number | 'all') => {
    if (days === 'all') return setView(full);
    const end = full[1];
    setView([end - days * DAY, end]);
  };

  const toSvgX = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? ((clientX - r.left) / r.width) * W : 0;
  };
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.shiftKey) return; // leave page scroll alone
    e.preventDefault();
    if (e.ctrlKey) zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, (toSvgX(e.clientX) - PAD_L) / (W - PAD_L - PAD_R));
    else pan((e.deltaX || e.deltaY) / 800);
  };
  const onDown = (e: PointerEvent) => { drag.current = { x: e.clientX, view }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: PointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const [a, b] = drag.current.view;
    const dt = ((e.clientX - drag.current.x) / r.width) * W / (W - PAD_L - PAD_R) * (b - a);
    setView([a - dt, b - dt]);
  };
  const onUp = () => { drag.current = null; };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') zoom(0.7);
    else if (e.key === '-') zoom(1 / 0.7);
    else if (e.key === 'ArrowLeft') pan(-0.2);
    else if (e.key === 'ArrowRight') pan(0.2);
    else return;
    e.preventDefault();
  };
  const showTip = (e: { clientX: number; clientY: number }, value: string, label: string) => setTip({ x: e.clientX, y: e.clientY, value, label });

  const inView = (ms: number) => ms >= view[0] && ms <= view[1];
  const spanDays = Math.round((view[1] - view[0]) / DAY);

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm" role="toolbar" aria-label="Timeline range">
        {([['All', 'all'], ['1 year', 365], ['3 months', 91], ['1 month', 31]] as const).map(([label, d]) => (
          <button key={label} type="button" className="rounded border border-rule px-2 py-0.5 hover:border-accent" onClick={() => preset(d)}>{label}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-rule" aria-hidden="true" />
        <button type="button" className="rounded border border-rule px-2 py-0.5 hover:border-accent" onClick={() => zoom(0.7)} aria-label="Zoom in">+</button>
        <button type="button" className="rounded border border-rule px-2 py-0.5 hover:border-accent" onClick={() => zoom(1 / 0.7)} aria-label="Zoom out">−</button>
        <button type="button" className="rounded border border-rule px-2 py-0.5 hover:border-accent" onClick={() => pan(-0.3)} aria-label="Earlier">←</button>
        <button type="button" className="rounded border border-rule px-2 py-0.5 hover:border-accent" onClick={() => pan(0.3)} aria-label="Later">→</button>
        <span className="num text-xs text-ink-muted" aria-live="polite">Showing {new Date(view[0]).toISOString().slice(0, 10)} to {new Date(view[1]).toISOString().slice(0, 10)} ({spanDays} days)</span>
      </div>
      <svg ref={svgRef} className="h22-chart w-full touch-pan-y select-none" viewBox={`0 0 ${W} ${H}`} role="group" tabIndex={0}
        aria-label={`Timeline of ${events.length} events by domain. Use plus and minus to zoom, arrow keys to move.`}
        onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setTip(null); }} onKeyDown={onKey}>
        <defs><clipPath id="tl-plot"><rect x={PAD_L} y={0} width={W - PAD_L - PAD_R} height={H} /></clipPath></defs>
        {ticks.map((d) => (
          <g key={d.getTime()}>
            <line className="grid" x1={x(d)} x2={x(d)} y1={0} y2={H - AXIS} />
            <text x={x(d)} y={H - 8} textAnchor="middle">{fmt(d)}</text>
          </g>
        ))}
        {domains.map((d, i) => {
          const cy = i * RAIL + RAIL / 2;
          return (
            <g key={d.id}>
              <text x={PAD_L - 8} y={cy + 4} textAnchor="end" style={{ fill: 'var(--h22-ink-secondary)', fontSize: 12 }}>{d.label}</text>
              <line className="grid" x1={PAD_L} x2={W - PAD_R} y1={cy} y2={cy} />
              <g clipPath="url(#tl-plot)">
                {events.filter((e) => e.domain === d.id && inView(t(e.date))).map((e) => (
                  <a key={e.id} href={`/events/${e.id}/`} aria-label={`${e.date}: ${e.title}`}
                    onPointerEnter={(ev) => showTip(ev, e.date, e.title)} onFocus={(ev) => { const r = (ev.target as Element).getBoundingClientRect(); showTip({ clientX: r.left, clientY: r.top }, e.date, e.title); }} onBlur={() => setTip(null)}>
                    <circle cx={x(t(e.date))} cy={cy} r={12} className="h22-hit" />
                    <circle cx={x(t(e.date))} cy={cy} r={4.5} fill={colors[d.id]} stroke="var(--h22-page)" strokeWidth={2} />
                  </a>
                ))}
              </g>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={factH + GAP / 2} y2={factH + GAP / 2} stroke="var(--h22-interp-rule)" strokeWidth={1} strokeDasharray="4 3" />
        <g>
          <rect x={PAD_L} y={factH + GAP} width={W - PAD_L - PAD_R} height={RAIL} fill="var(--h22-interp-surface)" />
          <text x={PAD_L - 8} y={factH + GAP + RAIL / 2 + 4} textAnchor="end" style={{ fill: 'var(--h22-interp-chip-ink)', fontSize: 12 }}>Interpretation</text>
          {markers.length === 0 && <text x={PAD_L + 8} y={factH + GAP + RAIL / 2 + 4} style={{ fill: 'var(--h22-interp-chip-ink)' }}>No published correlations yet</text>}
          <g clipPath="url(#tl-plot)">
            {markers.filter((m) => inView(t(m.date))).map((m) => (
              <a key={m.id} href={`/correlations/${m.id}/`} aria-label={`Correlation: ${m.title}`} onPointerEnter={(ev) => showTip(ev, m.strength, m.title)}>
                <rect x={x(t(m.date)) - 5} y={factH + GAP + RAIL / 2 - 5} width={10} height={10} transform={`rotate(45 ${x(t(m.date))} ${factH + GAP + RAIL / 2})`} fill="var(--h22-interp-rule)" stroke="var(--h22-interp-surface)" strokeWidth={2} />
              </a>
            ))}
          </g>
        </g>
        <line className="axis" x1={PAD_L} x2={W - PAD_R} y1={H - AXIS} y2={H - AXIS} />
      </svg>
      {tip && (
        <div className="h22-tooltip" style={{ transform: `translate(${Math.min(tip.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300)}px, ${tip.y - 56}px)` }} role="status">
          <strong>{tip.value}</strong><span>{tip.label}</span>
        </div>
      )}
    </div>
  );
}
