'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  reportId: string | null;
};

// A staff member (evaluator) and a manager share the same `reviewer` company,
// but they have separate dashboards and must never land in each other's system.
// `role` captures the actual user role and drives all in-app navigation.
type ViewerRole = 'sender' | 'reviewer' | 'staff' | 'admin';

type Props = {
  userName: string;
  companyName: string;
  role?: ViewerRole;
  companyType?: 'sender' | 'reviewer' | 'admin';
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

export default function Header({ userName, companyName, role, companyType = 'sender' }: Props) {
  // Fall back to the company type when an explicit role is not supplied, so the
  // sender/manager pages keep working unchanged.
  const viewerRole: ViewerRole = role ?? companyType;
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Notifications are scoped to the logged-in user server-side, so no role
    // needs to be passed here.
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left - brand (shown on mobile where the sidebar is hidden) */}
        <Link href={HOME_HREF[viewerRole]} className="flex items-center gap-2.5 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="text-xs font-bold tracking-widest text-color-text-main uppercase">Тайлангийн систем</span>
        </Link>
        <div className="hidden md:block" />

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
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
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
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
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
                            router.push(reportHrefFor(viewerRole, n.reportId));
                          }
                        }}
                        className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${n.reportId ? 'cursor-pointer' : ''} ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                      >
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
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
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
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
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
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
