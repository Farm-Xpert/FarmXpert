'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, Languages } from '@/components/ui/icons';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';
import { cn } from '@/lib/cn';

/**
 * Language picker for the app screens (the landing page has its own).
 * A button with the current language; a small menu lists every language in
 * its own script. `placement="up"` opens above (for the sidebar footer).
 */
export default function LocaleSelect({ className, placement = 'down' }) {
  const t = useTranslations('languageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = (code) => {
    setOpen(false);
    if (code === locale) return;
    const query = search.toString();
    start(() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: code }));
  };

  return (
    <div ref={root} className={cn('fx-locale relative', className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} disabled={pending}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`${t('label')}: ${t(locale)}`}
        className="fx-locale-btn flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[0.82rem] font-medium transition-colors">
        <Languages className="size-4 shrink-0 opacity-70" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{t(locale)}</span>
        <span className={cn('text-[0.6rem] opacity-60 transition-transform', open && 'rotate-180', placement === 'up' && 'rotate-180', open && placement === 'up' && 'rotate-0')} aria-hidden>▾</span>
      </button>

      {open && (
        <ul role="listbox" aria-label={t('label')}
          className={cn('absolute left-0 z-50 min-w-[8.5rem] overflow-hidden rounded-xl border border-line bg-surface p-1 text-ink shadow-[0_18px_40px_-12px_rgba(0,0,0,.35)]',
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2')}>
          <li className="px-2.5 pt-1.5 pb-1 text-[0.62rem] font-medium tracking-[0.18em] text-faint uppercase" aria-hidden>{t('label')}</li>
          {locales.map((code) => {
            const on = code === locale;
            return (
              <li key={code} role="option" aria-selected={on}>
                <button type="button" onClick={() => pick(code)} lang={code}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    on ? 'bg-sage font-medium text-ink' : 'text-muted hover:bg-canvas hover:text-ink')}>
                  <span className="flex-1">{t(code)}</span>
                  {on && <Check className="size-4 text-leaf" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
