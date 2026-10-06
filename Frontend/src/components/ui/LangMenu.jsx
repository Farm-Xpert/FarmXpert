'use client';

// ============================================================
// FILE: src/components/ui/LangMenu.jsx
//
// The language picker for the home page and the auth screens: a button
// with the current language, and a small styled menu listing each
// language in its own script (the native <select> popup cannot be
// styled and looked out of place). Each surface styles it through its
// own class prefix: `${cls}`, `${cls}__btn`, `${cls}__menu`, `${cls}__item`.
// Keyboard: arrows move, Enter picks, Esc closes.
// ============================================================

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';

export default function LangMenu({ cls, icon = null, keepQuery = true }) {
  const t = useTranslations('languageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef(null);
  const items = useRef([]);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  useEffect(() => { if (open) items.current[focus]?.focus(); }, [open, focus]);

  const pick = (code) => {
    setOpen(false);
    if (code === locale) return;
    const q = keepQuery ? search.toString() : '';
    start(() => router.replace(q ? `${pathname}?${q}` : pathname, { locale: code }));
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((i) => (i + 1) % locales.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((i) => (i - 1 + locales.length) % locales.length); }
  };

  return (
    <div ref={root} className={cls} data-open={open || undefined} data-pending={pending || undefined} onKeyDown={onKey}>
      <button type="button" className={`${cls}__btn`} disabled={pending}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`${t('label')}: ${t(locale)}`}
        onClick={() => { setFocus(Math.max(0, locales.indexOf(locale))); setOpen((v) => !v); }}>
        {icon}
        <span className={`${cls}__current`}>{t(locale)}</span>
        <svg className={`${cls}__chev`} viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className={`${cls}__menu`} role="listbox" aria-label={t('label')}>
          {locales.map((code, i) => (
            <li key={code} role="presentation">
              <button type="button" role="option" aria-selected={code === locale} lang={code}
                ref={(el) => { items.current[i] = el; }}
                className={`${cls}__item${code === locale ? ' is-active' : ''}`} onClick={() => pick(code)}>
                <span className={`${cls}__name`}>{t(code)}</span>
                {code === locale && (
                  <svg className={`${cls}__check`} viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
