// ============================================================
// FILE: src/components/admin/exports.js
//
// The admin console's downloads, built from the same data it shows:
//   daily metrics CSV   one row per day: questions, voice, farmers,
//                       tokens by purpose, spend, wait times, sign-ups
//   accounts CSV        one row per account: usage against the limit,
//                       30-day tokens and spend, farms, probes
//   insights()          the plain-language findings the PDF report leads with
// Sensor tokens are masked in files: a download can travel further than
// the screen it came from.
// ============================================================

import { toCsv } from '@/lib/csv';

const PURPOSES = ['chat', 'embedding', 'transcription', 'speech'];
const round = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? '' : Math.round(v * 10 ** d) / 10 ** d);
const dayOf = (v) => String(v).slice(0, 10);

export function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** One row per day of the period, every metric the charts show. */
export function dailyRows(data, days) {
  const by = (rows, key) => new Map((rows || []).map((r) => [dayOf(r.day), r[key]]));
  const q = by(data.engagement, 'questions');
  const v = by(data.engagement, 'voice');
  const f = by(data.engagement, 'active_farmers');
  const p50 = by(data.latency, 'p50');
  const p95 = by(data.latency, 'p95');
  const su = by(data.signups, 'signups');
  const on = by(data.signups, 'onboarded');
  return days.map((d) => {
    const burn = (data.tokens_by_day || []).filter((r) => dayOf(r.day) === d);
    const tokens = Object.fromEntries(PURPOSES.map((p) => [p, burn.filter((r) => r.purpose === p).reduce((s, r) => s + Number(r.tokens || 0), 0)]));
    const questions = Number(q.get(d) || 0);
    const voice = Number(v.get(d) || 0);
    return {
      date: d,
      questions,
      typed: questions - voice,
      spoken: voice,
      active_farmers: Number(f.get(d) || 0),
      tokens_total: PURPOSES.reduce((s, p) => s + tokens[p], 0),
      ...Object.fromEntries(PURPOSES.map((p) => [`tokens_${p}`, tokens[p]])),
      spend: round(burn.reduce((s, r) => s + Number(r.cost || 0), 0), 4),
      median_wait_s: p50.has(d) ? round(Number(p50.get(d)) / 1000, 1) : '',
      slowest_5pct_wait_s: p95.has(d) ? round(Number(p95.get(d)) / 1000, 1) : '',
      new_accounts: Number(su.get(d) || 0),
      onboarded: Number(on.get(d) || 0),
    };
  });
}

export function dailyCsv(data, days) {
  const cur = data.currency || 'USD';
  return toCsv(dailyRows(data, days), [
    { key: 'date', label: 'Date' },
    { key: 'questions', label: 'Questions answered' },
    { key: 'typed', label: 'Typed questions' },
    { key: 'spoken', label: 'Spoken questions' },
    { key: 'active_farmers', label: 'Active farmers' },
    { key: 'tokens_total', label: 'AI tokens (total)' },
    { key: 'tokens_chat', label: 'Tokens: chat (understand + answer)' },
    { key: 'tokens_embedding', label: 'Tokens: knowledge search' },
    { key: 'tokens_transcription', label: 'Tokens: speech to text' },
    { key: 'tokens_speech', label: 'Tokens: text to speech' },
    { key: 'spend', label: `AI spend (${cur})` },
    { key: 'median_wait_s', label: 'Median wait (seconds)' },
    { key: 'slowest_5pct_wait_s', label: 'Slowest 5% wait (seconds)' },
    { key: 'new_accounts', label: 'New accounts' },
    { key: 'onboarded', label: 'Finished farm setup' },
  ]);
}

const mask = (token) => (token ? `••••${String(token).slice(-4)}` : '');

export function accountsCsv(users, currency = 'USD') {
  const limit = users.default_daily_limit || 0;
  return toCsv(users.items || [], [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Mobile' },
    { key: 'role', label: 'Role' },
    { key: 'farms', label: 'Farms' },
    { label: 'Tokens today', value: (u) => Number(u.tokens_today || 0) },
    { label: 'Daily token limit', value: (u) => u.token_daily_limit ?? limit ?? '' },
    { label: 'Limit used today (%)', value: (u) => { const cap = u.token_daily_limit ?? limit; return cap ? round((Number(u.tokens_today || 0) / cap) * 100, 1) : ''; } },
    { label: 'Tokens, last 30 days', value: (u) => Number(u.tokens_30d || 0) },
    { label: `AI spend, last 30 days (${currency})`, value: (u) => round(Number(u.cost_30d || 0), 4) },
    { label: 'Soil probes', value: (u) => (u.devices || []).length },
    { label: 'Probe tokens (masked)', value: (u) => (u.devices || []).map((d) => mask(d.token)).join(' ') },
    { label: 'Last login', value: (u) => (u.last_login_at ? String(u.last_login_at).replace('T', ' ').slice(0, 16) : 'never') },
  ]);
}

// ── insights for the report ─────────────────────────────────────────────────

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Short, factual sentences, each computed from the data - no guesses. */
export function insights(data, fmt) {
  const out = [];
  const k = data.kpis;
  const burn = data.tokens_by_day || [];
  const total = burn.reduce((s, r) => s + Number(r.tokens || 0), 0);
  if (total) {
    const byPurpose = PURPOSES.map((p) => [p, burn.filter((r) => r.purpose === p).reduce((s, r) => s + Number(r.tokens || 0), 0)])
      .sort((a, b) => b[1] - a[1]);
    const label = { chat: 'answering questions', embedding: 'knowledge search', transcription: 'speech to text', speech: 'text to speech' };
    out.push(`${pct(byPurpose[0][1], total)}% of AI tokens went to ${label[byPurpose[0][0]]}.`);
  }
  if (k.questions.value) {
    out.push(`${fmt.num(k.questions.value)} questions from ${fmt.num(k.active_farmers.value)} active farmers`
      + (k.voice_share.value ? `, ${k.voice_share.value}% of them spoken.` : ', all typed.'));
  }
  if (k.cost.value && k.questions.value) {
    out.push(`Each answer cost about ${fmt.money(k.cost.value / k.questions.value)} in AI usage.`);
  }
  if (k.p50_ms.value != null) {
    out.push(`A typical answer took ${(k.p50_ms.value / 1000).toFixed(1)} s; the slowest 5% took over ${((k.p95_ms.value || 0) / 1000).toFixed(1)} s.`);
  }
  const weak = (data.agents || []).filter((a) => a.runs && a.ok / a.runs < 0.95);
  if (weak.length) {
    out.push(`Needs attention: ${weak.map((a) => `${fmt.agent(a.agent)} (${pct(a.ok, a.runs)}% success)`).join(', ')}.`);
  } else if ((data.agents || []).length) {
    out.push('Every expert agent answered at least 95% of its runs.');
  }
  const busiest = [...(data.heatmap || [])].sort((a, b) => b.n - a.n)[0];
  if (busiest) out.push(`Busiest time: ${WEEKDAYS[busiest.dow - 1]}s around ${String(busiest.hour).padStart(2, '0')}:00.`);
  const topIntent = (data.intents || [])[0];
  if (topIntent) out.push(`Most asked about: ${String(topIntent.intent).replace(/_/g, ' ')} (${fmt.num(topIntent.n)} questions).`);
  return out;
}
