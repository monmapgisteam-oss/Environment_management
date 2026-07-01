// Shared sidebar navigation for the admin portal, so every admin page renders
// an identical menu and only differs by which item is marked active.
//
// "Удирдлагын хуудас" and "Тохиргоо" both point at /admin (there is no
// separate settings page yet), so matching by href would light up both at
// once. Match by a distinct key instead.
export function adminNavItems(activeKey: string) {
  return [
    { key: 'dashboard', label: 'Удирдлагын хуудас', href: '/admin' },
    { key: 'companies', label: 'Компаниуд', href: '/admin/companies' },
    { key: 'users', label: 'Хэрэглэгчид', href: '/admin/users' },
    { key: 'map', label: 'Газрын зураг', href: '/admin/map' },
    { key: 'criteria', label: 'Үнэлгээний шалгуур', href: '/admin/criteria' },
    { key: 'settings', label: 'Тохиргоо', href: '/admin' },
  ].map((item) => ({ ...item, active: item.key === activeKey }));
}
