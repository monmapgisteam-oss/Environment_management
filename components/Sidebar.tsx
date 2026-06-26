"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  HiHome,
  HiOutlineMail,
  HiCalendar,
  HiTrendingUp,
  HiDocumentText,
  HiSearch,
  HiPencilAlt,
  HiLocationMarker,
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
  HiBookmark,
  HiCog,
  HiChevronDown,
  HiDocumentDuplicate,
} from "react-icons/hi";

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
  "Удирдлагын хуудас": <HiHome size={18} />,
  "Хяналтын самбар": <HiHome size={18} />,
  "Тайлан илгээх": <HiOutlineMail size={18} />,
  "Жилийн төлөвлөгөө": <HiCalendar size={18} />,
  "Биелэлтийн тайлан": <HiTrendingUp size={18} />,
  "Дүгнэх хуудас": <HiDocumentText size={18} />,
  "Хяналтын хуудас": <HiSearch size={18} />,
  "Нэмэлт мэдээлэл": <HiPencilAlt size={18} />,
  "Аймаг, нийслэлийн санал": <HiLocationMarker size={18} />,
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
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
            isActive
              ? "bg-white/10 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span
            className={`flex-shrink-0 ${isActive ? "text-blue-400" : "text-slate-400"}`}
          >
            {iconMap[item.label] ?? <HiDocumentText size={18} />}
          </span>
          <span className="flex-1 text-left truncate">{item.label}</span>
          <HiChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""} ${isActive ? "text-slate-300" : "text-slate-500"}`}
          />
        </button>
        {expanded && (
          <div className="ml-[30px] mt-0.5 space-y-0.5 border-l border-slate-600/50 pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.label}
                href={child.href}
                className={`block rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  child.active
                    ? "text-blue-400 font-medium bg-white/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
        item.active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={`flex-shrink-0 ${item.active ? "text-blue-400" : "text-slate-400"}`}
      >
        {iconMap[item.label] ?? <HiDocumentText size={18} />}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ items }: Props) {
  return (
    <aside className="hidden sticky top-14 h-[calc(100vh-3.5rem)] w-64 shrink-0 bg-[#1E293B] md:flex md:flex-col overflow-y-auto">
      <nav className="space-y-0.5 px-3 py-4">
        {items.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </nav>
    </aside>
  );
}
