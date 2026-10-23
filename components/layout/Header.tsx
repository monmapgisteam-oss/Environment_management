'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ViewerRole } from '@/lib/auth/session';

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  reportId: string | null;
  // Set on a system message the admin sent to many users.
  broadcastId?: string | null;
};

// A staff member (evaluator) and a manager share the same `reviewer` company,
// but they have separate dashboards and must never land in each other's system.
// `role` captures the actual user role and drives all in-app navigation.
type Props = {
  userName: string;
  companyName: string;
  role: ViewerRole;
  // Menu button for phones (MobileNav), shown before the logo.
  mobileNav?: ReactNode;
};

// Where the logo/home link points for each role.
const HOME_HREF: Record<ViewerRole, string> = {
  sender: '/sender',
  reviewer: '/reviewer',
  staff: '/evaluator',
  admin: '/admin',
};

// Where a notification about a report should open for each role. A staff member
// goes straight to their own evaluation screen for that report; everyone else
// opens the read-only detail in their own portal.
function reportHrefFor(role: ViewerRole, reportId: string) {
  if (role === 'staff') return `/evaluator/evaluate/${reportId}`;
  if (role === 'sender') return `/report/${reportId}?role=sender`;
  return `/report/${reportId}?role=reviewer`;
}

export default function Header({ userName, companyName, role, mobileNav }: Props) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Notifications are scoped to the logged-in user server-side, so no role
  // needs to be passed here. They refresh every minute and when the tab comes
  // back into view, so an admin's system message shows up without a reload.
  useEffect(() => {
    const load = () =>
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/');
    router.refresh();
  };

  return (
    <header className="app-chrome sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left - logo and system name, one bar across the whole page */}
        <div className="flex min-w-0 items-center">
          {mobileNav}
          <Link href={HOME_HREF[role]} className="flex min-w-0 items-center gap-3 pr-4">
            <img src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
            <span className="min-w-0 truncate text-[13px] font-semibold leading-tight text-slate-800 sm:text-[15px]">
              Байгаль орчны менежментийн төлөвлөгөөний систем
            </span>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                const opening = !notifOpen;
                setNotifOpen(opening);
                if (opening && unreadCount > 0) {
                  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
                  fetch('/api/notifications', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: unreadIds }),
                  }).catch(() => {});
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                }
              }}
              className="relative flex h-11 w-11 items-center justify-center border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
              aria-label={unreadCount > 0 ? `Мэдэгдэл, ${unreadCount} уншаагүй` : 'Мэдэгдэл'}
              aria-expanded={notifOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-lg z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">Мэдэгдэл</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-400 text-center">Мэдэгдэл байхгүй байна.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) {
                            fetch('/api/notifications', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: n.id }),
                            }).catch(() => {});
                            setNotifications((prev) =>
                              prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item)
                            );
                            setUnreadCount((prev) => Math.max(0, prev - 1));
                          }
                          if (n.reportId) {
                            setNotifOpen(false);
                            router.push(reportHrefFor(role, n.reportId));
                          }
                        }}
                        className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${n.reportId ? 'cursor-pointer' : ''} ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                      >
                        {n.broadcastId && (
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">Системийн мэдэгдэл</p>
                        )}
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(!open)}
              aria-label="Хэрэглэгчийн цэс"
              aria-expanded={open}
              className="flex items-center gap-2.5 border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center bg-slate-100 text-slate-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-[13px] font-semibold text-color-text-main">{userName}</p>
                <p className="text-[11px] text-color-text-muted">{companyName}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-lg py-1 z-50">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Хувийн мэдээлэл
                </Link>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Гарах
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
