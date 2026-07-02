// Shared sidebar navigation for the admin portal, so every admin page renders
// an identical menu and only differs by which item is marked active.
export function adminNavItems(activeKey: string) {
  return [
    { key: 'dashboard', label: 'Удирдлагын хуудас', href: '/admin' },
    { key: 'companies', label: 'Компаниуд', href: '/admin/companies' },
    { key: 'users', label: 'Хэрэглэгчид', href: '/admin/users' },
    { key: 'map', label: 'Газрын зураг', href: '/admin/map' },
    { key: 'criteria', label: 'Үнэлгээний шалгуур', href: '/admin/criteria' },
    { key: 'settings', label: 'Тохиргоо', href: '/admin/settings' },
  ].map((item) => ({ ...item, active: item.key === activeKey }));
}
