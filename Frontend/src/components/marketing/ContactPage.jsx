'use client';

// ============================================================
// FILE: src/components/marketing/ContactPage.jsx
//
// /contact - the website's contact form, in the marketing pages' look.
// The form posts to the API (/contact), which emails the support inbox
// with the sender as Reply-To. Beside it: the address, response times and
// where to go for farm questions. A hidden field and the time spent on the
// form keep bots out without a captcha.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { ApiError, api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import useLandingEffects from './useLandingEffects';
import '@/styles/pages.css';

const TOPICS = ['general', 'support', 'account', 'sensor', 'partnership', 'press', 'privacy'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  useLandingEffects();
  const t = useTranslations('contact');
  const locale = useLocale();
  const [reference, setReference] = useState(null);
  const opened = useRef(0);
  useEffect(() => { opened.current = Date.now(); }, []);   // when the form was opened (bots post at once)
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: 'general', message: '', website: '' });
  const [problems, setProblems] = useState({});
  const [state, setState] = useState('idle');                 // idle | sending | sent | error
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = t('errors.name');
    if (!EMAIL.test(form.email.trim())) next.email = t('errors.email');
    if (form.message.trim().length < 10) next.message = t('errors.message');
    setProblems(next);
    if (Object.keys(next).length) return;
    setState('sending');
    try {
      await api.post('/contact', {
        name: form.name.trim(), email: form.email.trim(), topic: form.topic, message: form.message.trim(),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.website && { website: form.website }),
        elapsed_ms: Date.now() - opened.current,
        language: ['en', 'hi', 'gu'].includes(locale) ? locale : 'en',
      }).then((r) => setReference(r?.reference || null));
      setState('sent');
    } catch (err) {
      setState(err instanceof ApiError && err.status === 429 ? 'limited' : 'error');
    }
  };

  return (
    <>
      <Navbar />
      <main className="page-main">
        <header className="page-hero">
          <div className="page-hero-grid" aria-hidden />
          <div className="page-hero-glow" aria-hidden />
          <div className="section-container page-hero-inner">
            <nav className="page-crumbs" aria-label="Breadcrumb">
              <Link href="/">{t('home')}</Link><span aria-hidden>/</span><span aria-current="page">{t('crumb')}</span>
            </nav>
            <div className="section-eyebrow">{t('eyebrow')}</div>
            <h1 className="page-title">{t('title.before')} <span className="text-green">{t('title.accent')}</span></h1>
            <p className="page-lead">{t('lead')}</p>
          </div>
        </header>

        <section className="page-section is-base">
          <div className="section-container contact-layout">
            <div className="contact-card">
              {state === 'sent' ? (
                <div className="contact-done" role="status">
                  <div className="contact-done-mark" aria-hidden>✓</div>
                  <h2>{t('sent.title')}</h2>
                  <p>{t('sent.text', { email: form.email.trim() })}</p>
                  {reference && <p className="contact-ref">{t('sent.reference')} <b>{reference}</b></p>}
                  <button type="button" className="contact-link" onClick={() => {
                    setForm({ name: '', email: '', phone: '', topic: 'general', message: '', website: '' });
                    opened.current = Date.now();
                    setState('idle');
                  }}>{t('sent.again')}</button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <h2 className="contact-form-title">{t('form.title')}</h2>
                  <div className="contact-grid">
                    <label className="contact-field">
                      <span>{t('form.name')}</span>
                      <input value={form.name} onChange={set('name')} autoComplete="name" placeholder={t('form.namePlaceholder')}
                        aria-invalid={problems.name ? 'true' : undefined} />
                      {problems.name && <em>{problems.name}</em>}
                    </label>
                    <label className="contact-field">
                      <span>{t('form.email')}</span>
                      <input type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email"
                        placeholder="you@example.com" aria-invalid={problems.email ? 'true' : undefined} />
                      {problems.email && <em>{problems.email}</em>}
                    </label>
                    <label className="contact-field">
                      <span>{t('form.phone')} <small>{t('form.optional')}</small></span>
                      <input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+91 98765 43210" />
                    </label>
                    <div className="contact-field">
                      <span id="contact-topic-label">{t('form.topic')}</span>
                      <TopicSelect value={form.topic} onChange={(v) => setForm({ ...form, topic: v })}
                        options={TOPICS.map((k) => ({ value: k, label: t(`topics.${k}`) }))} />
                    </div>
                    <label className="contact-field is-wide">
                      <span>{t('form.message')}</span>
                      <textarea rows={6} maxLength={3000} value={form.message} onChange={set('message')} placeholder={t('form.messagePlaceholder')}
                        aria-invalid={problems.message ? 'true' : undefined} />
                      <small className="contact-count">{form.message.length}/3000</small>
                      {problems.message && <em>{problems.message}</em>}
                    </label>
                    {/* people never see this; bots fill it */}
                    <label className="contact-honey" aria-hidden>
                      Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                    </label>
                  </div>
                  {(state === 'error' || state === 'limited') && (
                    <p className="contact-alert" role="alert">{t(state === 'limited' ? 'errors.limited' : 'errors.send')}</p>
                  )}
                  <div className="contact-actions">
                    <p>{t.rich('form.consent', { privacy: (c) => <Link href="/privacy">{c}</Link> })}</p>
                    <button type="submit" className="btn-primary contact-submit" disabled={state === 'sending'}>
                      {state === 'sending' ? t('form.sending') : t('form.send')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <aside className="contact-side">
              <div className="contact-info">
                <p className="contact-info-label">{t('side.email')}</p>
                <a href="mailto:support@farmxpert.in" className="contact-info-value">support@farmxpert.in</a>
                <p className="contact-info-note">{t('side.emailNote')}</p>
              </div>
              <div className="contact-info">
                <p className="contact-info-label">{t('side.hours')}</p>
                <p className="contact-info-value">{t('side.hoursValue')}</p>
                <p className="contact-info-note">{t('side.hoursNote')}</p>
              </div>
              <div className="contact-info">
                <p className="contact-info-label">{t('side.farm')}</p>
                <p className="contact-info-note">{t('side.farmNote')}</p>
                <Link href="/auth/login" className="contact-link">{t('side.farmCta')} →</Link>
              </div>
              <p className="contact-legal">
                <Link href="/terms">{t('side.terms')}</Link> · <Link href="/privacy">{t('side.privacy')}</Link>
              </p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// A plain-text dropdown in the site's look (the native list can't be styled).
// Keyboard: Enter/Space/arrows open, arrows move, Enter picks, Escape closes.
function TopicSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const show = () => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const pick = (i) => { onChange(options[i].value); setOpen(false); };
  const onKey = (e) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
  };

  return (
    <div className="contact-select" ref={box}>
      <button type="button" className="contact-select-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-labelledby="contact-topic-label" onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        {current.label}
      </button>
      {open && (
        <ul className="contact-select-list" role="listbox" aria-labelledby="contact-topic-label"
          aria-activedescendant={`topic-${options[active].value}`}>
          {options.map((o, i) => (
            <li key={o.value} id={`topic-${o.value}`} role="option" aria-selected={o.value === value}
              className={i === active ? 'is-active' : undefined}
              onPointerEnter={() => setActive(i)} onPointerDown={(e) => { e.preventDefault(); pick(i); }}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
