'use client';

import { Suspense, useEffect } from 'react';

import RequireAuth from '@/components/auth/RequireAuth';
import AdminReport from '@/components/admin/AdminReport';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/navigation';

// Operators only: anyone else is sent to their own dashboard.
function AdminsOnly({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = ['admin', 'super_admin'].includes(user?.role);
  useEffect(() => { if (user && !allowed) router.replace('/dashboard'); }, [user, allowed, router]);
  return allowed ? children : null;
}

export default function OperationsReportPage() {
  return (
    <RequireAuth>
      <AdminsOnly>
        <Suspense><AdminReport /></Suspense>
      </AdminsOnly>
    </RequireAuth>
  );
}
