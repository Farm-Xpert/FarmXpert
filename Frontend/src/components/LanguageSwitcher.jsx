'use client';

// ============================================================
// FILE: src/components/LanguageSwitcher.jsx
//
// The home page's language picker: the shared styled menu (LangMenu),
// dressed in the landing look by the .lang-switcher rules in navbar.css.
// ============================================================

import { Suspense } from 'react';
import LangMenu from '@/components/ui/LangMenu';

export default function LanguageSwitcher() {
  return <Suspense><LangMenu cls="lang-switcher" /></Suspense>;
}
