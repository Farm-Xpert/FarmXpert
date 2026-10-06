'use client';

// ============================================================
// FILE: src/components/admin/AdminReport.jsx
//
// The operations report, laid out for A4 and "Save as PDF": a management
// read, not a data dump. It leads with what happened, then the budget
// (what the AI cost, where the money went, what the month will cost),
// then usage, speed, reliability, demand and growth - each with one line
// on what it means. No personal or account data is included.
// Dressed like the website: cream paper, the forest-green band and the
// botanical leaves, which repeat faintly on every printed page.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { LogoMark, Wordmark } from '@/components/ui/Logo';
import { BarChart, Heatmap, Legend, RankBars, SERIES, TimeChart, fmtNum, lastDays } from './charts';

const PURPOSES = [
  { key: 'chat', label: 'Answering questions' },
  { key: 'embedding', label: 'Knowledge search' },
  { key: 'transcription', label: 'Speech to text' },
  { key: 'speech', label: 'Text to speech' },
];
const AGENTS = {
  weather_watcher: 'Weather Watcher', soil_health: 'Soil Health', irrigation_planner: 'Irrigation Planner',
  crop_predictor: 'Crop Advisor', task_scheduler: 'Task Planner', market_intelligence: 'Market Intelligence',
  retrieval_agent: 'Farm Knowledge',
};
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const byDay = (rows, key, days) => {
  const m = new Map((rows || []).map((r) => [String(r.day).slice(0, 10), Number(r[key] || 0)]));
  return days.map((d) => m.get(d) || 0);
};
const longDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
// "gpt-4.1-mini-2025-04-14" -> "gpt-4.1-mini": a version date is noise in a report
const modelName = (m) => String(m).replace(/-\d{4}-\d{2}-\d{2}$/, '');

/** The site's leaf. `faint` for large background leaves: the vein is drawn in
 *  the leaf's own colour, so a see-through leaf never carries a bright stripe. */
function Leaf({ className, faint = false }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2C18 6 19 14 12 22 5 14 6 6 12 2Z" fill="currentColor" />
      <path d="M12 5.5C11.6 10 11.6 15 12 20.5" fill="none" strokeLinecap="round"
        stroke={faint ? 'currentColor' : '#fbf8f1'} strokeWidth={faint ? 0.9 : 1.2} strokeOpacity={faint ? 0.9 : 1} />
    </svg>
  );
}

function Section({ n, title, meaning, children, className = '' }) {
  return (
    <section data-pdf-block className={`rp-section ${className}`}>
      <header className="mb-3 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e6efdc] text-[#2f7a3e]"><Leaf className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold tracking-[0.24em] whitespace-nowrap text-[#b8913a]">SECTION {String(n).padStart(2, '0')}</p>
          <h2 className="font-serif text-[1.4rem] leading-tight text-[#10281a]">{title}</h2>
        </div>
        <span className="ml-2 h-px flex-1 bg-gradient-to-r from-[#d9cfb6] to-transparent" aria-hidden />
      </header>
      {meaning && <p className="mb-4 max-w-[62ch] text-[0.82rem] leading-relaxed text-[#56655a]">{meaning}</p>}
      {children}
    </section>
  );
}

function Figure({ label, value, sub, tone = 'ink' }) {
  const color = tone === 'good' ? 'text-[#1f7a36]' : tone === 'warn' ? 'text-[#b06a00]' : 'text-[#10281a]';
  return (
    <div className="rounded-xl border border-[#e7dfcc] bg-white/80 px-4 py-3.5">
      <p className="text-[0.66rem] font-semibold tracking-[0.14em] text-[#7a867d] uppercase">{label}</p>
      <p className={`mt-1.5 text-[1.5rem] leading-none font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-1.5 text-[0.7rem] leading-snug text-[#6b786f]">{sub}</p>}
    </div>
  );
}

function Change({ value, invert }) {
  if (value === null || value === undefined) return <span className="text-[#9aa39c]">first period on record</span>;
  const good = invert ? value < 0 : value > 0;
  return <span className={good ? 'text-[#1f7a36]' : 'text-[#b8332a]'}>{value >= 0 ? '▲' : '▼'} {Math.abs(value)}% vs previous period</span>;
}

function Share({ rows, money, share }) {
  const total = sum(rows.map((r) => r.value)) || 1;
  return (
    <div className="grid gap-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-[0.72rem]">
            <span className="text-[#1d2b22]">{r.label}</span>
            <span className="shrink-0 whitespace-nowrap text-[0.66rem] tabular-nums text-[#6b786f]">{money(r.value)} · <b className="font-semibold text-[#10281a]">{share(r.value, total)}</b></span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#ece5d3]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / total) * 100)}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * On its own page (/reports/operations) it is a readable, printable report.
 * With `capture`, the admin console renders it off-screen and turns it into a
 * PDF file (see lib/reportPdf.js): `onReady(root)` fires once it is drawn.
 */
export default function AdminReport({ capture = false, days: wanted, onReady }) {
  const search = useSearchParams();
  const asked = Number(wanted ?? search.get('days'));
  const range = [7, 30, 90].includes(asked) ? asked : 30;
  const paperRef = useRef(null);
  const { data, error } = useApi(`/admin/analytics?days=${range}`);
  const [limit, setLimit] = useState(undefined);        // the per-farmer daily token allowance
  const days = useMemo(() => lastDays(range), [range]);
  const generated = useMemo(() => new Date(), []);

  useEffect(() => {
    api.get('/admin/users?limit=1').then((u) => setLimit(u.default_daily_limit || null)).catch(() => setLimit(null));
  }, []);

  const ready = Boolean(data) && limit !== undefined;
  useEffect(() => { if (!capture) document.title = `FarmXpert operations report ${days[0]} to ${days[days.length - 1]}`; }, [capture, days]);
  // off-screen for the PDF: say when the charts are drawn and the fonts loaded
  const told = useRef(false);                          // once: a re-render must not download twice
  useEffect(() => {
    if (!capture || !ready || told.current) return undefined;
    let cancelled = false;
    document.fonts.ready.then(() => setTimeout(() => {
      if (cancelled || told.current) return;
      told.current = true;
      onReady?.(paperRef.current);
    }, 500));
    return () => { cancelled = true; };
  }, [capture, ready, onReady]);
  useEffect(() => {
    if (capture || !ready || search.get('print') !== '1') return undefined;
    let cancelled = false;
    document.fonts.ready.then(() => setTimeout(() => { if (!cancelled) window.print(); }, 700));
    return () => { cancelled = true; };
  }, [capture, ready, search]);

  if (error) return <p className="p-10 text-center text-sm">Admin access is required to see this report.</p>;
  if (!ready) return <div className="grid min-h-dvh place-items-center text-sm text-[#56655a]" role="status">Preparing the report…</div>;

  const cur = data.currency || 'USD';
  const fmtMoney = (v, digits) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur,
    minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v || 0);
  // tiny amounts say so instead of rounding to a misleading $0.00
  const money = (v) => (v > 0 && v < 0.001 ? `< ${fmtMoney(0.001, 3)}` : fmtMoney(v, v < 1 ? 3 : 2));
  // headline figures show the real amount, however small ($0.0009)
  const exact = (v) => (v > 0 && v < 0.01 ? fmtMoney(v, 4) : money(v));
  const share = (a, b) => { const p = b ? (a / b) * 100 : 0; return p > 0 && p < 1 ? '< 1%' : `${Math.round(p)}%`; };
  const secs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);
  const k = data.kpis;

  // ── budget ──
  const burn = data.tokens_by_day || [];
  // Money is OpenAI's bill when it has been synced (the same figure as its
  // dashboard); otherwise FarmXpert's own estimate. OpenAI does not split
  // money by purpose or farmer, so those splits keep FarmXpert's proportions,
  // scaled to add up to the billed total.
  const billing = data.billing;
  const metered = sum(burn.map((r) => Number(r.cost || 0)));
  const spend = billing ? Number(billing.cost || 0) : metered;
  const scaleToBill = billing && metered ? spend / metered : 1;
  const perDay = spend / range;
  const monthly = perDay * 30;
  const questionsTotal = Number(k.questions.value || 0);
  const farmerDays = sum(byDay(data.engagement, 'active_farmers', days));
  const tokensTotal = sum(burn.map((r) => Number(r.tokens || 0)));
  const perFarmerDay = farmerDays ? tokensTotal / farmerDays : 0;
  const allowanceUse = limit ? pct(perFarmerDay, limit) : null;
  const byPurpose = PURPOSES.map((p, i) => ({
    label: p.label, color: SERIES[i],
    value: sum(burn.filter((r) => r.purpose === p.key).map((r) => Number(r.cost || 0))) * scaleToBill,
  })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const models = Object.values((data.models || []).reduce((acc, m) => {
    const name = modelName(m.model);
    acc[name] = acc[name] || { label: name, value: 0 };
    acc[name].value += Number(m.cost || 0) * scaleToBill;
    return acc;
  }, {})).filter((m) => m.value > 0).sort((a, b) => b.value - a.value)
    .map((m, i) => ({ ...m, color: SERIES[i % SERIES.length] }));
  const billedByDay = new Map((billing?.by_day || []).map((r) => [String(r.day).slice(0, 10), Number(r.cost || 0)]));
  const spendSeries = [{ key: 'spend', label: 'Daily AI spend', color: 'var(--viz-2)',
    values: days.map((d) => (billing ? billedByDay.get(d) || 0
      : sum(burn.filter((r) => String(r.day).slice(0, 10) === d).map((r) => Number(r.cost || 0))))) }];

  // ── usage ──
  const questions = byDay(data.engagement, 'questions', days);
  const voice = byDay(data.engagement, 'voice', days);
  const farmers = byDay(data.engagement, 'active_farmers', days);
  const agents = data.agents || [];
  const weak = agents.filter((a) => a.runs && a.ok / a.runs < 0.95);
  const busiest = [...(data.heatmap || [])].sort((a, b) => b.n - a.n)[0];
  const topIntent = (data.intents || [])[0];

  // ── the summary, in sentences ──
  const summary = [
    `${fmtNum(questionsTotal)} questions answered for ${fmtNum(k.active_farmers.value)} active farmers${k.voice_share.value ? `, ${k.voice_share.value}% of them spoken` : ''}.`,
    `AI cost ${money(spend)} in total: about ${exact(questionsTotal ? spend / questionsTotal : 0)} per answer, on course for ${exact(monthly)} a month.`,
    k.p50_ms.value != null ? `A typical answer arrived in ${secs(k.p50_ms.value)}; ${k.answer_rate.value ?? '—'}% of questions got a full or partial answer.` : null,
    weak.length ? `Needs attention: ${weak.map((a) => `${AGENTS[a.agent] || a.agent} (${pct(a.ok, a.runs)}% success)`).join(', ')}.`
      : agents.length ? 'Every expert agent answered at least 95% of its runs.' : null,
    topIntent ? `Farmers asked most about ${String(topIntent.intent).replace(/_/g, ' ')}${busiest ? `, busiest on ${WEEKDAYS[busiest.dow - 1]}s around ${String(busiest.hour).padStart(2, '0')}:00` : ''}.` : null,
  ].filter(Boolean);

  return (
    <div className="fx-app rp-root" data-mode="light">
      <style>{`
        /* no page margin: the browser then prints no date, title, address or page number */
        @page { size: A4; margin: 0; }
        .rp-root { background: #e9e2d2; min-height: 100dvh; color: #1d2b22; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .rp-paper { position: relative; width: 210mm; max-width: 100%; margin: 24px auto; overflow: hidden;
          background: radial-gradient(120% 60% at 100% 0%, #f1ead8 0%, transparent 60%), #fbf8f1;
          box-shadow: 0 24px 70px -24px rgba(16,40,26,.4); }
        .rp-body { position: relative; padding: 9mm 14mm 14mm; display: grid; gap: 9mm; }
        .rp-section { break-inside: avoid; }
        .rp-root .fx-hover-hint { display: none; }
        .rp-root .rp-ranks li > div:first-child { font-size: 0.7rem; }
        .rp-root .rp-ranks li > div:first-child > span:last-child { font-size: 0.64rem; }   /* a report is read, not hovered */
        .rp-break { break-before: page; }
        /* the website's botanicals, faint; fixed so print repeats them on every page */
        .rp-deco { position: absolute; pointer-events: none; opacity: .13; filter: saturate(.7); }
        @media print {
          .rp-break { padding-top: 10mm; }
          .rp-root { background: #fbf8f1; }
          .rp-paper { width: auto; margin: 0; box-shadow: none; overflow: visible; }
          .rp-toolbar, .fx-rootvine { display: none !important; }
          .rp-deco { position: fixed; }
        }
      `}</style>

      {!capture && <div className="rp-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#ddd5c2] bg-[#fbf8f1]/95 px-5 py-3 backdrop-blur">
        <Link href="/dashboard/admin" className="text-sm text-[#2f7a3e] hover:underline">← Back to console</Link>
        <p className="hidden text-xs text-[#6b786f] sm:block">In the print window choose <b>Save as PDF</b> as the destination.</p>
        <button type="button" onClick={() => window.print()}
          className="rounded-full bg-gradient-to-r from-[#0a3521] to-[#2f7a3e] px-5 py-2 text-sm font-medium text-white shadow">Save as PDF</button>
      </div>}

      <article ref={paperRef} className="rp-paper" style={capture ? { margin: 0, width: '210mm', boxShadow: 'none' } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/botanical/leaves-corner.svg" alt="" className="rp-deco -top-4 -right-10 w-[62mm] rotate-90" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/botanical/fern.svg" alt="" className="rp-deco -bottom-10 -left-12 w-[48mm]" />

        {/* ── cover band ── */}
        <header data-pdf-block data-pdf-full className="relative overflow-hidden bg-gradient-to-br from-[#062516] via-[#0f4a2e] to-[#2f7a3e] px-[14mm] pt-[12mm] pb-[16mm] text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/botanical/tropical-leaf.svg" alt="" className="pointer-events-none absolute -top-8 right-[-10mm] w-[70mm] opacity-[0.16] brightness-[2.2] saturate-0" />
          <div className="relative flex items-center gap-2.5">
            <LogoMark className="h-11" />
            <Wordmark tone="light" className="h-6" />
          </div>
          <p className="relative mt-8 text-[0.66rem] font-semibold tracking-[0.3em] text-[#e3cf8f]">OPERATIONS &amp; BUDGET REPORT</p>
          <h1 className="relative mt-2 font-serif text-[2.3rem] leading-[1.1]">How FarmXpert served farmers</h1>
          <p className="relative mt-3 text-[0.9rem] text-white/80">
            {longDate(days[0])} to {longDate(days[days.length - 1])} · {range} days
          </p>
          <p className="relative mt-1 text-[0.7rem] text-white/55">
            Generated {generated.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · amounts in {cur}
            {billing ? ' from OpenAI billing' : ' (FarmXpert estimate)'} · days in {data.timezone || 'Asia/Kolkata'}
          </p>
          {/* the curved edge of the band */}
          <svg viewBox="0 0 800 40" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-[9mm] w-full" aria-hidden>
            <path d="M0 40V22C140 4 300 0 420 12S660 34 800 14V40Z" fill="#fbf8f1" />
          </svg>
        </header>

        <div className="rp-body">
          {/* ── summary ── */}
          <section data-pdf-block className="rp-section relative overflow-hidden rounded-2xl border border-[#e3d6b2] bg-gradient-to-br from-[#f7efda] to-[#fbf6e9] px-6 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/botanical/leaf-single.svg" alt="" aria-hidden
              className="pointer-events-none absolute -right-4 -bottom-6 w-24 rotate-[24deg] opacity-[0.16]" />
            <p className="text-[0.64rem] font-semibold tracking-[0.26em] text-[#8a6a1f]">SUMMARY</p>
            <ul className="mt-2.5 grid gap-2 text-[0.88rem] leading-relaxed text-[#1d2b22]">
              {summary.map((line) => (
                <li key={line} className="flex gap-2.5"><Leaf className="mt-1 size-3.5 shrink-0 text-[#2f7a3e]" />{line}</li>
              ))}
            </ul>
          </section>

          {/* ── key numbers: the whole period on one strip ── */}
          <section data-pdf-block className="rp-section">
            <p className="mb-3 text-[0.64rem] font-semibold tracking-[0.26em] text-[#8a6a1f]">KEY NUMBERS · LAST {range} DAYS</p>
            <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-[#e7dfcc] bg-white/80">
              {[
                ['Active farmers', fmtNum(k.active_farmers.value), <Change key="c" value={k.active_farmers.change} />],
                ['Questions answered', fmtNum(questionsTotal), <Change key="c" value={k.questions.change} />],
                ['Answer rate', k.answer_rate.value == null ? '—' : `${k.answer_rate.value}%`, 'full or partial answers'],
                ['Typical wait', secs(k.p50_ms.value), `slowest 5%: ${secs(k.p95_ms.value)}`],
                ['AI spend', exact(spend), <Change key="c" value={k.cost.change} invert />],
                ['Projected per month', exact(monthly), 'at the current pace'],
                ['Asked by voice', k.voice_share.value == null ? '—' : `${k.voice_share.value}%`, 'of all questions'],
                ['Allowance used', allowanceUse == null ? '—' : `${allowanceUse}%`, limit ? `of ${fmtNum(limit)} tokens a day` : 'no daily limit'],
              ].map(([label, value, sub], i) => (
                <div key={label} className={`px-4 py-3.5 ${i % 4 ? 'border-l border-[#eee6d3]' : ''} ${i > 3 ? 'border-t border-[#eee6d3]' : ''}`}>
                  <p className="text-[0.6rem] font-semibold tracking-[0.12em] text-[#7a867d] uppercase">{label}</p>
                  <p className="mt-1 text-[1.3rem] leading-none font-semibold text-[#10281a] tabular-nums">{value}</p>
                  <p className="mt-1 text-[0.64rem] leading-snug text-[#6b786f]">{sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── health at a glance + what is inside ── */}
          <section data-pdf-block className="rp-section grid grid-cols-[1.15fr_1fr] gap-5">
            <div className="rounded-2xl border border-[#e7dfcc] bg-white/80 p-5">
              <p className="mb-3 text-[0.64rem] font-semibold tracking-[0.26em] text-[#8a6a1f]">HEALTH AT A GLANCE</p>
              {[
                (() => {
                  const ok = agents.length ? agents.filter((a) => a.runs && a.ok / a.runs >= 0.95).length : 0;
                  return ['Expert agents', `${ok} of ${agents.length} healthy`, !agents.length ? 'na' : ok === agents.length ? 'good' : ok >= agents.length - 2 ? 'watch' : 'fix'];
                })(),
                ['Answer rate', k.answer_rate.value == null ? 'no answers yet' : `${k.answer_rate.value}% answered`,
                  k.answer_rate.value == null ? 'na' : k.answer_rate.value >= 95 ? 'good' : k.answer_rate.value >= 85 ? 'watch' : 'fix'],
                ['Speed', k.p50_ms.value == null ? 'no answers yet' : `typical ${secs(k.p50_ms.value)}`,
                  k.p50_ms.value == null ? 'na' : k.p50_ms.value <= 6000 ? 'good' : k.p50_ms.value <= 10000 ? 'watch' : 'fix'],
                ['Budget', allowanceUse == null ? 'no daily limit' : `${allowanceUse}% of allowance`,
                  allowanceUse == null ? 'na' : allowanceUse <= 60 ? 'good' : allowanceUse <= 85 ? 'watch' : 'fix'],
                ['Soil probes', `${data.totals.devices_live} of ${data.totals.devices} reporting`,
                  !data.totals.devices ? 'na' : data.totals.devices_live === data.totals.devices ? 'good' : 'watch'],
              ].map(([label, text, state]) => {
                const tone = { good: ['#1f7a36', 'Good'], watch: ['#b06a00', 'Watch'], fix: ['#b8332a', 'Fix'], na: ['#9aa39c', '—'] }[state];
                return (
                  <div key={label} className="flex items-center gap-3 border-b border-[#efe8d7] py-2 text-[0.78rem] last:border-0">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: tone[0] }} aria-hidden />
                    <span className="w-28 shrink-0 font-medium text-[#10281a]">{label}</span>
                    <span className="flex-1 text-[#56655a]">{text}</span>
                    <span className="text-[0.68rem] font-semibold" style={{ color: tone[0] }}>{tone[1]}</span>
                  </div>
                );
              })}
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f4a2e] to-[#2f7a3e] p-5 text-white">
              {/* the dashboard's botanical sprig, turned pale for the green panel */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/botanical/leaf-branch.svg" alt="" aria-hidden
                className="pointer-events-none absolute -right-7 -bottom-10 w-28 rotate-[-18deg] opacity-[0.18] brightness-[2.4] saturate-0" />
              <p className="mb-3 text-[0.64rem] font-semibold tracking-[0.26em] text-[#e3cf8f]">INSIDE THIS REPORT</p>
              <ol className="relative grid gap-2 text-[0.8rem]">
                {['Budget and cost', 'Farmers and questions', 'Speed and reliability', 'What farmers need', 'Growth'].map((name, i) => (
                  <li key={name} className="flex items-baseline gap-3">
                    <span className="font-serif text-[0.95rem] text-[#e3cf8f]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-white/90">{name}</span>
                  </li>
                ))}
              </ol>
              <p className="relative mt-4 pr-10 text-[0.66rem] leading-relaxed text-white/60">Every figure is aggregated across all farmers; no personal data is included.</p>
            </div>
          </section>

          {/* ── 1. budget ── */}
          <Section n={1} title="Budget and cost" className="rp-break"
            meaning="What the AI cost in this period, what it will cost over a month at the current pace, and what each answer and each farmer costs.">
            <div className="grid grid-cols-3 gap-3">
              <Figure label="Spent this period" value={exact(spend)} sub={<Change value={k.cost.change} invert />} />
              <Figure label="Average per day" value={exact(perDay)} sub={`Over the last ${range} days.`} />
              <Figure label="Projected per month" value={exact(monthly)} sub="If the current daily pace continues." />
              <Figure label="Cost per answer" value={exact(questionsTotal ? spend / questionsTotal : 0)} sub={`${fmtNum(k.tokens_per_question.value || 0)} AI tokens per question.`} />
              <Figure label="Cost per active farmer" value={exact(k.active_farmers.value ? spend / k.active_farmers.value : 0)} sub="Across the whole period." />
              <Figure label="Daily allowance used" value={allowanceUse == null ? '—' : `${allowanceUse}%`}
                tone={allowanceUse == null ? 'ink' : allowanceUse > 80 ? 'warn' : 'good'}
                sub={limit ? `An active farmer used ${fmtNum(Math.round(perFarmerDay))} of ${fmtNum(limit)} tokens a day.` : 'No daily limit set.'} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-6">
              <div>
                <p className="mb-2.5 text-[0.72rem] font-semibold text-[#56655a]">Where the money went{billing && <span className="font-normal text-[#8c968f]"> · split by FarmXpert&apos;s meter, scaled to the bill</span>}</p>
                {byPurpose.length ? <Share rows={byPurpose} money={money} share={share} /> : <p className="text-sm text-[#6b786f]">No spend recorded.</p>}
              </div>
              <div>
                <p className="mb-2.5 text-[0.72rem] font-semibold text-[#56655a]">By AI model</p>
                {models.length ? <Share rows={models} money={money} share={share} /> : <p className="text-sm text-[#6b786f]">No spend recorded.</p>}
              </div>
            </div>
            <p className="mt-5 mb-1 text-[0.72rem] font-semibold text-[#56655a]">Spend per day</p>
            <TimeChart days={days} series={spendSeries} height={150} format={(v) => fmtMoney(v, spend / range < 1 ? 3 : 2)} />
          </Section>

          {/* ── 2. farmers and questions ── */}
          <Section n={2} title="Farmers and questions" className="rp-break"
            meaning="How many farmers used FarmXpert each day, how much they asked, and whether they typed or spoke.">
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Figure label="Active farmers" value={fmtNum(k.active_farmers.value)} sub={<Change value={k.active_farmers.change} />} />
              <Figure label="Questions answered" value={fmtNum(questionsTotal)} sub={<Change value={k.questions.change} />} />
              <Figure label="Asked by voice" value={k.voice_share.value == null ? '—' : `${k.voice_share.value}%`} sub="Share of questions spoken, not typed." />
            </div>
            <Legend items={[{ label: 'Questions', color: 'var(--viz-1)' }, { label: 'Active farmers', color: 'var(--viz-3)' }]} />
            <div className="mt-2">
              <TimeChart days={days} height={165} series={[
                { key: 'q', label: 'Questions', color: 'var(--viz-1)', values: questions },
                { key: 'f', label: 'Active farmers', color: 'var(--viz-3)', values: farmers },
              ]} />
            </div>
            <p className="mt-4 mb-1 text-[0.72rem] font-semibold text-[#56655a]">Typed and spoken, per day</p>
            <Legend items={[{ label: 'Typed', color: 'var(--viz-1)' }, { label: 'Spoken', color: 'var(--viz-4)' }]} />
            <div className="mt-2">
              <BarChart days={days} height={130} series={[
                { key: 'text', label: 'Typed', color: 'var(--viz-1)', values: questions.map((v, i) => v - voice[i]) },
                { key: 'voice', label: 'Spoken', color: 'var(--viz-4)', values: voice },
              ]} />
            </div>
          </Section>

          {/* ── 3. speed and reliability ── */}
          <Section n={3} title="Speed and reliability"
            meaning="How long farmers waited, and whether each expert agent did its job. Green is healthy (95% or more), amber needs watching, red needs fixing.">
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Figure label="Typical wait" value={secs(k.p50_ms.value)} sub={<Change value={k.p50_ms.change} invert />} />
              <Figure label="Slowest answers" value={secs(k.p95_ms.value)} sub="Only 1 answer in 20 took longer." />
              <Figure label="Answer rate" value={k.answer_rate.value == null ? '—' : `${k.answer_rate.value}%`} sub="Questions with a full or partial answer." />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {agents.map((a) => {
                const rate = a.runs ? a.ok / a.runs : 0;
                const [color, word] = rate >= 0.95 ? ['#1f7a36', 'Healthy'] : rate >= 0.8 ? ['#b06a00', 'Watch'] : ['#b8332a', 'Fix'];
                return (
                  <div key={a.agent} className="flex items-center gap-3 border-b border-[#ece4d1] py-1.5 text-[0.78rem]">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                    <span className="flex-1 text-[#1d2b22]">{AGENTS[a.agent] || a.agent}</span>
                    <span className="tabular-nums text-[#56655a]">{Math.round(rate * 100)}%</span>
                    <span className="w-14 text-right text-[0.7rem] font-semibold" style={{ color }}>{word}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── 4. what farmers need ── */}
          <Section n={4} title="What farmers need" className="rp-break"
            meaning="The topics and languages farmers ask in, and when in the week they ask: a guide for content, languages and support hours.">
            <div className="grid grid-cols-2 gap-6">
              <div className="rp-ranks"><p className="mb-2 text-[0.72rem] font-semibold text-[#56655a]">Topics</p>
                <RankBars rows={(data.intents || []).slice(0, 7).map((r) => ({ label: String(r.intent).replace(/_/g, ' '), value: r.n }))} color="var(--viz-1)" /></div>
              <div className="rp-ranks"><p className="mb-2 text-[0.72rem] font-semibold text-[#56655a]">Languages</p>
                <RankBars rows={(data.languages || []).map((r) => ({
                  label: (() => { try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(r.language); } catch { return r.language; } })(),
                  value: r.n,
                }))} color="var(--viz-3)" /></div>
            </div>
            <p className="mt-5 mb-2 text-[0.72rem] font-semibold text-[#56655a]">When farmers ask (weekday and hour, farmer&apos;s local time)</p>
            <Heatmap cells={data.heatmap || []} />
          </Section>

          {/* ── 5. growth ── */}
          <Section n={5} title="Growth"
            meaning="New farmers joining, and how many finished setting up their farm: the step that makes every answer about their own land.">
            <Legend items={[{ label: 'Finished farm setup', color: 'var(--viz-3)' }, { label: 'Signed up only', color: 'var(--viz-1)' }]} />
            <div className="mt-2">
              <BarChart days={days} height={130} series={[
                { key: 'onb', label: 'Finished farm setup', color: 'var(--viz-3)', values: byDay(data.signups, 'onboarded', days) },
                { key: 'rest', label: 'Signed up only', color: 'var(--viz-1)',
                  values: days.map((d, i) => byDay(data.signups, 'signups', days)[i] - byDay(data.signups, 'onboarded', days)[i]) },
              ]} />
            </div>
          </Section>

          <footer className="rp-pagefoot flex items-center justify-between border-t border-[#e3dac5] pt-2.5 text-[0.64rem] text-[#9aa39c]">
            <span className="flex items-center gap-1.5"><LogoMark className="h-3.5" /> FarmXpert · operations &amp; budget report</span>
            <span>Aggregated figures only · no personal data</span>
          </footer>
        </div>
      </article>
    </div>
  );
}
