import type { ViewerRole } from '@/lib/auth/session';

// Sidebar menus for every portal. The sidebar marks the active item itself
// from the current URL, so these lists hold no page state.

export type NavItem = {
  label: string;
  href: string;
  // Extra path prefixes that also mark this item active, e.g. detail pages.
  match?: string[];
  children?: NavItem[];
};

export type NavReportType = { name: string; slug: string };

export const ADDITIONAL_REPORT_TYPE_SLUG = 'type-5';

// "Нэмэлт мэдээлэл" is a report type of its own with a separate menu entry,
// so report-type submenus leave it out.
export function isAdditionalReportType(reportType: NavReportType) {
  return reportType.slug === ADDITIONAL_REPORT_TYPE_SLUG || reportType.name.includes('Нэмэлт');
}

// The plan and performance report types always appear in the submenu, even
// before they exist in the database.
const CORE_REPORT_TYPES: NavReportType[] = [
  { name: 'Жилийн төлөвлөгөө', slug: 'type-1' },
  { name: 'Биелэлтийн тайлан', slug: 'type-2' },
];

function reportTypeChildren(reportTypes: NavReportType[], basePath: string): NavItem[] {
  const types = reportTypes.filter((rt) => !isAdditionalReportType(rt));
  for (const core of CORE_REPORT_TYPES) {
    if (!types.some((rt) => rt.slug === core.slug || rt.name === core.name)) types.push(core);
  }
  return types.map((rt) => ({ label: rt.name, href: `${basePath}?type=${rt.slug}` }));
}

function additionalSlug(reportTypes: NavReportType[]) {
  return reportTypes.find(isAdditionalReportType)?.slug ?? ADDITIONAL_REPORT_TYPE_SLUG;
}

export function senderNav(): NavItem[] {
  return [
    { label: 'Хяналтын самбар', href: '/sender' },
    {
      label: 'Тайлан илгээх',
      href: '/sender/submit',
      children: [
        { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan' },
        { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance' },
      ],
    },
    { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional' },
    { label: 'Миний тайлангууд', href: '/sender/reports', match: ['/report/'] },
    { label: 'Газарзүйн мэдээлэл', href: '/sender/geography' },
    { label: 'Ноорог', href: '/sender/drafts' },
  ];
}

export function reviewerNav(reportTypes: NavReportType[]): NavItem[] {
  return [
    { label: 'Хяналтын самбар', href: '/reviewer' },
    {
      label: 'Ирсэн тайлангууд',
      href: '/reviewer/reports',
      match: ['/report/'],
      children: reportTypeChildren(reportTypes, '/reviewer/reports'),
    },
    { label: 'Ерөнхий үнэлгээний дүгнэлт', href: '/reviewer/conclusions' },
    { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
    { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
    { label: 'Тайлан хайх', href: '/reviewer/survey' },
    { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
    { label: 'Нэмэлт мэдээлэл', href: `/reviewer/reports?type=${additionalSlug(reportTypes)}` },
  ];
}

export function staffNav(reportTypes: NavReportType[]): NavItem[] {
  return [
    {
      label: 'Надад оноогдсон тайлангууд',
      href: '/evaluator',
      match: ['/evaluator/evaluate/', '/report/'],
      children: reportTypeChildren(reportTypes, '/evaluator'),
    },
    { label: 'Ерөнхий үнэлгээний дүгнэлт', href: '/evaluator/conclusions' },
    { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
    { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
    { label: 'Тайлан хайх', href: '/evaluator/survey' },
    { label: 'Нэмэлт мэдээлэл', href: `/evaluator?type=${additionalSlug(reportTypes)}` },
  ];
}

export function adminNav(): NavItem[] {
  return [
    { label: 'Удирдлагын хуудас', href: '/admin' },
    { label: 'Компаниуд', href: '/admin/companies' },
    { label: 'Хэрэглэгчид', href: '/admin/users' },
    { label: 'Газрын зураг', href: '/admin/map' },
    { label: 'Үнэлгээний шалгуур', href: '/admin/criteria' },
    { label: 'Тохиргоо', href: '/admin/settings' },
  ];
}

export function navFor(role: ViewerRole, reportTypes: NavReportType[]): NavItem[] {
  if (role === 'admin') return adminNav();
  if (role === 'sender') return senderNav();
  if (role === 'staff') return staffNav(reportTypes);
  return reviewerNav(reportTypes);
}

// Picks the one menu item the current URL belongs to. An item matches when the
// path is equal (or starts with one of its `match` prefixes) and every query
// value in its href is present; the item with the most query values wins.
export function findActiveHref(items: NavItem[], pathname: string, search: URLSearchParams): string | null {
  let activeHref: string | null = null;
  let bestScore = -1;
  for (const item of flattenNav(items)) {
    const url = new URL(item.href, 'http://nav.local');
    const pathMatches =
      url.pathname === pathname || (item.match ?? []).some((prefix) => pathname.startsWith(prefix));
    const queryMatches = Array.from(url.searchParams).every(([key, value]) => search.get(key) === value);
    if (!pathMatches || !queryMatches) continue;
    const score = url.searchParams.size * 2 + (url.pathname === pathname ? 1 : 0);
    if (score > bestScore) {
      activeHref = item.href;
      bestScore = score;
    }
  }
  return activeHref;
}

function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...flattenNav(item.children ?? [])]);
}
