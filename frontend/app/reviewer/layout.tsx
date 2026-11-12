import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth';

export default async function ReviewerLayout({ children }: { children: ReactNode }) {
  const user = await requireUser('review_manager');
  return <AppShell user={user}>{children}</AppShell>;
}
