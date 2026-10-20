import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser('admin');
  return <AppShell user={user}>{children}</AppShell>;
}
