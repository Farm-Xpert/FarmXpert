'use client';

// ============================================================
// FILE: src/components/pwa/ServiceWorkerRegistrar.jsx
//
// Registers the service worker in production only.
// Handles SW updates by automatically activating the new worker
// so users always get the latest version after a deployment.
//
// This is a render-less component — include it once in the root
// layout and forget about it.
// ============================================================

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Only register in production — dev server handles its own HMR
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    // Wait until the page is fully loaded to avoid competing with
    // critical resource downloads
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // When a new SW is found, tell it to activate immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new version is available — activate it
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Check for updates every 60 minutes
        setInterval(
          () => registration.update(),
          60 * 60 * 1000
        );
      } catch (err) {
        // Service worker registration failed — the app still works fine
        // without it, just no offline/caching support
        console.warn('SW registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    // When the controlling SW changes (new version activated), reload
    // to ensure a clean state with the new assets
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange
      );
    };
  }, []);

  return null;
}
