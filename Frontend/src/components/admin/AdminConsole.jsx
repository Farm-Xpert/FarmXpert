'use client';

// ============================================================
// FILE: src/components/admin/AdminConsole.jsx
//
// Operations analytics for FarmXpert admins. Every chart answers one
// operator question:
//   KPIs              is the service growing and healthy? (vs previous period)
//   Token burn        where the AI budget goes each day, by purpose
//   Engagement        how many farmers ask, and how much they ask
//   Answer latency    what a farmer actually waits (median and p95)
//   Agent reliability which expert fails or slows answers down
//   Intents           what farmers need help with
//   Languages         which languages to invest in
//   When farmers ask  weekday x hour, farmer's time
//   Spend by model    which model the money goes to
//   Growth            new accounts, and how many finish onboarding
// Then every account: usage today vs limit, 30-day tokens and spend,
// farms and the Blynk tokens they are connected with.
// ============================================================

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/cn';
import { clearApiCache, useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { download } from '@/lib/csv';
import { useAuth } from '@/context/AuthContext';
import { accountsCsv, dailyCsv, stamp } from './exports';
import AdminReport from './AdminReport';
import { downloadReportPdf } from '@/lib/reportPdf';
import { Skeleton } from '@/components/ui/primitives';
import { Loading, SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeletons';
import { Eye, EyeOff, Search } from '@/components/ui/icons';
import { BarChart, Donut, Heatmap, Legend, RankBars, SERIES, Sparkline, TimeChart, fmtDay, fmtNum, lastDays } from './charts';

const PURPOSES = ['chat', 'embedding', 'transcription', 'speech'].map((key) => ({ key }));
// a language code in the viewer's own language (hi -> "हिन्दी" / "Hindi")
const langName = (code, locale) => {
  try { return new Intl.DisplayNames([locale], { type: 'language' }).of(code) || code; } catch { return code; }
};

const money = (v, cur = 'USD') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: v < 1 ? 3 : 2 }).format(v || 0);
const secs = (ms) => (ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)}s`);
/**
 * Money per model: version dates dropped ("gpt-4.1-mini-2025-04-14" -> "gpt-4.1-mini")
 * and, once OpenAI billing is synced, scaled so the models add up to the bill.
 */
const spendByModel = (data) => {
  const merged = {};
  for (const m of data.models || []) {
    const name = String(m.model).replace(/-\d{4}-\d{2}-\d{2}$/, '');
    merged[name] = (merged[name] || 0) + (Number(m.cost) || 0);
  }
  const metered = Object.values(merged).reduce((s, v) => s + v, 0);
  const scale = data.billing && metered ? Number(data.billing.cost || 0) / metered : 1;
  return Object.entries(merged).map(([label, v]) => ({ label, value: v * scale })).sort((a, b) => b.value - a.value);
};

/** Bars | Pie, the same pill switch as the day range; the choice is remembered on this device. */
function ViewSwitch({ value, onChange }) {
  const t = useTranslations('admin.view');
  return (
    <div role="radiogroup" aria-label={t('label')} className="inline-flex shrink-0 rounded-lg border border-line bg-surface p-0.5">
      {['bars', 'pie'].map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === v ? 'bg-forest text-on-forest' : 'text-muted hover:text-ink')}>
          {t(v)}
        </button>
      ))}
    </div>
  );
}

function useRemembered(key, fallback) {
  const [value, setValue] = useState(() => {
    try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
  });
  const set = (v) => {
    setValue(v);
    try { window.localStorage.setItem(key, v); } catch { /* private mode: fine */ }
  };
  return [value, set];
}

const byDay = (rows, key, days) => {
  const m = new Map(rows.map((r) => [String(r.day).slice(0, 10), Number(r[key] || 0)]));
  return days.map((d) => m.get(d) || 0);
};

function Panel({ title, question, children, className, right }) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="!font-sans text-[0.95rem] font-semibold tracking-normal text-ink">{title}</h2>
          {question && <p className="mt-0.5 text-xs text-muted">{question}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, change, invert = false, sub, spark, color }) {
  const t = useTranslations('admin');
  const good = change === null || change === undefined ? null : invert ? change < 0 : change > 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[1.6rem] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs">
            {change !== null && change !== undefined ? (
              <span className={cn('inline-flex items-center gap-0.5 font-medium', good ? 'text-[#0ca30c]' : 'text-[#d03b3b]')}>
                {/* icon + sign + number: never colour alone */}
                <span aria-hidden>{change >= 0 ? '▲' : '▼'}</span>{Math.abs(change)}%
              </span>
            ) : <span className="text-faint">{t('noPrior')}</span>}
            {sub && <span className="text-faint">· {sub}</span>}
          </p>
        </div>
        {spark && <Sparkline values={spark} color={color} />}
      </div>
    </div>
  );
}

function TokenCell({ token }) {
  const t = useTranslations('admin');
  const [shown, setShown] = useState(false);
  if (!token) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-[0.72rem] text-ink">{shown ? token : `${'•'.repeat(8)}${token.slice(-4)}`}</code>
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? t('hideToken') : t('showToken')}
        className="grid size-6 place-items-center rounded text-faint hover:bg-canvas hover:text-ink">
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}

function UserDetail({ id, currency }) {
  const t = useTranslations('admin');
  const { data, loading } = useApi(`/admin/users/${id}/detail`);
  const days = useMemo(() => lastDays(30), []);
  if (loading || !data) return <Skeleton className="h-48 rounded-xl" />;
  const series = PURPOSES.map((p, i) => ({
    key: p.key, label: t(`purpose.${p.key}`), color: SERIES[i],
    values: byDay(data.daily.filter((r) => r.purpose === p.key), 'tokens', days),
  })).filter((s) => s.values.some(Boolean));
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-xs font-medium text-muted">{t('tokensPerDay30')}</p>
        {series.length ? (
          <>
            <Legend items={series} />
            <div className="mt-2"><TimeChart days={days} series={series} stacked height={200} /></div>
          </>
        ) : <p className="py-10 text-center text-sm text-faint">{t('noUsage30')}</p>}
      </div>
      <div className="space-y-4 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{t('byModelAll')}</p>
          <table className="w-full text-xs">
            <tbody>
              {data.by_model.map((m) => (
                <tr key={`${m.model}-${m.purpose}`} className="border-b border-line/70">
                  <td className="py-1.5 pr-2 text-ink">{m.model}</td>
                  <td className="py-1.5 text-right text-muted tabular-nums">{fmtNum(Number(m.tokens))}</td>
                  <td className="py-1.5 pl-3 text-right text-ink tabular-nums">{money(m.cost, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{t('farmsDevices')}</p>
          {data.farms.map((f) => (
            <p key={f.id} className="text-xs text-ink">{f.name} <span className="text-faint">· {[f.district, f.state].filter(Boolean).join(', ')}</span></p>
          ))}
          {data.devices.map((d) => (
            <p key={d.id} className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className={d.is_active ? 'text-ink' : 'text-faint line-through'}>{d.farm} · {d.label || t('probe')}</span>
              <TokenCell token={d.token} />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function RemoveDialog({ account, onClose, onDone }) {
  const t = useTranslations('admin.remove');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/users/${account.id}/remove`);
      onDone();
    } catch (err) {
      setError(err?.message || t('failed'));
      setBusy(false);
    }
  };
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [busy, onClose]);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="rm-title">
      <button type="button" aria-label={t('cancel')} className="absolute inset-0 bg-black/40" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-lift">
        <h2 id="rm-title" className="!font-sans text-lg font-semibold text-ink">{t('title', { name: account.name })}</h2>
        <p className="mt-1 text-sm text-muted">{account.email}</p>
        <ul className="mt-4 space-y-2 text-sm text-ink">
          <li className="flex gap-2"><span className="text-danger">●</span>{t('signOut')}</li>
          <li className="flex gap-2"><span className="text-danger">●</span>{t('probes')}</li>
          <li className="flex gap-2"><span className="text-leaf">●</span>{t('kept')}</li>
        </ul>
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{t('final')}</p>
        {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-canvas">{t('cancel')}</button>
          <button type="button" onClick={confirm} disabled={busy}
            className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {busy ? t('removing') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Users({ currency }) {
  const t = useTranslations('admin');
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [removing, setRemoving] = useState(null);
  const { data, loading, reload } = useApi(`/admin/users?limit=300${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
  const limit = data?.default_daily_limit || 0;
  return (
    <Panel title={t('accounts.title')} question={t('accounts.question')}
      right={(
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('accounts.search')}
            className="h-8 w-56 rounded-lg border border-line bg-canvas pr-3 pl-8 text-xs text-ink placeholder:text-faint focus:border-leaf focus:outline-none" />
        </label>
      )}>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[0.68rem] tracking-wide text-faint uppercase">
              <th className="px-5 py-2 font-medium">{t('col.user')}</th>
              <th className="px-3 py-2 font-medium">{t('col.role')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('col.farms')}</th>
              <th className="px-3 py-2 font-medium">{t('col.today')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('col.tokens30')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('col.spend30')}</th>
              <th className="px-3 py-2 font-medium">{t('col.blynk')}</th>
              <th className="px-3 py-2 font-medium">{t('col.lastLogin')}</th>
              <th className="px-5 py-2"><span className="sr-only">{t('remove.action')}</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={9} className="px-5 py-4"><Loading><SkeletonTable rows={6} cols={7} /></Loading></td></tr>}
            {data?.items.map((u) => {
              const cap = u.token_daily_limit ?? limit;
              const used = Number(u.tokens_today);
              const share = cap ? Math.min(1, used / cap) : 0;
              return (
                <Fragment key={u.id}>
                  <tr onClick={() => setOpen(open === u.id ? null : u.id)}
                    className={cn('cursor-pointer border-b border-line/70 transition-colors hover:bg-canvas', open === u.id && 'bg-canvas',
                      u.removed_at && 'opacity-60')}>
                    <td className="px-5 py-2.5">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        <span className={u.removed_at ? 'line-through decoration-faint' : undefined}>{u.name}</span>
                        {u.removed_at && (
                          <span className="rounded-md bg-danger/10 px-1.5 py-0.5 text-[0.62rem] font-medium text-danger no-underline">
                            {t('remove.removedOn', { date: fmtDay(u.removed_at) })}
                          </span>
                        )}
                      </p>
                      <p className="text-faint">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                    </td>
                    <td className="px-3 py-2.5"><span className="rounded-md bg-canvas px-1.5 py-0.5 text-[0.68rem] text-muted">{u.role}</span></td>
                    <td className="px-3 py-2.5 text-right text-ink tabular-nums">{u.farms}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--viz-track)]">
                          <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: share > 0.9 ? '#d03b3b' : 'var(--viz-1)' }} />
                        </div>
                        <span className="text-muted tabular-nums">{fmtNum(used)}{cap ? ` / ${fmtNum(cap)}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-ink tabular-nums">{fmtNum(Number(u.tokens_30d))}</td>
                    <td className="px-3 py-2.5 text-right text-ink tabular-nums">{money(u.cost_30d, currency)}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {u.devices.length ? u.devices.map((d) => <TokenCell key={d.device_id} token={d.token} />) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{u.last_login_at ? fmtDay(u.last_login_at) : '—'}</td>
                    <td className="px-5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {!u.removed_at && u.id !== me?.id && (
                        <button type="button" onClick={() => setRemoving(u)}
                          className="rounded-md px-2 py-1 text-[0.7rem] font-medium text-danger transition-colors hover:bg-danger/10">
                          {t('remove.action')}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === u.id && (
                    <tr className="border-b border-line/70 bg-canvas/60">
                      <td colSpan={9} className="px-5 py-5"><UserDetail id={u.id} currency={currency} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {removing && (
        <RemoveDialog account={removing} onClose={() => setRemoving(null)}
          onDone={() => { setRemoving(null); clearApiCache(); reload(); }} />
      )}
    </Panel>
  );
}

// ── downloads: the PDF report and two CSV files ──
function ExportMenu({ data, days, range }) {
  const t = useTranslations('admin.export');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const period = `${days[0]}_to_${days[days.length - 1]}`;
  // the PDF: the report renders off-screen, is captured, and downloads as a file
  const [pdfJob, setPdfJob] = useState(null);          // { resolve, reject } while building
  const buildPdf = () => new Promise((resolve, reject) => setPdfJob({ resolve, reject }));
  const onReportReady = async (root) => {
    const job = pdfJob;
    try {
      await downloadReportPdf(root, `FarmXpert operations report ${days[0]} to ${days[days.length - 1]}.pdf`);
      job?.resolve();
    } catch (err) {
      job?.reject(err);
    } finally {
      setPdfJob(null);
    }
  };
  const items = [
    { key: 'pdf', title: t('pdf'), note: t('pdfNote'), run: buildPdf },
    { key: 'daily', title: t('daily'), note: t('dailyNote'), run: () => download(`farmxpert-daily-metrics_${period}.csv`, dailyCsv(data, days)) },
    { key: 'accounts', title: t('accounts'), note: t('accountsNote'), run: async () => {
      const users = await api.get('/admin/users?limit=500');
      download(`farmxpert-accounts_${stamp()}.csv`, accountsCsv(users, data.currency));
    } },
  ];
  const run = async (item) => {
    setBusy(item.key);
    try { await item.run(); } catch { /* the menu stays usable; nothing to download */ } finally { setBusy(null); setOpen(false); }
  };

  return (
    <div ref={root} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} disabled={!data} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-forest px-3.5 text-xs font-medium text-on-forest transition-opacity hover:opacity-90 disabled:opacity-50">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
          <path d="M8 2v8m0 0L4.8 6.8M8 10l3.2-3.2M2.5 11.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t('button')}
      </button>
      {pdfJob && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px] w-[210mm]">
          <AdminReport capture days={range} onReady={onReportReady} />
        </div>
      )}
      {(open || busy) && (
        <div role="menu" className="absolute right-0 z-40 sm:left-0 sm:right-auto mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-lift">
          {items.map((it) => (
            <button key={it.key} type="button" role="menuitem" onClick={() => run(it)} disabled={busy !== null}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-canvas disabled:opacity-60">
              <span className="text-sm font-medium text-ink">{busy === it.key ? t('preparing') : it.title}</span>
              <span className="text-[0.72rem] leading-snug text-muted">{it.note}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminConsole() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [range, setRange] = useState(30);
  const [modelView, setModelView] = useRemembered('fx_admin_model_view', 'bars');
  const { data, loading, error } = useApi(`/admin/analytics?days=${range}`);
  const days = useMemo(() => lastDays(range), [range]);

  if (error) {
    return <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">{t('noAccess')}</p>;
  }
  const k = data?.kpis;
  const cur = data?.currency || 'USD';

  const tokenSeries = data ? PURPOSES.map((p, i) => ({
    key: p.key, label: t(`purpose.${p.key}`), color: SERIES[i],
    values: byDay(data.tokens_by_day.filter((r) => r.purpose === p.key), 'tokens', days),
  })).filter((s) => s.values.some(Boolean)) : [];
  const spendByDay = data ? days.map((d) => data.tokens_by_day.filter((r) => String(r.day).slice(0, 10) === d)
    .reduce((s, r) => s + Number(r.cost || 0), 0)) : [];
  const questions = data ? byDay(data.engagement, 'questions', days) : [];
  const voice = data ? byDay(data.engagement, 'voice', days) : [];
  const farmers = data ? byDay(data.engagement, 'active_farmers', days) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-gold uppercase">{t('eyebrow')}</p>
          <h1 className="mt-1 text-[1.9rem] leading-tight text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('lead', { tz: data?.timezone || 'Asia/Kolkata' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <ExportMenu data={data} days={days} range={range} />
        <div role="radiogroup" aria-label={t('range')} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" role="radio" aria-checked={range === d} onClick={() => setRange(d)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === d ? 'bg-forest text-on-forest' : 'text-muted hover:text-ink')}>
              {t('days', { n: d })}
            </button>
          ))}
        </div>
        </div>
      </header>

      {loading && !data ? (
        <Loading className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <SkeletonCard className="rounded-xl"><SkeletonChart height={240} bars={20} /></SkeletonCard>
            <SkeletonCard className="rounded-xl"><SkeletonChart height={240} bars={5} /></SkeletonCard>
          </div>
        </Loading>
      ) : data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Kpi label={t('kpi.farmers')} value={fmtNum(k.active_farmers.value)} change={k.active_farmers.change}
              sub={t('kpi.accounts', { n: data.totals.users })} spark={farmers} color="var(--viz-1)" />
            <Kpi label={t('kpi.questions')} value={fmtNum(k.questions.value)} change={k.questions.change}
              sub={k.voice_share.value !== null ? t('kpi.voiceShare', { n: k.voice_share.value }) : null} spark={questions} color="var(--viz-1)" />
            <Kpi label={t('kpi.answerRate')} value={k.answer_rate.value === null ? '—' : `${k.answer_rate.value}%`} change={k.answer_rate.change}
              sub={t('kpi.answerRateSub')} />
            <Kpi label={t('kpi.wait')} value={secs(k.p50_ms.value)} change={k.p50_ms.change} invert sub={`p95 ${secs(k.p95_ms.value)}`} />
            <Kpi label={t('kpi.tokens')} value={fmtNum(k.tokens.value)} change={k.tokens.change} invert
              sub={k.tokens_per_question.value ? t('kpi.perQuestion', { n: fmtNum(k.tokens_per_question.value) }) : null}
              spark={tokenSeries.length ? days.map((_, i) => tokenSeries.reduce((s, x) => s + x.values[i], 0)) : null} color="var(--viz-2)" />
            <Kpi label={t('kpi.spend')} value={money(k.cost.value, cur)} change={k.cost.change} invert
              sub={t('kpi.probes', { live: data.totals.devices_live, all: data.totals.devices })} spark={spendByDay} color="var(--viz-2)" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title={t('p.burn')} question={t('p.burnQ')}>
              {tokenSeries.length ? (
                <>
                  <Legend items={tokenSeries} />
                  <div className="mt-3"><TimeChart days={days} series={tokenSeries} stacked /></div>
                </>
              ) : <p className="py-16 text-center text-sm text-faint">{t('p.noTokens')}</p>}
            </Panel>
            <Panel title={t('p.models')} question={t('p.modelsQ')} right={<ViewSwitch value={modelView} onChange={setModelView} />}>
              {modelView === 'pie' ? (
                <Donut rows={spendByModel(data)} totalLabel={t('view.total')} otherLabel={t('view.other')}
                  format={(v) => (v > 0 && v < 0.001 ? `< ${money(0.001, cur)}` : money(v, cur))} />
              ) : (
                <RankBars rows={spendByModel(data)}
                  format={(v) => (v > 0 && v < 0.001 ? `< ${money(0.001, cur)}` : money(v, cur))} color="var(--viz-2)" />
              )}
              <p className="mt-4 text-xs text-faint">{data.billing ? t('p.billed', { time: new Date(data.billing.synced_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) }) : t('p.priced')}</p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title={t('p.engagement')} question={t('p.engagementQ')}>
              <Legend items={[{ label: t('s.questions'), color: 'var(--viz-1)' }, { label: t('kpi.farmers'), color: 'var(--viz-3)' }]} />
              <div className="mt-3">
                <TimeChart days={days} series={[
                  { key: 'q', label: t('s.questions'), color: 'var(--viz-1)', values: questions },
                  { key: 'f', label: t('kpi.farmers'), color: 'var(--viz-3)', values: farmers },
                ]} />
              </div>
            </Panel>
            <Panel title={t('p.textVoice')} question={t('p.textVoiceQ')}>
              <Legend items={[{ label: t('s.typed'), color: 'var(--viz-1)' }, { label: t('s.spoken'), color: 'var(--viz-4)' }]} />
              <div className="mt-3">
                <BarChart days={days} series={[
                  { key: 'text', label: t('s.typed'), color: 'var(--viz-1)', values: questions.map((v, i) => v - voice[i]) },
                  { key: 'voice', label: t('s.spoken'), color: 'var(--viz-4)', values: voice },
                ]} />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Panel title={t('p.latency')} question={t('p.latencyQ')}>
              <Legend items={[{ label: t('s.p50'), color: 'var(--viz-1)' }, { label: t('s.p95'), color: 'var(--viz-2)', dashed: true }]} />
              <div className="mt-3">
                <TimeChart days={days} unit="s" format={(v) => (Math.round(v * 10) / 10).toString()} series={[
                  { key: 'p50', label: t('s.median'), color: 'var(--viz-1)', values: byDay(data.latency, 'p50', days).map((v) => v / 1000) },
                  { key: 'p95', label: 'p95', color: 'var(--viz-2)', dashed: true, values: byDay(data.latency, 'p95', days).map((v) => v / 1000) },
                ]} />
              </div>
            </Panel>
            <Panel title={t('p.agents')} question={t('p.agentsQ')}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-[0.68rem] tracking-wide text-faint uppercase">
                    <th className="py-2 text-left font-medium">{t('col.agent')}</th>
                    <th className="py-2 text-right font-medium">{t('col.runs')}</th>
                    <th className="py-2 pl-3 text-left font-medium">{t('col.success')}</th>
                    <th className="py-2 text-right font-medium">p95</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((a) => {
                    const rate = a.runs ? a.ok / a.runs : 0;
                    const state = rate >= 0.95 ? ['#0ca30c', '●', t('st.healthy')] : rate >= 0.8 ? ['#fab219', '▲', t('st.degraded')] : ['#d03b3b', '■', t('st.failing')];
                    return (
                      <tr key={a.agent} className="border-b border-line/70" title={a.top_error ? t('topError', { e: a.top_error }) : undefined}>
                        <td className="py-2.5 pr-2 text-ink">{t.has(`agents.${a.agent}`) ? t(`agents.${a.agent}`) : a.agent}</td>
                        <td className="py-2.5 text-right text-muted tabular-nums">{a.runs}</td>
                        <td className="py-2.5 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--viz-track)]">
                              <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: state[0] }} />
                            </div>
                            <span className="text-ink tabular-nums">{Math.round(rate * 100)}%</span>
                            <span className="text-[0.65rem] text-muted"><span style={{ color: state[0] }} aria-hidden>{state[1]}</span> {state[2]}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-ink tabular-nums">{secs(a.p95)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title={t('p.when')} question={t('p.whenQ')}>
              <Heatmap cells={data.heatmap} />
            </Panel>
            <Panel title={t('p.intents')} question={t('p.intentsQ')}>
              <RankBars rows={data.intents.map((r) => ({ label: r.intent.replace(/_/g, ' '), value: r.n }))} color="var(--viz-1)" />
            </Panel>
            <Panel title={t('p.languages')} question={t('p.languagesQ')}>
              <RankBars rows={data.languages.map((r) => ({ label: r.language === 'unknown' ? '—' : langName(r.language, locale), value: r.n }))} color="var(--viz-3)" />
            </Panel>
          </div>

          <Panel title={t('p.growth')} question={t('p.growthQ')}>
            <Legend items={[{ label: t('s.onboarded'), color: 'var(--viz-3)' }, { label: t('s.notOnboarded'), color: 'var(--viz-1)' }]} />
            <div className="mt-3">
              <BarChart days={days} height={180} series={[
                { key: 'onb', label: t('s.onboarded'), color: 'var(--viz-3)', values: byDay(data.signups, 'onboarded', days) },
                { key: 'rest', label: t('s.notOnboarded'), color: 'var(--viz-1)',
                  values: days.map((d, i) => byDay(data.signups, 'signups', days)[i] - byDay(data.signups, 'onboarded', days)[i]) },
              ]} />
            </div>
          </Panel>
        </>
      )}

    </div>
  );
}
