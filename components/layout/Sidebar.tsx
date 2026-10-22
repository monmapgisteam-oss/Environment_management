"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  HiOutlineViewGrid,
  HiOutlineCalendar,
  HiOutlineTrendingUp,
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlineInbox,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineReply,
  HiOutlineOfficeBuilding,
  HiOutlineUser,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineMap,
  HiOutlineBookmark,
  HiOutlineCog,
  HiOutlineChevronDown,
  HiOutlineDocumentDuplicate,
  HiOutlineSearch,
  HiOutlineQuestionMarkCircle,
} from "react-icons/hi";
import SupportButton from "./SupportButton";
import { findActiveHref, type NavItem } from "@/lib/nav";
import type { ViewerRole } from "@/lib/auth/session";

type Props = {
  items: NavItem[];
  // Admins receive feedback rather than send it, so their sidebar links
  // straight to the inbox instead of opening the "send feedback" dialog.
  role: ViewerRole;
};

const iconMap: Record<string, ReactNode> = {
  "Удирдлагын хуудас": <HiOutlineViewGrid size={18} />,
  "Хяналтын самбар": <HiOutlineViewGrid size={18} />,
  "Жилийн төлөвлөгөө": <HiOutlineCalendar size={18} />,
  "Биелэлтийн тайлан": <HiOutlineTrendingUp size={18} />,
  "Ерөнхий үнэлгээний дүгнэлт": <HiOutlineDocumentText size={18} />,
  "Миний тайлангууд": <HiOutlineFolder size={18} />,
  "Засвар шаардсан тайлан": <HiOutlineExclamation size={18} />,
  Ноорог: <HiOutlineDocumentDuplicate size={18} />,
  "Үнэлгээний хариу": <HiOutlineCheckCircle size={18} />,
  "Ирсэн тайлангууд": <HiOutlineInbox size={18} />,
  "Надад оноогдсон тайлангууд": <HiOutlineInbox size={18} />,
  "Үнэлгээ өгсөн тайлангууд": <HiOutlineCheckCircle size={18} />,
  "Гишүүдэд оноох": <HiOutlineUserGroup size={18} />,
  "Үнэлгээний явц": <HiOutlineClock size={18} />,
  "Буцаасан тайлан": <HiOutlineReply size={18} />,
  Компаниуд: <HiOutlineOfficeBuilding size={18} />,
  Хэрэглэгчид: <HiOutlineUser size={18} />,
  "Бүх тайлан": <HiOutlineClipboardList size={18} />,
  "Бүх үнэлгээ": <HiOutlineChartBar size={18} />,
  "Газрын зураг": <HiOutlineMap size={18} />,
  "Газарзүйн мэдээлэл": <HiOutlineMap size={18} />,
  "Тайлан хайх": <HiOutlineSearch size={18} />,
  "Тайлангийн төрөл": <HiOutlineBookmark size={18} />,
  "Үнэлгээний шалгуур": <HiOutlineCog size={18} />,
  Тохиргоо: <HiOutlineCog size={18} />,
  "Санал хүсэлт": <HiOutlineQuestionMarkCircle size={18} />,
};

const itemClass =
  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors";

function itemStateClass(isActive: boolean) {
  return isActive ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

function ItemIcon({ label, isActive }: { label: string; isActive: boolean }) {
  return (
    <span
      className={`flex-shrink-0 transition-colors ${
        isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
      }`}
    >
      {iconMap[label] ?? <HiOutlineDocumentText size={18} />}
    </span>
  );
}

// Bar on the left edge of the active item.
function ActiveMarker() {
  return <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 bg-teal-600" />;
}

function SidebarItem({ item, activeHref }: { item: NavItem; activeHref: string | null }) {
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const isActive = item.href === activeHref || children.some((child) => child.href === activeHref);
  const [expanded, setExpanded] = useState(isActive);

  // The sidebar stays mounted between pages, so open the group when the user
  // navigates into it from elsewhere.
  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`${itemClass} ${isActive ? "text-teal-800" : itemStateClass(false)}`}
        >
          <ItemIcon label={item.label} isActive={isActive} />
          <span className="flex-1 truncate text-left">{item.label}</span>
          <HiOutlineChevronDown
            size={14}
            className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="ml-[21px] mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
            {children.map((child) => {
              const childActive = child.href === activeHref;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`relative block rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                    childActive
                      ? "bg-teal-50 font-medium text-teal-800"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {childActive && (
                    <span className="absolute -left-[13px] top-1/2 h-4 w-px -translate-y-1/2 bg-teal-600" />
                  )}
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href} className={`${itemClass} ${itemStateClass(isActive)}`}>
      {isActive && <ActiveMarker />}
      <ItemIcon label={item.label} isActive={isActive} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ items, role }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHref = findActiveHref(items, pathname, new URLSearchParams(searchParams.toString()));
  const bottomItemClass = `${itemClass} ${itemStateClass(false)}`;

  return (
    <aside className="app-chrome hidden md:flex md:flex-col sticky top-0 h-screen w-64 shrink-0 border-r border-slate-200 bg-white">
      {/* Logo only, same height as the header so their borders line up. The
          full system name is shown in the header. */}
      <Link
        href={items[0]?.href ?? "/"}
        title="Байгаль орчны менежментийн төлөвлөгөөний систем"
        className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-4"
      >
        <img src="/logo.svg" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
        <span className="text-[13px] font-bold leading-[1.2] text-slate-900">
          Нийслэлийн байгаль
          <br />
          орчны газар
        </span>
      </Link>

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
        {items.map((item, index) => (
          <div key={item.href}>
            {item.section && (
              <p
                className={`mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${
                  index === 0 ? "mt-1" : "mt-5"
                }`}
              >
                {item.section}
              </p>
            )}
            <div className="py-0.5">
              <SidebarItem item={item} activeHref={activeHref} />
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — feedback: admins read it, everyone else sends it */}
      <div className="border-t border-slate-200 px-3 py-3">
        {role === "admin" ? (
          <Link href="/admin/feedback" className={bottomItemClass}>
            <ItemIcon label="Санал хүсэлт" isActive={false} />
            <span className="truncate">Санал хүсэлт</span>
          </Link>
        ) : (
          <SupportButton className={bottomItemClass} />
        )}
      </div>
    </aside>
  );
}
