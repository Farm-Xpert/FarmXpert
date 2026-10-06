import { setRequestLocale } from 'next-intl/server';

import ContactPage from '@/components/marketing/ContactPage';

export const metadata = { title: 'Contact | FarmXpert' };

export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactPage />;
}
