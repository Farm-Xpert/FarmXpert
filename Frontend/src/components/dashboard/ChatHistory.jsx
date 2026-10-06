'use client';

// ============================================================
// FILE: src/components/dashboard/ChatHistory.jsx
//
// The farmer's past conversations on the Ask page - typed chats and voice
// sessions alike (a mic marks the spoken ones). Grouped Today / Yesterday /
// Earlier; picking one reopens it in the thread, "New chat" starts fresh.
// Shown as a rail beside the thread on wide screens, and as a panel under
// a "Chats" button on smaller ones.
// ============================================================

import { useTranslations } from 'next-intl';
import { AudioLines, MessagesSquare, Plus } from '@/components/ui/icons';

import { cn } from '@/lib/cn';
import { chatTitle } from '@/lib/chatTitle';
import { Skeleton } from '@/components/ui/primitives';
import { useFormat } from './widgets';

function dayGroup(iso) {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= start) return 'today';
  if (d.getTime() >= start - 86400000) return 'yesterday';
  if (d.getTime() >= start - 6 * 86400000) return 'week';
  return 'earlier';
}

export default function ChatHistory({ items, loading, activeId, onPick, onNew, className }) {
  const t = useTranslations('dashboard.assistant.history');
  const f = useFormat();
  const groups = ['today', 'yesterday', 'week', 'earlier']
    .map((g) => ({ g, rows: (items || []).filter((c) => dayGroup(c.last_message_at) === g) }))
    .filter((x) => x.rows.length);

  return (
    <nav aria-label={t('title')} className={cn('flex min-h-0 flex-col', className)}>
      <button type="button" onClick={onNew}
        className="mb-5 flex h-10 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:border-leaf/40">
        <Plus className="size-4 text-leaf" aria-hidden />
        {t('new')}
      </button>

      <p className="mb-2 px-2 text-[0.66rem] font-medium tracking-[0.18em] text-faint uppercase">{t('title')}</p>
      <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {loading && !items ? (
          <div className="space-y-2" role="status" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
          </div>
        ) : !groups.length ? (
          <p className="flex items-center gap-2 px-2 py-3 text-sm text-faint">
            <MessagesSquare className="size-4" aria-hidden />{t('empty')}
          </p>
        ) : groups.map(({ g, rows }) => (
          <div key={g} className="mb-4">
            <p className="mb-1 px-2 text-[0.7rem] text-faint">{t(g)}</p>
            <ul className="space-y-0.5">
              {rows.map((c) => {
                // older voice chats were saved with the 'app' channel; their placeholder title gives them away
                const voice = c.channel === 'voice' || c.title === 'Voice question';
                const on = c.id === activeId;
                const full = c.title && c.title !== 'Voice question' ? c.title : voice ? t('voice') : t('untitled');
                const title = chatTitle(full, { fallback: full });
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => onPick(c)} aria-current={on ? 'true' : undefined}
                      title={full}
                      className={cn('group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[0.86rem] transition-colors',
                        on ? 'bg-sage text-ink' : 'text-muted hover:bg-raised hover:text-ink')}>
                      {voice
                        ? <AudioLines className={cn('size-3.5 shrink-0', on ? 'text-leaf' : 'text-faint')} aria-label={t('voice')} />
                        : <span className={cn('size-1.5 shrink-0 rounded-full', on ? 'bg-leaf' : 'bg-line')} aria-hidden />}
                      <span className="min-w-0 flex-1 truncate">{title}</span>
                      <span className="shrink-0 text-[0.68rem] text-faint tabular-nums">
                        {g === 'today' ? f.date(c.last_message_at, { hour: 'numeric', minute: '2-digit' }) : f.date(c.last_message_at, { day: 'numeric', month: 'short' })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
