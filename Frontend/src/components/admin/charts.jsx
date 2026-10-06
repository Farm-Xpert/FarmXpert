'use client';

// ============================================================
// FILE: src/components/admin/charts.jsx
//
// The admin console's chart kit - hand-built SVG, no chart library.
// Specs (dataviz method): 2px lines, soft area fills, hairline grids,
// recessive axes, 4px rounded bar tops with 2px gaps, one y-axis only,
// legend for 2+ series, and a hover layer on every chart:
//   line/area  - crosshair + tooltip listing every series at that day
//   bars       - per-bar highlight + tooltip
//   heatmap    - per-cell tooltip
// Colours come from --viz-* tokens (validated, light and dark).
// ============================================================

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/cn';

export const SERIES = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)'];

// numbers and dates follow the page language (<html lang>), with Indian grouping
const loc = () => {
  const l = typeof document !== 'undefined' ? document.documentElement.lang : '';
  return l && l !== 'en' ? `${l}-IN` : 'en-IN';
};
export const fmtNum = (v) => (v === null || v === undefined ? '—'
  : new Intl.NumberFormat(loc(), { notation: 'compact', maximumFractionDigits: 1 }).format(v));
export const fmtDay = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'short' });

/** Round a max up to a friendly axis top and return 4 ticks. */
function niceTicks(max) {
  if (!max || max <= 0) return { top: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

/** Consecutive days ending today, so gaps show as zeros, not missing points. */
export function lastDays(n) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
  }
  return out;
}

function smoothPath(pts) {
  // monotone-ish cubic: gentle curves that never overshoot between points
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span className={cn('inline-block rounded-full', it.dashed ? 'h-0.5 w-3.5' : 'size-2')}
            style={{ background: it.color, ...(it.dashed && { backgroundImage: `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)`, background: 'none' }) }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, y, width, children }) {
  const left = x > width * 0.62;
  return (
    <div className="pointer-events-none absolute z-20 min-w-[9.5rem] rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[0_12px_28px_-12px_rgb(0_0_0/0.3)]"
      style={{ top: Math.max(0, y - 8), left: left ? undefined : x + 14, right: left ? width - x + 14 : undefined }}>
      {children}
    </div>
  );
}

/**
 * Line or stacked-area chart over days.
 * series: [{ key, label, color, values: number[] (aligned to days), dashed? }]
 */
export function TimeChart({ days, series, stacked = false, height = 240, format = fmtNum, unit = '' }) {
  const t = useTranslations('admin.chart');
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const layers = useMemo(() => {
    const base = days.map(() => 0);
    return series.map((s) => {
      const lower = [...base];
      const upper = s.values.map((v, i) => (stacked ? base[i] + (v || 0) : v || 0));
      if (stacked) upper.forEach((v, i) => { base[i] = v; });
      return { ...s, lower, upper };
    });
  }, [days, series, stacked]);

  const max = Math.max(0, ...layers.flatMap((l) => l.upper));
  const { top, ticks } = niceTicks(max);
  const x = (i) => pad.l + (days.length > 1 ? (i / (days.length - 1)) * iw : iw / 2);
  const y = (v) => pad.t + ih - (v / top) * ih;
  const every = Math.ceil(days.length / 7);

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(days.length - 1, Math.round(((px - pad.l) / iw) * (days.length - 1))));
    setHover({ i, cx: (x(i) / W) * r.width, cy: e.clientY - r.top, w: r.width });
  };

  return (
    <div ref={box} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
        <defs>
          {layers.map((l) => (
            <linearGradient key={l.key} id={`g-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={l.color} stopOpacity={stacked ? 0.55 : 0.22} />
              <stop offset="1" stopColor={l.color} stopOpacity={stacked ? 0.35 : 0} />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="9" className="fill-[var(--viz-axis)] text-[9px]">{format(t)}{unit}</text>
          </g>
        ))}
        {days.map((d, i) => (i % every === 0 || i === days.length - 1) && (
          <text key={d} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'} fontSize="9" className="fill-[var(--viz-axis)] text-[9px]">{fmtDay(d)}</text>
        ))}
        {layers.map((l) => {
          const upper = l.upper.map((v, i) => [x(i), y(v)]);
          const lower = l.lower.map((v, i) => [x(i), y(v)]).reverse();
          const area = `${smoothPath(upper)} L${lower[0][0]},${lower[0][1]} ${smoothPath(lower).slice(1)} Z`;
          return (
            <g key={l.key}>
              {!l.dashed && <path d={stacked ? area : `${smoothPath(upper)} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#g-${l.key})`} />}
              <path d={smoothPath(upper)} fill="none" stroke={l.color} strokeWidth="2" strokeLinecap="round"
                strokeDasharray={l.dashed ? '5 4' : undefined} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        {hover && (
          <g>
            <line x1={x(hover.i)} x2={x(hover.i)} y1={pad.t} y2={pad.t + ih} stroke="var(--viz-axis)" strokeWidth="1" strokeDasharray="3 3" />
            {layers.map((l) => (
              <circle key={l.key} cx={x(hover.i)} cy={y(l.upper[hover.i])} r="4.5" fill={l.color} stroke="var(--viz-surface)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {hover && (
        <Tooltip x={hover.cx} y={hover.cy} width={hover.w}>
          <p className="mb-1.5 font-medium text-ink">{fmtDay(days[hover.i])}</p>
          {[...layers].reverse().map((l) => (
            <p key={l.key} className="flex items-center justify-between gap-4 py-0.5 text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: l.color }} />{l.label}</span>
              <span className="font-medium text-ink tabular-nums">{format(l.values[hover.i] || 0)}{unit}</span>
            </p>
          ))}
          {stacked && layers.length > 1 && (
            <p className="mt-1 flex justify-between border-t border-line pt-1 text-muted">
              <span>{t('total')}</span><span className="font-medium text-ink tabular-nums">{format(layers[layers.length - 1].upper[hover.i])}{unit}</span>
            </p>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/** Stacked daily bars (e.g. text vs voice questions). */
export function BarChart({ days, series, height = 220, format = fmtNum }) {
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const pad = { l: 40, r: 8, t: 10, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const totals = days.map((_, i) => series.reduce((s, x) => s + (x.values[i] || 0), 0));
  const { top, ticks } = niceTicks(Math.max(0, ...totals));
  const slot = iw / days.length;
  const bw = Math.max(3, Math.min(22, slot - 2));
  const y = (v) => pad.t + ih - (v / top) * ih;
  const every = Math.ceil(days.length / 7);

  return (
    <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="9" className="fill-[var(--viz-axis)] text-[9px]">{format(t)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          let acc = 0;
          const active = hover?.i === i;
          return (
            <g key={d} opacity={hover && !active ? 0.45 : 1}
              onMouseEnter={(e) => {
                const r = box.current.getBoundingClientRect();
                setHover({ i, cx: (cx / W) * r.width, cy: e.clientY - r.top, w: r.width });
              }}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={ih} fill="transparent" />
              {series.map((s, k) => {
                const v = s.values[i] || 0;
                if (!v) return null;
                const y0 = y(acc);
                acc += v;
                const y1 = y(acc);
                const h = Math.max(0, y0 - y1 - (k > 0 ? 2 : 0));        // 2px gap between segments
                const isTop = series.slice(k + 1).every((z) => !(z.values[i] || 0));
                return (
                  <path key={s.key} fill={s.color}
                    d={isTop
                      ? `M${cx - bw / 2},${y1 + h} v${-(h - Math.min(4, h))} q0,-${Math.min(4, h)} ${Math.min(4, bw / 2)},-${Math.min(4, h)} h${bw - 2 * Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, h)} v${h - Math.min(4, h)} z`
                      : `M${cx - bw / 2},${y1 + h} v${-h} h${bw} v${h} z`} />
                );
              })}
              {(i % every === 0 || i === days.length - 1) && (
                <text x={cx} y={H - 8} textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'} fontSize="9" className="fill-[var(--viz-axis)] text-[9px]">{fmtDay(d)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <Tooltip x={hover.cx} y={hover.cy} width={hover.w}>
          <p className="mb-1.5 font-medium text-ink">{fmtDay(days[hover.i])}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 py-0.5 text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
              <span className="font-medium text-ink tabular-nums">{format(s.values[hover.i] || 0)}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Ranked horizontal bars with the value and its share at the end. Each bar is
 * as long as its share of the total, so "72%" fills 72% of the track; a
 * share under 1% still shows a sliver and reads "< 1%", never "0%".
 */
export function RankBars({ rows, color = 'var(--viz-1)', format = fmtNum, labelOf = (r) => r.label }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const share = (v) => (v / total) * 100;
  const shareText = (v) => (v > 0 && share(v) < 1 ? '< 1%' : `${Math.round(share(v))}%`);
  const [hover, setHover] = useState(null);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={labelOf(r)} onMouseEnter={() => setHover(labelOf(r))} onMouseLeave={() => setHover(null)}
          className={cn('transition-opacity', hover && hover !== labelOf(r) && 'opacity-50')}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-ink">{labelOf(r)}</span>
            <span className="shrink-0 whitespace-nowrap text-muted tabular-nums">
              <span className="font-medium text-ink">{format(r.value)}</span> · {shareText(r.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--viz-track)]">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${r.value > 0 ? Math.max(1.5, share(r.value)) : 0}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Weekday x hour activity heatmap (sequential, one hue). */
export function Heatmap({ cells }) {
  const t = useTranslations('admin.chart');
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  cells.forEach((c) => { grid[c.dow - 1][c.hour] = c.n; });
  const max = Math.max(1, ...grid.flat());
  const [hover, setHover] = useState(null);
  // Monday first; 2024-01-01 was a Monday
  const names = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc(), { weekday: 'short' })), []);
  const step = (v) => (v ? 0.14 + (v / max) * 0.86 : 0);
  return (
    <div className="relative">
      <div className="grid grid-cols-[2.2rem_repeat(24,minmax(0,1fr))] gap-[3px]">
        {grid.map((row, d) => (
          <div key={names[d]} className="contents">
            <span className="self-center text-[10px] text-[var(--viz-axis)]">{names[d]}</span>
            {row.map((v, h) => (
              <span key={h} onMouseEnter={() => setHover({ d, h, v })} onMouseLeave={() => setHover(null)}
                className={cn('aspect-square rounded-[3px] transition-transform', hover?.d === d && hover?.h === h && 'scale-125 ring-2 ring-[var(--viz-surface)]')}
                style={{ background: v ? `color-mix(in oklab, var(--viz-seq) ${Math.round(step(v) * 100)}%, var(--viz-track))` : 'var(--viz-track)' }} />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[9px] text-[var(--viz-axis)]">{h % 3 === 0 ? h : ''}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{hover ? `${names[hover.d]} ${String(hover.h).padStart(2, '0')}:00 · ${t('questions', { n: hover.v })}` : <span className="fx-hover-hint print:hidden">{t('hover')}</span>}</span>
        <span className="inline-flex items-center gap-1.5">{t('less')}
          {[0.14, 0.4, 0.7, 1].map((s) => (
            <span key={s} className="size-2.5 rounded-[2px]" style={{ background: `color-mix(in oklab, var(--viz-seq) ${s * 100}%, var(--viz-track))` }} />
          ))} {t('more')}
        </span>
      </div>
    </div>
  );
}

/** Tiny trend line for a KPI tile (no axes; the tile names it). */
/**
 * Part-to-whole as a donut: one slice per row, a 2px surface gap between
 * slices, the total in the middle and a legend with value and share. The
 * four largest rows take the four categorical colours in order; the rest
 * fold into a grey "Other" slice (never a generated fifth hue). Hovering a
 * slice or a legend row highlights the pair.
 */
export function Donut({ rows, format = fmtNum, totalLabel = 'Total', otherLabel = 'Other', size = 150 }) {
  const [hover, setHover] = useState(null);
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, SERIES.length).map((r, i) => ({ ...r, color: SERIES[i] }));
  const rest = sorted.slice(SERIES.length);
  const slices = rest.length
    ? [...top, { label: otherLabel, value: rest.reduce((s, r) => s + r.value, 0), color: 'var(--viz-axis)', other: rest.map((r) => r.label) }]
    : top;
  const total = slices.reduce((s, r) => s + r.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-faint">—</p>;

  const R = 50;
  const r = 34;                                   // the ring is R - r thick
  const gap = slices.length > 1 ? 0.012 : 0;      // a hairline of surface between slices (turns)
  const arc = (a0, a1, radius) => {
    const p = (a) => [60 + radius * Math.cos(a * 2 * Math.PI), 60 + radius * Math.sin(a * 2 * Math.PI)];
    return { from: p(a0), to: p(a1), large: a1 - a0 > 0.5 ? 1 : 0 };
  };
  // where each slice starts, from 12 o'clock, in turns
  const starts = slices.reduce((acc, sl, i) => [...acc, (i ? acc[i - 1] : -0.25) + (i ? slices[i - 1].value / total : 0)], []);
  const paths = slices.map((sl, idx) => {
    const turn = sl.value / total;
    const a0 = starts[idx] + gap / 2;
    const a1 = starts[idx] + Math.max(turn - gap / 2, turn * 0.5 + 0.0005);
    if (turn >= 0.9999) return { ...sl, d: `M60 ${60 - R}A${R} ${R} 0 1 1 59.99 ${60 - R}ZM60 ${60 - r}A${r} ${r} 0 1 0 60.01 ${60 - r}Z` };
    const o = arc(a0, a1, R);
    const i = arc(a0, a1, r);
    return { ...sl, d: `M${o.from}A${R} ${R} 0 ${o.large} 1 ${o.to}L${i.to}A${r} ${r} 0 ${i.large} 0 ${i.from}Z` };
  });
  const share = (v) => { const p = (v / total) * 100; return p > 0 && p < 1 ? '< 1%' : `${Math.round(p)}%`; };
  const active = hover !== null ? slices[hover] : null;

  return (
    // chart on top, the legend below at full width, so model names are never cut short
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 120 120" width={size} height={size} className="shrink-0" role="img"
        aria-label={slices.map((s) => `${s.label} ${share(s.value)}`).join(', ')}>
        {paths.map((p, i) => (
          <path key={p.label} d={p.d} fill={p.color} fillRule="evenodd"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="cursor-default transition-opacity duration-150"
            style={{ opacity: hover === null || hover === i ? 1 : 0.35 }} />
        ))}
        <text x="60" y="56" textAnchor="middle" fontSize="7" className="fill-[var(--viz-axis)]">{active ? active.label : totalLabel}</text>
        <text x="60" y="68" textAnchor="middle" fontSize="11" fontWeight="600" className="fill-[var(--fx-ink)]">
          {format(active ? active.value : total)}
        </text>
      </svg>
      {/* compact legend: two columns, name over amount, no rules */}
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
        {slices.map((s, i) => (
          <li key={s.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            title={s.other ? s.other.join(', ') : s.label}
            className={cn('flex min-w-0 items-start gap-2 transition-opacity', hover !== null && hover !== i && 'opacity-50')}>
            <span className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs text-ink">{s.label}</span>
              <span className="block text-[0.7rem] whitespace-nowrap tabular-nums text-muted">
                <span className="font-medium text-ink">{format(s.value)}</span> · {share(s.value)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ values, color = 'var(--viz-1)' }) {
  if (!values?.length) return null;
  const W = 120;
  const H = 32;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - 2 - (v / max) * (H - 4)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-28" aria-hidden>
      <path d={`${smoothPath(pts)} L${W},${H} L0,${H} Z`} fill={color} opacity="0.12" />
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
