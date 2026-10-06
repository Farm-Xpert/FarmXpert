import { setRequestLocale } from 'next-intl/server';

import DocsPage from '@/components/marketing/DocsPage';

export const metadata = { title: 'Guide | FarmXpert' };

export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DocsPage />;
}
