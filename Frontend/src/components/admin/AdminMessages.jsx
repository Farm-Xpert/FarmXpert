'use client';

// ============================================================
// FILE: src/components/admin/AdminMessages.jsx
//
// The inbox for the website's contact form. New / Read / Replied tabs with
// counts; open a message to read it in full. Opening marks it read, "Reply
// by email" opens the admin's mail app addressed to the sender, and it can
// then be marked replied (or back to new).
// ============================================================

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { Loading, SkeletonList } from '@/components/ui/skeletons';

const TABS = ['new', 'read', 'replied', 'all'];

export default function AdminMessages() {
  const t = useTranslations('admin.messages');
  const locale = useLocale();
  const [tab, setTab] = useState('new');
  const [open, setOpen] = useState(null);
  const { data, loading, reload } = useApi(`/admin/messages?status=${tab}`);
  const counts = data?.counts || {};
  const when = (d) => new Date(d).toLocaleString(locale === 'en' ? 'en-IN' : `${locale}-IN`, { dateStyle: 'medium', timeStyle: 'short' });

  const setStatus = async (m, status) => {
    try {
      await api.patch(`/admin/messages/${m.id}`, { status });
    } catch { /* keep the list as it is; the reload shows the real state */ }
    reload();
  };
  const toggle = (m) => {
    const next = open === m.id ? null : m.id;
    setOpen(next);
    if (next && m.status === 'new') setStatus(m, 'read');     // opening a new message reads it
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-gold uppercase">{t('eyebrow')}</p>
          <h1 className="mt-1 text-[1.9rem] leading-tight text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('lead')}</p>
        </div>
        <div role="tablist" aria-label={t('filter')} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpen(null); }}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                tab === k ? 'bg-forest text-on-forest' : 'text-muted hover:text-ink')}>
              {t(`tabs.${k}`)}
              {k !== 'all' && counts[k] > 0 && (
                <span className={cn('rounded-full px-1.5 text-[0.65rem] tabular-nums', tab === k ? 'bg-white/20' : 'bg-canvas')}>{counts[k]}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        {loading && !data ? (
          <Loading className="px-5"><SkeletonList rows={5} /></Loading>
        ) : !data?.items.length ? (
          <p className="px-5 py-14 text-center text-sm text-faint">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => toggle(m)} aria-expanded={open === m.id}
                  className={cn('flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-canvas', open === m.id && 'bg-canvas')}>
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', m.status === 'new' ? 'bg-leaf' : 'bg-transparent')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className={cn('text-sm text-ink', m.status === 'new' && 'font-semibold')}>{m.name}</span>
                      <span className="text-xs text-faint">{m.email}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.82rem] text-muted">{m.message}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block rounded-md bg-canvas px-1.5 py-0.5 text-[0.66rem] text-muted">{t(`topics.${m.topic}`)}</span>
                    <span className="mt-1 block text-[0.7rem] text-faint tabular-nums">{when(m.created_at)}</span>
                  </span>
                </button>
                {open === m.id && (
                  <div className="border-t border-line/70 bg-canvas/60 px-5 py-4 pl-10">
                    <p className="text-[0.88rem] leading-relaxed whitespace-pre-wrap text-ink">{m.message}</p>
                    <p className="mt-3 text-xs text-faint">
                      {t('ref')} {m.id.slice(0, 8).toUpperCase()}{m.phone ? ` · ${m.phone}` : ''}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to FarmXpert (${m.id.slice(0, 8).toUpperCase()})`)}`}
                        onClick={() => m.status !== 'replied' && setStatus(m, 'replied')}
                        className="rounded-full bg-forest px-4 py-1.5 text-xs font-medium text-on-forest hover:opacity-90">{t('reply')}</a>
                      {m.status !== 'replied' && (
                        <button type="button" onClick={() => setStatus(m, 'replied')}
                          className="rounded-full border border-line px-4 py-1.5 text-xs text-ink hover:bg-surface">{t('markReplied')}</button>
                      )}
                      {m.status !== 'new' && (
                        <button type="button" onClick={() => setStatus(m, 'new')}
                          className="rounded-full border border-line px-4 py-1.5 text-xs text-muted hover:bg-surface">{t('markNew')}</button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
