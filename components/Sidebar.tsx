"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  HiViewGrid,
  HiUpload,
  HiCalendar,
  HiTrendingUp,
  HiDocumentText,
  HiPencilAlt,
  HiFolder,
  HiExclamation,
  HiCheckCircle,
  HiInbox,
  HiUserGroup,
  HiClock,
  HiReply,
  HiOfficeBuilding,
  HiUser,
  HiClipboardList,
  HiChartBar,
  HiMap,
  HiBookmark,
  HiCog,
  HiChevronDown,
  HiDocumentDuplicate,
} from "react-icons/hi";
import SupportButton from "./SupportButton";

type Item = {
  label: string;
  href: string;
  active?: boolean;
  children?: Item[];
};

type Props = {
  items: Item[];
};

const iconMap: Record<string, ReactNode> = {
  "Удирдлагын хуудас": <HiViewGrid size={18} />,
  "Хяналтын самбар": <HiViewGrid size={18} />,
  "Тайлан илгээх": <HiUpload size={18} />,
  "Жилийн төлөвлөгөө": <HiCalendar size={18} />,
  "Биелэлтийн тайлан": <HiTrendingUp size={18} />,
  "Нэмэлт мэдээлэл": <HiPencilAlt size={18} />,
  "Миний тайлангууд": <HiFolder size={18} />,
  "Засвар шаардсан тайлан": <HiExclamation size={18} />,
  Ноорог: <HiDocumentDuplicate size={18} />,
  "Үнэлгээний хариу": <HiCheckCircle size={18} />,
  "Ирсэн тайлангууд": <HiInbox size={18} />,
  "Гишүүдэд оноох": <HiUserGroup size={18} />,
  "Үнэлгээний явц": <HiClock size={18} />,
  "Буцаасан тайлан": <HiReply size={18} />,
  Компаниуд: <HiOfficeBuilding size={18} />,
  Хэрэглэгчид: <HiUser size={18} />,
  "Бүх тайлан": <HiClipboardList size={18} />,
  "Бүх үнэлгээ": <HiChartBar size={18} />,
  "Газрын зураг": <HiMap size={18} />,
  "Газарзүйн мэдээлэл": <HiMap size={18} />,
  "Тайлангийн төрөл": <HiBookmark size={18} />,
  "Үнэлгээний шалгуур": <HiCog size={18} />,
  Тохиргоо: <HiCog size={18} />,
};

function SidebarItem({ item }: { item: Item }) {
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some((c) => c.active);
  const [expanded, setExpanded] = useState(item.active || isChildActive);
  const isActive = item.active || isChildActive;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
            isActive
              ? "bg-white/10 text-white"
              : "text-slate-200 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex-shrink-0">
            {iconMap[item.label] ?? <HiDocumentText size={18} />}
          </span>
          <span className="flex-1 text-left truncate">{item.label}</span>
          <HiChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""} text-slate-400`}
          />
        </button>
        {expanded && (
          <div className="ml-[26px] mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.label}
                href={child.href}
                className={`block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                  child.active
                    ? "text-white font-medium bg-white/10"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
        item.active
          ? "sidebar-active text-white"
          : "text-slate-200 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex-shrink-0">
        {iconMap[item.label] ?? <HiDocumentText size={18} />}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ items }: Props) {
  return (
    <aside
      className="hidden md:flex md:flex-col sticky top-0 h-screen w-[250px] shrink-0 text-white"
      style={{ backgroundColor: "#064E3B" }}
    >
      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-white/10">
        <span className="text-[12px] font-bold tracking-[0.14em] text-white leading-tight uppercase">
          Тайлангийн<br />систем
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </nav>

      {/* Bottom — help / support */}
      <div className="border-t border-white/10 px-3 py-4">
        <SupportButton />
      </div>
    </aside>
  );
}
