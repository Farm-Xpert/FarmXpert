'use client';

// ============================================================
// FILE: src/components/dashboard/SidebarChats.jsx
//
// Recent chats as a dropdown under "Ask" in the sidebar. Typed and voice
// chats alike (a wave marks the spoken ones). A chat opens on the Ask page
// through the URL (?c=<id>); "New chat" clears it (?new=<n>). The list
// refreshes when the Ask page says a chat changed (the `fx-chats` event).
// ============================================================

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AudioLines, Plus } from '@/components/ui/icons';

import { cn } from '@/lib/cn';
import { chatTitle } from '@/lib/chatTitle';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useApi } from '@/hooks/useApi';

const SHOWN = 30;          // the list scrolls inside a short box

export default function SidebarChats() {
  const t = useTranslations('dashboard.assistant.history');
  const search = useSearchParams();
  const pathname = usePathname();
  const onAsk = pathname.startsWith('/dashboard/assistant');
  const current = onAsk ? search.get('c') : null;
  const router = useRouter();
  const { data, loading, reload } = useApi(`/conversations?limit=${SHOWN}`);

  useEffect(() => {
    const again = () => reload();
    window.addEventListener('fx-chats', again);
    return () => window.removeEventListener('fx-chats', again);
  }, [reload]);

  const items = data?.items || [];
  return (
    <div className="relative mt-1 mb-2 ml-[1.35rem] border-l border-[var(--sb-line)] pl-3">
      <button type="button" onClick={() => router.push(`/dashboard/assistant?new=${Date.now()}`)}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.8rem] text-[var(--sb-muted)] transition-colors hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]">
        <Plus className="size-3.5 text-[var(--sb-gold)]" strokeWidth={1.8} aria-hidden />
        {t('new')}
      </button>
      {loading && !data ? (
        <div className="space-y-1.5 px-2.5 py-1.5" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-3 animate-pulse rounded-full bg-[var(--sb-hover)]" style={{ width: `${80 - i * 15}%` }} />)}
        </div>
      ) : items.length === 0 ? (
        <p className="px-2.5 py-1.5 text-[0.76rem] text-[var(--sb-faint)]">{t('empty')}</p>
      ) : (
        <ul className="no-scrollbar max-h-56 space-y-px overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,#000_85%,transparent)] pb-3">
          {items.map((c) => {
            const on = c.id === current;
            // older voice chats were saved with the 'app' channel; their placeholder title gives them away
                const voice = c.channel === 'voice' || c.title === 'Voice question';
            const full = c.title && c.title !== 'Voice question' ? c.title : voice ? t('voice') : t('untitled');
                const title = chatTitle(full, { fallback: full });
            return (
              <li key={c.id}>
                <Link href={`/dashboard/assistant?c=${c.id}`} title={full} aria-current={on ? 'true' : undefined}
                  className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.8rem] transition-colors',
                    on ? 'bg-[var(--sb-hover)] text-[var(--sb-text)]' : 'text-[var(--sb-muted)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text)]')}>
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                  {voice && <AudioLines className="size-3 shrink-0 text-[var(--sb-faint)]" aria-label={t('voice')} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
