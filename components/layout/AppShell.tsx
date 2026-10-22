import type { ReactNode } from 'react';
import dataStore from '@/lib/db';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { VIEWER_ROLE, type CurrentUser } from '@/lib/auth';
import { navFor } from '@/lib/nav';
import Toaster from '@/components/ui/Toaster';

type Props = {
  user: CurrentUser;
  children: ReactNode;
};

// Page frame for every signed-in area: role sidebar, header and the page.
export default async function AppShell({ user, children }: Props) {
  const role = VIEWER_ROLE[user.role];
  // Reviewer and staff menus list the active report types as a submenu.
  const reportTypes =
    role === 'reviewer' || role === 'staff'
      ? await dataStore.reportType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      : [];

  return (
    <div className="app-shell flex min-h-screen bg-background">
      <Sidebar items={navFor(role, reportTypes)} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName={user.company?.name || 'Ажлын газар бүртгэгдээгүй'} role={role} />
        {/* Every page sits in the same centred column so wide screens stay readable. */}
        <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col">{children}</div>
        <Toaster />
      </div>
    </div>
  );
}
