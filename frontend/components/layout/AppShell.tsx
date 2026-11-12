import type { ReactNode } from 'react';
import { loadView } from '@/lib/api/server';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { VIEWER_ROLE, type CurrentUser } from '@/lib/auth';
import { navFor } from '@shared/nav';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ForcePasswordDialog from '@/components/auth/ForcePasswordDialog';
import Toaster from '@/components/ui/Toaster';
import SessionGuard from '@/components/layout/SessionGuard';

type Props = {
  user: CurrentUser;
  children: ReactNode;
};

// Page frame for every signed-in area: a full-width header with the logo and
// system name, then the role sidebar beside the page.
export default async function AppShell({ user, children }: Props) {
  const role = VIEWER_ROLE[user.role];
  // Reviewer and staff menus list the active report types as a submenu.
  const { reportTypes } = await loadView('shell');

  const nav = navFor(role, reportTypes);

  return (
    <div className="app-shell flex min-h-screen flex-col bg-background">
      <Header
        userName={user.name}
        companyName={user.company?.name || (role === 'admin' ? 'Системийн админ' : 'Ажлын газар бүртгэгдээгүй')}
        role={role}
        mobileNav={<MobileNav items={nav} role={role} />}
      />
      <div className="flex min-w-0 flex-1">
        <Sidebar items={nav} role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Every page sits in the same centred column so wide screens stay readable. */}
          <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col">{children}</div>
          <Toaster />
          <ConfirmDialog />
          <SessionGuard userId={user.id} />
          {/* An admin-created account picks its own password before using the app. */}
          {user.mustChangePassword && <ForcePasswordDialog userName={user.name} email={user.email} />}
        </div>
      </div>
    </div>
  );
}
