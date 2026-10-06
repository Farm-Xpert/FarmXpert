// ============================================================
// FILE: src/clients/openaiUsage.js
//
// OpenAI's own record of what this organisation used and was billed, from
// the Usage and Costs API - the same numbers the platform.openai.com
// dashboard shows. Needs an *admin* key (Settings > Organization > Admin
// keys), not the normal API key. Optionally narrowed to one project.
//
//   costs(start, end)  -> [{ day, amount, currency }]           billed money
//   usage(start, end)  -> [{ day, model, kind, input, output,   tokens, audio,
//                            requests, seconds, characters }]    requests
// Days are UTC, as OpenAI buckets them.
// ============================================================

import { config } from '../config/env.js';

const BASE = 'https://api.openai.com/v1/organization';
const DAY = 86400;

export const openaiUsageConfigured = () => Boolean(config.openaiUsage.adminKey);

// OPENAI_PROJECT_ID may hold a project id (proj_...) or an API key id (key_...).
// A key id narrows usage to exactly the key FarmXpert calls with; OpenAI's costs
// endpoint cannot filter by key, so billed money is then the whole organisation's.
const scope = () => {
  const id = config.openaiUsage.projectId;
  if (!id) return {};
  return id.startsWith('key_') ? { key: id } : { project: id };
};

async function pages(path, params) {
  const out = [];
  let page = null;
  const { key, project } = scope();
  do {
    const q = new URLSearchParams({ bucket_width: '1d', limit: '31', ...params });
    if (project) q.append('project_ids[]', project);
    if (key && path.startsWith('/usage/')) q.append('api_key_ids[]', key);
    if (page) q.set('page', page);
    const res = await fetch(`${BASE}${path}?${q}`, {
      headers: { Authorization: `Bearer ${config.openaiUsage.adminKey}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI ${path} ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    out.push(...(json.data || []));
    page = json.has_more ? json.next_page : null;
  } while (page);
  return out;
}

const dayOf = (bucket) => new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
const range = (start, end) => ({ start_time: String(Math.floor(start / 1000)), end_time: String(Math.ceil(end / 1000) + DAY) });

export async function costs(start, end) {
  const buckets = await pages('/costs', range(start, end));
  return buckets.map((b) => ({
    day: dayOf(b),
    amount: (b.results || []).reduce((s, r) => s + Number(r.amount?.value || 0), 0),
    currency: (b.results || [])[0]?.amount?.currency || 'usd',
  }));
}

// every kind of usage the app makes: chat, embeddings, speech both ways
const KINDS = {
  completions: '/usage/completions',
  embeddings: '/usage/embeddings',
  speech: '/usage/audio_speeches',
  transcription: '/usage/audio_transcriptions',
};

export async function usage(start, end) {
  const rows = [];
  for (const [kind, path] of Object.entries(KINDS)) {
    const buckets = await pages(path, { ...range(start, end), 'group_by[]': 'model' });
    for (const b of buckets) {
      for (const r of b.results || []) {
        rows.push({
          day: dayOf(b),
          kind,
          model: r.model || 'unknown',
          input: Number(r.input_tokens || 0),
          output: Number(r.output_tokens || 0),
          cached: Number(r.input_cached_tokens || 0),
          audio: Number(r.input_audio_tokens || 0) + Number(r.output_audio_tokens || 0),
          requests: Number(r.num_model_requests || 0),
          seconds: Number(r.seconds || 0),
          characters: Number(r.characters || 0),
        });
      }
    }
  }
  return rows;
}
