// ============================================================
// FILE: src/app/[locale]/offline/page.jsx
//
// Offline fallback page served by the service worker when a
// navigation request fails due to no network connectivity.
//
// Keeps the FarmXpert visual identity — uses the same fonts and
// colour palette as the rest of the site. The page is deliberately
// simple so it can be cached reliably.
// ============================================================

import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'Offline — FarmXpert',
  robots: { index: false, follow: false },
};

export default async function OfflinePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      background: '#fbf7f1',
      color: '#1d2b22',
      textAlign: 'center',
    }}>
      {/* Leaf icon — matches the FarmXpert branding */}
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.7,
      }}>
        🌿
      </div>

      <h1 style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        marginBottom: '0.75rem',
        color: '#0f4a2e',
      }}>
        You&apos;re offline
      </h1>

      <p style={{
        fontSize: '1.05rem',
        lineHeight: 1.6,
        maxWidth: '28rem',
        marginBottom: '2rem',
        color: '#5f6b62',
      }}>
        FarmXpert needs an internet connection to load your farm data,
        weather updates, and AI recommendations. Please check your
        connection and try again.
      </p>

      <button
        onClick={null}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: '#ffffff',
          background: '#0f4a2e',
          border: 'none',
          borderRadius: '0.75rem',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        // Client-side reload — inline because this page must work from
        // the SW cache without any JS bundles
        suppressHydrationWarning
      >
        Try again
      </button>

      {/* Inline script for the reload button — works even without JS bundles */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('button').onclick=function(){location.reload()}`,
        }}
      />
    </div>
  );
}
