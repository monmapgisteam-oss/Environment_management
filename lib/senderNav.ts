export type SenderNavKey =
  | 'dashboard'
  | 'plan'
  | 'performance'
  | 'general-evaluation'
  | 'additional'
  | 'reports'
  | 'geography'
  | 'drafts';

export function senderSidebarItems(active?: SenderNavKey) {
  return [
    { label: 'Хяналтын самбар', href: '/sender', active: active === 'dashboard' },
    {
      label: 'Тайлан илгээх',
      href: '/sender/submit',
      active: active === 'plan' || active === 'performance' || active === 'general-evaluation',
      children: [
        { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan', active: active === 'plan' },
        { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance', active: active === 'performance' },
        {
          label: 'Ерөнхий үнэлгээний дүгнэлт',
          href: '/sender/submit?type=general-evaluation',
          active: active === 'general-evaluation',
        },
      ],
    },
    { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional', active: active === 'additional' },
    { label: 'Миний тайлангууд', href: '/sender/reports', active: active === 'reports' },
    { label: 'Газарзүйн мэдээлэл', href: '/sender/geography', active: active === 'geography' },
    { label: 'Ноорог', href: '/sender/drafts', active: active === 'drafts' },
  ];
}
