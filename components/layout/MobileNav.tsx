"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import { SidebarContent } from "./Sidebar";
import type { NavItem } from "@/lib/nav";
import type { ViewerRole } from "@/lib/auth/session";

// Phone and tablet menu: a button in the header that slides the sidebar in
// from the left. Closes on navigation, on Esc and on a tap outside.
export default function MobileNav({ items, role }: { items: NavItem[]; role: ViewerRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Цэс нээх"
        aria-expanded={open}
      >
        <HiOutlineMenu size={22} />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] md:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-hidden="true" />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Цэс"
              className="mobile-nav-panel absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-2xl"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
                  <span className="truncate text-[13px] font-semibold leading-tight text-slate-800">
                    Байгаль орчны менежментийн төлөвлөгөөний систем
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100"
                  aria-label="Цэс хаах"
                >
                  <HiX size={20} />
                </button>
              </div>
              <SidebarContent items={items} role={role} />
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
