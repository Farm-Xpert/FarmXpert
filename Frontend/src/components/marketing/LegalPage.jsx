'use client';

// ============================================================
// FILE: src/components/marketing/LegalPage.jsx
//
// Terms of Service and Privacy Policy, laid out as a document: the page
// hero, then a contents list that stays in view on the left and the text
// on the right - an "in short" summary, then numbered sections as flowing
// paragraphs separated by hairlines. Linked from every account email, the
// site footer and the sign-up checkbox. Text lives in legalContent.js.
// ============================================================

import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import useLandingEffects from './useLandingEffects';
import '@/styles/pages.css';
import { legal } from './legalContent';
import LegalBody from './LegalBody';

const slug = (i) => `s${i + 1}`;   // section anchors by number: titles are in Hindi or Gujarati too

/** The legal pages; the /docs guide passes its own document through `content`. */
export default function LegalPage({ kind, locale, content }) {
  const base = legal(kind || 'terms', locale);
  const { doc, other, ui, updated } = content ? { ...base, ...content } : base;
  useLandingEffects();
  const [active, setActive] = useState(null);

  // highlight, in the contents, the section being read
  useEffect(() => {
    const els = doc.sections.map((_, i) => document.getElementById(slug(i))).filter(Boolean);
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
      const visible = [...seen].filter(([, top]) => top !== null).sort((a, b) => a[1] - b[1]);
      if (visible.length) setActive(visible[0][0]);
    }, { rootMargin: '-96px 0px -55% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [doc]);


  return (
    <>
      <Navbar />
      <main className="page-main">
        <header className="page-hero">
          <div className="page-hero-grid" aria-hidden />
          <div className="page-hero-glow" aria-hidden />
          <div className="section-container page-hero-inner">
            <nav className="page-crumbs" aria-label="Breadcrumb">
              <Link href="/">{ui.home}</Link><span aria-hidden>/</span><span aria-current="page">{doc.crumb}</span>
            </nav>
            <div className="section-eyebrow">{doc.eyebrow}</div>
            <h1 className="page-title">{doc.title[0]} <span className="text-green">{doc.title[1]}</span> {doc.title[2]}</h1>
            <p className="page-lead">{doc.lead}</p>
            <div className="legal-meta">
              {updated && <span>{ui.updated} <time>{updated}</time></span>}
              {updated && <span className="legal-meta-sep" aria-hidden>·</span>}
              <button type="button" onClick={() => window.print()} className="legal-meta-link">{ui.print}</button>
              <span className="legal-meta-sep" aria-hidden>·</span>
              <Link href={other.href} className="legal-meta-link">{other.label}</Link>
            </div>
          </div>
        </header>

        <section className="page-section is-base">
          <div className="section-container legal-layout">
            {/* contents: stays in view beside the text on wide screens */}
            <aside className="legal-toc" aria-label={ui.onPage}>
              <p className="legal-toc-title">{ui.onPage}</p>
              <ol>
                {doc.sections.map(([title], i) => (
                  <li key={title}>
                    <a href={`#${slug(i)}`} aria-current={active === slug(i) ? 'true' : undefined}
                      className={active === slug(i) ? 'is-active' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{title}</a>
                  </li>
                ))}
              </ol>
              <Link href={other.href} className="legal-toc-other">{ui.read} {other.label} →</Link>
            </aside>

            <article className="legal-doc">
              <div className="legal-summary">
                <p className="legal-summary-title">{ui.inShort}</p>
                <ul>{doc.summary.map((line) => <li key={line}>{line}</li>)}</ul>
              </div>

              {doc.sections.map(([title, body], i) => (
                <section key={title} id={slug(i)} className="legal-section">
                  <h2><span className="legal-num">{String(i + 1).padStart(2, '0')}</span>{title}</h2>
                  <LegalBody body={body} />
                </section>
              ))}

              <a href="#top" className="legal-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>↑ {ui.top}</a>
              <p className="legal-note">
                {ui.note} <a href="mailto:support@farmxpert.in">support@farmxpert.in</a>.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
