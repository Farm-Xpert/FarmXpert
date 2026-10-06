/**
 * The website's contact form.
 *
 *   POST  /contact                    (public)  save, email support, confirm to the sender
 *   GET   /admin/messages?status=     (admin)   the inbox, newest first, with counts
 *   PATCH /admin/messages/:id         (admin)   { status: 'new' | 'read' | 'replied' }
 *
 * The public form is guarded: validated, length-limited fields, a hidden
 * "website" field that people never fill but bots do, a minimum time on the
 * page, and 5 messages per 15 minutes per visitor. Every message is kept in
 * contact_messages, so nothing is lost if an email fails.
 */

import { Router } from 'express';

import { one, query } from '../db/pool.js';
import { notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { rateLimit } from '../lib/rateLimit.js';
import { idParam, validate } from '../lib/validate.js';
import { requireAdmin } from './admin.js';
import { sendContactAck, sendContactMessage } from './auth/mail.js';

export const contactRoutes = Router();

export const TOPICS = ['general', 'support', 'account', 'sensor', 'partnership', 'press', 'privacy'];
const STATUSES = ['new', 'read', 'replied'];
const limit = rateLimit({ limit: 5, windowMs: 15 * 60_000, name: 'contact' });

contactRoutes.post('/contact', limit, validate({
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 80 },
      email: { type: 'string', format: 'email', maxLength: 160 },
      phone: { type: 'string', maxLength: 20 },
      topic: { enum: TOPICS },
      message: { type: 'string', minLength: 10, maxLength: 3000 },
      language: { enum: ['en', 'hi', 'gu'] },
      website: { type: 'string', maxLength: 200 },          // honeypot: must stay empty
      elapsed_ms: { type: 'integer', minimum: 0 },          // time spent on the form
    },
    required: ['name', 'email', 'topic', 'message'],
  },
}), async (req, res) => {
  const b = req.body;
  // A bot fills every field, or posts instantly: accept quietly and drop it.
  if (b.website || (b.elapsed_ms !== undefined && b.elapsed_ms < 2500)) {
    logger.info({ ip: req.ip }, 'Contact form: dropped as automated');
    return res.status(202).json({ ok: true });
  }
  const msg = { name: b.name.trim(), email: b.email.trim().toLowerCase(), phone: b.phone?.trim() || null, topic: b.topic, message: b.message.trim() };
  const saved = await one(
    `INSERT INTO contact_messages (name, email, phone, topic, message, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [msg.name, msg.email, msg.phone, msg.topic, msg.message, req.ip?.slice(0, 64) || null, (req.get('user-agent') || '').slice(0, 300) || null]);

  // emails are queued, not awaited: the message is already safe in the database
  void Promise.all([
    sendContactMessage({ ...msg, id: saved.id }),
    sendContactAck({ ...msg, id: saved.id, language: b.language || 'en' }),
  ]);
  res.status(202).json({ ok: true, reference: saved.id.slice(0, 8).toUpperCase() });
});

// ── admin inbox ─────────────────────────────────────────────────────────────

contactRoutes.get('/admin/messages', requireAdmin, validate({
  query: { type: 'object', properties: {
    status: { enum: [...STATUSES, 'all'] },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
  } },
}), async (req, res) => {
  const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;
  const [items, counts] = await Promise.all([
    query(
      `SELECT id, created_at, name, email, phone, topic, message, status, handled_at
         FROM contact_messages WHERE ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC LIMIT $2`, [status, req.query.limit ?? 100]),
    query('SELECT status, count(*)::int AS n FROM contact_messages GROUP BY status'),
  ]);
  res.json({
    items: items.rows,
    counts: Object.fromEntries(STATUSES.map((s) => [s, counts.rows.find((r) => r.status === s)?.n || 0])),
  });
});

contactRoutes.patch('/admin/messages/:id', requireAdmin, validate({
  params: idParam,
  body: { type: 'object', additionalProperties: false, properties: { status: { enum: STATUSES } }, required: ['status'] },
}), async (req, res) => {
  const row = await one(
    `UPDATE contact_messages
        SET status = $2::text, handled_at = CASE WHEN $2::text = 'new' THEN NULL ELSE now() END, handled_by = $3
      WHERE id = $1 RETURNING id, status, handled_at`,
    [req.params.id, req.body.status, req.user?.id ?? null]);
  if (!row) throw notFound('Message');
  res.json(row);
});
