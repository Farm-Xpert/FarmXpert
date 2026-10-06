'use client';

// ============================================================
// FILE: src/components/Footer.jsx
//
// The site footer: deep forest green with faint leaf artwork in two corners.
// Logo and a short promise on the left, then Product (the navbar's own page
// list, so the two never drift apart), Resources, Account and Get in touch.
// The bottom row: copyright, "Made in India, for Indian farms" with the note
// about the advice, and the legal
// links. The current page's link is marked, the year is always current and
// every label is translated.
// ============================================================

import { useTranslations } from 'next-intl';
import { Clock, Mail, MessageSquareText } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { LogoMark, Wordmark } from '@/components/ui/Logo';
import { PAGES } from '@/components/Navbar';

const SUPPORT = 'support@farmxpert.in';

export default function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('navbar');
  const pathname = usePathname();
  const current = (href) => (pathname === href ? 'page' : undefined);

  const columns = [
    { title: t('cols.product'), links: PAGES.map((p) => ({ href: p.href, label: nav(p.key) })) },
    { title: t('cols.resources'), links: [
      { href: '/docs', label: t('links.docs') },
      { href: '/contact', label: t('links.contact') },
    ] },
    { title: t('cols.account'), links: [
      { href: '/auth/login', label: t('links.login') },
      { href: '/auth/register', label: t('links.register') },
    ] },
  ];

  return (
    <footer className="site-footer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/botanical/leaf-branch.svg" alt="" aria-hidden className="site-footer-leaf is-top" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/botanical/olive-twig.svg" alt="" aria-hidden className="site-footer-leaf is-bottom" />

      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo" aria-label="FarmXpert - home">
            <LogoMark className="site-footer-mark" />
            <Wordmark className="site-footer-word" />
          </Link>
          <p className="site-footer-tagline">{t('tagline')}</p>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="site-footer-col" role="navigation" aria-label={col.title}>
            <p className="site-footer-title">{col.title}</p>
            <ul>
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href} aria-current={current(l.href)}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}

        <div className="site-footer-col">
          <p className="site-footer-title">{t('cols.contact')}</p>
          <ul className="site-footer-contact">
            <li><Mail aria-hidden /><a href={`mailto:${SUPPORT}`}>{SUPPORT}</a></li>
            <li><MessageSquareText aria-hidden /><Link href="/contact" aria-current={current('/contact')}>{t('contact.form')}</Link></li>
            <li><Clock aria-hidden /><span>{t('contact.hours')}</span></li>
          </ul>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        <p className="site-footer-note">{t('contact.place')} {t('and')} {t('note')}</p>
        <p className="site-footer-legal">
          <Link href="/privacy" aria-current={current('/privacy')}>{t('links.privacy')}</Link>
          <Link href="/terms" aria-current={current('/terms')}>{t('links.terms')}</Link>
        </p>
      </div>
    </footer>
  );
}
