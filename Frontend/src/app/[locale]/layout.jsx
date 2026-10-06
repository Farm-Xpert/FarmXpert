// ============================================================
// FILE: src/app/[locale]/layout.jsx
//
// Root layout for the localized app shell. Because there is no
// app/layout.jsx above it, this file owns <html> and <body>.
//
// Responsibilities:
//   1. Validate the incoming :locale param against `routing.locales`
//      and 404 anything unknown (instead of silently rendering en).
//   2. Call setRequestLocale(locale) so downstream Server Components
//      can be statically rendered.
//   3. Load the messages bundle once on the server and hand it to
//      the client provider for hook-based consumption.
//   4. Render <html lang={locale}> so screen readers, search engines,
//      and OS-level font fallback all pick the correct language.
// ============================================================

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import LocaleProvider from '@/providers/locale-provider';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar';

import '../../styles/landingpage.css';
import '../../styles/navbar.css';
import '../../styles/footer.css';
import '../../styles/landing-light.css';

/**
 * Pre-render every supported locale at build time. New locales added
 * to routing.js are picked up automatically — no list to keep in sync.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Configure viewport for mobile/desktop PWA experience and theme colour
 */
export const viewport = {
  themeColor: '#0f4a2e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Build localized <head> metadata per request. SEO crawlers see the
 * title/description in the user's language; OG cards do too.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: ['agriculture', 'AI', 'farming', 'precision agriculture', 'FarmXpert'],
    // PWA manifest
    manifest: '/manifest.webmanifest',
    // iOS PWA support
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'FarmXpert',
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
        { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      ],
      shortcut: '/favicon.ico',
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
    // Tell Google about the other-locale alternates so each ranks
    // for queries in its own language.
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((code) => [code, `/${code === routing.defaultLocale ? '' : code}`])
      ),
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  // Unknown locale → 404. We don't want stray `/fr` URLs silently
  // rendering English content; that's bad for SEO and for users.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Required for static rendering of any Server Component below us
  // that calls getTranslations / useTranslations.
  setRequestLocale(locale);

  // Messages live in src/messages/<locale>.json and are loaded by
  // src/i18n/request.js. getMessages() just returns them so we can
  // hand them to the client provider.
  const messages = await getMessages();

  // The landing theme comes from the same `fx_theme` cookie the app uses, read
  // here so the first paint is already right (no flash, no inline script).
  // No choice yet: dark, the landing page's original look.
  const saved = (await cookies()).get('fx_theme')?.value;
  // light unless the visitor chose dark (the app pages use the same default)
  const theme = saved === 'dark' ? 'dark' : 'light';
  return (
    <html lang={locale} data-theme={theme} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body>
        <LocaleProvider locale={locale} messages={messages}>
          <div id="site-root">{children}</div>
          <ServiceWorkerRegistrar />
        </LocaleProvider>
      </body>
    </html>
  );
}
