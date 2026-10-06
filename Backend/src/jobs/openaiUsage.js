// ============================================================
// FILE: src/jobs/openaiUsage.js
//
// Copies OpenAI's usage and billing into provider_usage_daily and
// provider_costs_daily, so the admin console shows exactly what the
// platform.openai.com dashboard shows. The first run backfills
// OPENAI_USAGE_BACKFILL_DAYS; later runs refresh the last 3 days, since
// OpenAI keeps settling recent usage for a while.
// ============================================================

import { config } from '../config/env.js';
import { costs, openaiUsageConfigured, usage } from '../clients/openaiUsage.js';
import { one, transaction } from '../db/pool.js';
import { logger } from '../lib/logger.js';

const DAY_MS = 86400000;

export async function syncOpenAIUsage({ days } = {}) {
  if (!openaiUsageConfigured()) return { skipped: 'OPENAI_ADMIN_KEY is not set' };
  const have = await one('SELECT count(*)::int AS n FROM provider_costs_daily WHERE provider = $1', ['openai']);
  const span = days ?? (have.n ? 3 : config.openaiUsage.backfillDays);
  const end = Date.now();
  const start = end - span * DAY_MS;

  const [spend, used] = await Promise.all([costs(start, end), usage(start, end)]);
  await transaction(async (db) => {
    for (const c of spend) {
      await db.query(
        `INSERT INTO provider_costs_daily (usage_date, provider, amount, currency, synced_at)
         VALUES ($1, 'openai', $2, $3, now())
         ON CONFLICT (usage_date, provider) DO UPDATE
           SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, synced_at = now()`,
        [c.day, c.amount, c.currency]);
    }
    for (const u of used) {
      await db.query(
        `INSERT INTO provider_usage_daily (usage_date, provider, kind, model, input_tokens, output_tokens,
                                           cached_tokens, audio_tokens, requests, audio_seconds, characters, synced_at)
         VALUES ($1, 'openai', $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
         ON CONFLICT (usage_date, provider, kind, model) DO UPDATE
           SET input_tokens = EXCLUDED.input_tokens, output_tokens = EXCLUDED.output_tokens,
               cached_tokens = EXCLUDED.cached_tokens, audio_tokens = EXCLUDED.audio_tokens,
               requests = EXCLUDED.requests, audio_seconds = EXCLUDED.audio_seconds,
               characters = EXCLUDED.characters, synced_at = now()`,
        [u.day, u.kind, u.model.slice(0, 80), u.input, u.output, u.cached, u.audio, u.requests, u.seconds, u.characters]);
    }
  });
  const result = { days: span, cost_days: spend.length, usage_rows: used.length };
  logger.info(result, 'OpenAI usage synced');
  return result;
}
