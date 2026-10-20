"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  HiSearch,
} from "react-icons/hi";
import SupportButton from "./SupportButton";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi";

type Item = {
  label: string;
  href: string;
  active?: boolean;
  children?: Item[];
};

type Props = {
  items: Item[];
  // Admins receive feedback rather than send it, so their sidebar links
  // straight to the inbox instead of opening the "send feedback" dialog.
  role?: string;
};

const iconMap: Record<string, ReactNode> = {
  "Удирдлагын хуудас": <HiViewGrid size={18} />,
  "Хяналтын самбар": <HiViewGrid size={18} />,
  "Тайлан илгээх": <HiUpload size={18} />,
  "Жилийн төлөвлөгөө": <HiCalendar size={18} />,
  "Биелэлтийн тайлан": <HiTrendingUp size={18} />,
  "Ерөнхий үнэлгээний дүгнэлт": <HiDocumentText size={18} />,
  "Нэмэлт мэдээлэл": <HiPencilAlt size={18} />,
  "Нэмэлт мэдээ": <HiPencilAlt size={18} />,
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
  "Тайлан хайх": <HiSearch size={18} />,
  "Тайлангийн төрөл": <HiBookmark size={18} />,
  "Үнэлгээний шалгуур": <HiCog size={18} />,
  Тохиргоо: <HiCog size={18} />,
};

function SidebarItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedType = searchParams.get("type");
  const extraChildren: Item[] =
    item.label === "Ирсэн тайлангууд" && item.href.startsWith("/reviewer")
      ? [
          {
            label: "Жилийн төлөвлөгөө",
            href: "/reviewer/reports?type=type-1",
            active:
              pathname === "/reviewer/reports" && selectedType === "type-1",
          },
          {
            label: "Биелэлтийн тайлан",
            href: "/reviewer/reports?type=type-2",
            active:
              pathname === "/reviewer/reports" && selectedType === "type-2",
          },
        ]
      : item.label === "Надад оноогдсон тайлангууд" &&
          item.href.startsWith("/evaluator")
        ? [
            {
              label: "Жилийн төлөвлөгөө",
              href: "/evaluator?type=type-1",
              active: pathname === "/evaluator" && selectedType === "type-1",
            },
            {
              label: "Биелэлтийн тайлан",
              href: "/evaluator?type=type-2",
              active: pathname === "/evaluator" && selectedType === "type-2",
            },
          ]
        : [];
  const children = [...(item.children || [])].filter(
    (child) =>
      !(
        (item.label === "Надад оноогдсон тайлангууд" &&
          item.href.startsWith("/evaluator") &&
          child.href === "/evaluator/conclusions") ||
        (item.label === "Ирсэн тайлангууд" &&
          item.href.startsWith("/reviewer") &&
          child.href === "/reviewer/conclusions")
      ),
  );
  for (const extraChild of extraChildren) {
    if (
      !children.some(
        (child) =>
          child.href === extraChild.href || child.label === extraChild.label,
      )
    ) {
      children.push(extraChild);
    }
  }
  const hasChildren = children.length > 0;
  const isChildActive = hasChildren && children.some((c) => c.active);
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
            {children.map((child) => (
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

function withEvaluatorConclusionItem(items: Item[], pathname: string) {
  const hasAssignedReports = items.some(
    (item) =>
      item.label === "Надад оноогдсон тайлангууд" &&
      item.href.startsWith("/evaluator"),
  );
  const hasTopLevelConclusion = items.some(
    (item) => item.href === "/evaluator/conclusions",
  );
  if (!hasAssignedReports || hasTopLevelConclusion) return items;

  const conclusionItem: Item = {
    label: "Ерөнхий үнэлгээний дүгнэлт",
    href: "/evaluator/conclusions",
    active: pathname === "/evaluator/conclusions",
  };

  return items.flatMap((item) =>
    item.label === "Надад оноогдсон тайлангууд" &&
    item.href.startsWith("/evaluator")
      ? [item, conclusionItem]
      : [item],
  );
}

function withReviewerConclusionItem(items: Item[], pathname: string) {
  const hasReceivedReports = items.some(
    (item) =>
      item.label === "Ирсэн тайлангууд" && item.href.startsWith("/reviewer"),
  );
  const hasTopLevelConclusion = items.some(
    (item) => item.href === "/reviewer/conclusions",
  );
  if (!hasReceivedReports || hasTopLevelConclusion) return items;

  const conclusionItem: Item = {
    label: "Ерөнхий үнэлгээний дүгнэлт",
    href: "/reviewer/conclusions",
    active: pathname === "/reviewer/conclusions",
  };

  return items.flatMap((item) =>
    item.label === "Ирсэн тайлангууд" && item.href.startsWith("/reviewer")
      ? [item, conclusionItem]
      : [item],
  );
}

export default function Sidebar({ items, role }: Props) {
  const pathname = usePathname();
  const navigationItems = withReviewerConclusionItem(
    withEvaluatorConclusionItem(items, pathname),
    pathname,
  );

  return (
    <aside
      className="hidden md:flex md:flex-col sticky top-0 h-screen w-[250px] shrink-0 text-white"
      style={{ backgroundColor: "#064E3B" }}
    >
      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-white/10">
        <span className="text-[12px] font-bold tracking-[0.14em] text-white leading-tight uppercase">
          Тайлангийн
          <br />
          систем
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigationItems.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </nav>

      {/* Bottom — feedback: admins read it, everyone else sends it */}
      <div className="border-t border-white/10 px-3 py-4">
        {role === "admin" ? (
          <Link
            href="/admin/feedback"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
          >
            <HiOutlineQuestionMarkCircle size={18} className="flex-shrink-0" />
            <span className="truncate">Санал хүсэлт</span>
          </Link>
        ) : (
          <SupportButton />
        )}
      </div>
    </aside>
  );
}
