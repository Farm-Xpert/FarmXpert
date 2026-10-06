'use client';

// ============================================================
// FILE: src/components/auth/LegalDialog.jsx
//
// The Terms of Service or Privacy Policy in a pop-up, opened from the
// sign-up checkbox so the farmer can read them without leaving the form.
// Same text as the /terms and /privacy pages (legalContent.js), with a
// link to the full page. Esc, the close button or the backdrop close it.
// ============================================================

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useLocale } from 'next-intl';

import { legal } from '@/components/marketing/legalContent';
import LegalBody from '@/components/marketing/LegalBody';


export default function LegalDialog({ doc, onClose, closeLabel = 'Close', fullLabel = 'Open the full page' }) {
  const panel = useRef(null);
  const locale = useLocale();
  const { doc: text, ui, updated } = doc ? legal(doc, locale) : {};
  const d = text ? { ...text, href: `/${doc}` } : null;

  useEffect(() => {
    if (!d) return undefined;
    const before = document.activeElement;
    panel.current?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';                // the page behind does not scroll
    document.documentElement.classList.add('fx-modal-open'); // and its animations rest (see auth.css, RootVine)
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = overflow;
      document.documentElement.classList.remove('fx-modal-open');
      before?.focus?.();                                    // back to the link that opened it
    };
  }, [doc, onClose]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per opened document

  if (!d) return null;
  // rendered at the app's root: inside the animated auth card, "fixed" would be
  // trapped in the card instead of covering the screen
  const host = document.querySelector('.fx-app') || document.body;
  return createPortal((
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="legal-title">
      <button type="button" aria-label={closeLabel} onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div ref={panel} tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift outline-none sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
          <div>
            <p className="text-[0.66rem] font-semibold tracking-[0.2em] text-gold uppercase">{d.eyebrow}</p>
            <h2 id="legal-title" className="mt-1 text-[1.5rem] leading-tight text-ink">{d.crumb}</h2>
            <p className="mt-1 text-xs text-faint">{ui.lastUpdated} {updated}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain px-6 py-5 [transform:translateZ(0)] [-webkit-overflow-scrolling:touch]">
          <p className="mb-5 text-sm leading-relaxed text-muted">{d.lead}</p>
          <ol className="space-y-4">
            {d.sections.map(([title, body], i) => (
              <li key={title}>
                <h3 className="text-[0.92rem] font-semibold text-ink">
                  <span className="mr-2 text-leaf tabular-nums">{String(i + 1).padStart(2, '0')}</span>{title}
                </h3>
                <div className="mt-1 space-y-2 text-[0.86rem] leading-relaxed text-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                  <LegalBody body={body} />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-line px-6 py-3.5">
          <a href={d.href} target="_blank" rel="noopener" className="text-sm text-leaf underline-offset-2 hover:underline">{fullLabel} ↗</a>
          <button type="button" onClick={onClose}
            className="rounded-full bg-forest px-5 py-2 text-sm font-medium text-on-forest transition-opacity hover:opacity-90">{closeLabel}</button>
        </footer>
      </div>
    </div>
  ), host);
}
