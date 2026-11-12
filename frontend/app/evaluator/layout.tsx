import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth';

export default async function EvaluatorLayout({ children }: { children: ReactNode }) {
  const user = await requireUser('evaluator');
  return <AppShell user={user}>{children}</AppShell>;
}
