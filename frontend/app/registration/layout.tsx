import type { ReactNode } from 'react';
import LogoutButton from '@/components/auth/LogoutButton';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { requireRegistrationUser } from '@/lib/auth';

// Bare shell for a sender whose company the admin has not approved yet: no
// portal menu, only the registration page and a way out.
export default async function RegistrationLayout({ children }: { children: ReactNode }) {
  const user = await requireRegistrationUser();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
            <span className="min-w-0 truncate text-[13px] font-semibold leading-tight text-slate-800 sm:text-[15px]">
              Байгаль орчны менежментийн төлөвлөгөөний систем
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-[13px] font-semibold text-slate-800">{user.name}</span>
              <span className="block text-[11px] text-slate-500">{user.company?.name}</span>
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
