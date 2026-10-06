'use client';

import RequireAuth from '@/components/auth/RequireAuth';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Skeleton } from '@/components/ui/primitives';
import { SkeletonPage } from '@/components/ui/skeletons';
import { FarmProvider } from '@/context/FarmContext';

// the shell's own shape (sidebar with logo, farm card and menu), so nothing jumps once the session is back
function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="fx-sidebar hidden h-dvh flex-col gap-7 pt-14 pr-7 pb-5 pl-6 lg:flex" aria-hidden>
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-20 rounded-2xl" />
        <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
      </aside>
      <div className="container-app py-10 lg:pt-16"><SkeletonPage /></div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <RequireAuth fallback={<ShellSkeleton />}>
      <FarmProvider>
        <DashboardShell>{children}</DashboardShell>
      </FarmProvider>
    </RequireAuth>
  );
}
