'use client';

// ============================================================
// FILE: src/components/marketing/DocsPage.jsx
//
// /docs - the FarmXpert guide for farmers, in the same document layout as
// the legal pages (contents that follow you, an "in short" box, numbered
// sections). Text: docsContent.js, in English, Hindi and Gujarati.
// ============================================================

import { useLocale } from 'next-intl';

import LegalPage from './LegalPage';
import { docs } from './docsContent';

const CONTACT = { en: 'Contact us', hi: 'संपर्क करें', gu: 'સંપર્ક કરો' };

export default function DocsPage() {
  const locale = useLocale();
  return (
    <LegalPage locale={locale} content={{
      doc: docs(locale),
      updated: null,
      other: { href: '/contact', label: CONTACT[locale] || CONTACT.en },
    }} />
  );
}
