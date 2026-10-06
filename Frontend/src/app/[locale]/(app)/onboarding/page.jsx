import { getTranslations, setRequestLocale } from 'next-intl/server';

import RequireAuth from '@/components/auth/RequireAuth';
import { Skeleton } from '@/components/ui/primitives';
import { Loading } from '@/components/ui/skeletons';

// progress steps, a title and a form, while the session comes back
function OnboardingSkeleton() {
  return (
    <Loading className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-14">
      <div className="mb-10 flex gap-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />)}</div>
      <Skeleton className="h-2.5 w-24 rounded-full" />
      <Skeleton className="mt-4 h-10 w-3/4 rounded-lg" />
      <Skeleton className="mt-3 h-3 w-2/3 rounded-full" />
      <div className="mt-10 space-y-6">
        {[0, 1, 2].map((i) => <div key={i}><Skeleton className="mb-2 h-3 w-28 rounded-full" /><Skeleton className="h-12 w-full" /></div>)}
      </div>
      <Skeleton className="mt-10 ml-auto h-12 w-36 rounded-full" />
    </Loading>
  );
}
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });
  return { title: `${t('metaTitle')} | FarmXpert` };
}

export default async function OnboardingPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RequireAuth onboarding fallback={<OnboardingSkeleton />}>
      <OnboardingWizard />
    </RequireAuth>
  );
}
