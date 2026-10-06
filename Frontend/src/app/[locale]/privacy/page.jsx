import { setRequestLocale } from 'next-intl/server';

import LegalPage from '@/components/marketing/LegalPage';

export const metadata = { title: 'Privacy Policy | FarmXpert' };

export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage kind="privacy" locale={locale} />;
}
