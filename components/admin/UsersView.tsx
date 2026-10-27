'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiPlus, HiSearch } from 'react-icons/hi';
import KpiStrip from '@/components/ui/KpiStrip';
import { CreateStaffDialog, CredentialsDialog, ResetPasswordDialog } from '@/components/admin/StaffAccountDialog';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { decideCompany } from '@/lib/companyApproval';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  // approvalStatus: a self-registered sender company waits for the admin.
  company: { id: string; name: string; registerNumber: string; approvalStatus: 'pending' | 'approved' | 'rejected' | null } | null;
  isActive: boolean;
  // Still on the temporary password an admin set.
  mustChangePassword: boolean;
  // Has a system-issued digital signature password (staff and managers).
  hasSignature: boolean;
  openAssignments: number;
};

const ROLE_LABELS: Record<string, string> = {
  sender: 'Илгээгч',
  review_manager: 'Хянах менежер',
  evaluator: 'Ажилтан',
  admin: 'Админ',
};

const ROLE_DOT: Record<string, string> = {
  sender: 'bg-sky-500',
  review_manager: 'bg-violet-500',
  evaluator: 'bg-teal-600',
  admin: 'bg-slate-400',
};

export default function UsersView({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password?: string; signaturePin?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const setActive = async (user: UserRow, active: boolean) => {
    if (!active) {
      const ok = await confirmDialog({
        title: 'Эрх идэвхгүй болгох',
        message: `${user.name} нэвтрэх боломжгүй болж, нээлттэй байгаа холболт нь шууд хаагдана.${
          user.openAssignments ? ` Үнэлгээ хүлээж буй ${user.openAssignments} тайланг өөр гишүүнд дахин оноох шаардлагатай.` : ''
        }`,
        confirmLabel: 'Идэвхгүй болгох',
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: active ? 'activate' : 'deactivate' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast(active ? `${user.name}-ийн эрхийг идэвхжүүллээ.` : `${user.name}-ийн эрхийг идэвхгүй болголоо.`);
      router.refresh();
    } catch (error) {
      toast((error as Error).message || 'Хадгалахад алдаа гарлаа.', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Issues a new signature password; the old one stops working at once.
  const issueSignature = async (user: UserRow) => {
    const ok = await confirmDialog({
      title: user.hasSignature ? 'Тоон гарын үсэг шинэчлэх' : 'Тоон гарын үсэг олгох',
      message: user.hasSignature
        ? `${user.name}-д шинэ гарын үсгийн нууц үг үүсгэнэ. Хуучин нууц үг шууд хүчингүй болно.`
        : `${user.name}-д гарын үсгийн нууц үг үүсгэнэ.`,
      confirmLabel: user.hasSignature ? 'Шинэчлэх' : 'Олгох',
    });
    if (!ok) return;
    setBusy(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-signature' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setCredentials({ email: user.email, signaturePin: data.signaturePin });
      router.refresh();
    } catch (error) {
      toast((error as Error).message || 'Хадгалахад алдаа гарлаа.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  // Row whose action menu is open, with where to draw it (the table scrolls
  // sideways, so the menu is fixed to the window instead of the row).
  const [menu, setMenu] = useState<{ user: UserRow; top: number; right: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (role && u.role !== role) return false;
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.company?.name.toLowerCase().includes(term) ?? false)
      );
    });
  }, [users, search, role]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    users.forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1; });
    return c;
  }, [users]);

  // Sender companies that signed up and wait for the admin (one row per company).
  const pendingCompanies = new Set(
    users.flatMap((u) => (u.role === 'sender' && u.company?.approvalStatus === 'pending' ? [u.company.id] : [])),
  ).size;

  const decide = async (user: UserRow, action: 'approve' | 'reject') => {
    if (!user.company) return;
    setBusy(user.id);
    if (await decideCompany(user.company, action)) router.refresh();
    setBusy(null);
  };

  const staffWithoutSignature = users.filter(
    (u) => u.isActive && (u.role === 'evaluator' || u.role === 'review_manager') && !u.hasSignature,
  ).length;

  const tabs = [
    { value: '', label: 'Бүгд', count: users.length },
    { value: 'sender', label: 'Илгээгч', count: counts.sender ?? 0 },
    { value: 'review_manager', label: 'Менежер', count: counts.review_manager ?? 0 },
    { value: 'evaluator', label: 'Ажилтан', count: counts.evaluator ?? 0 },
  ];

  const openMenu = (user: UserRow, button: HTMLElement) => {
    if (menu?.user.id === user.id) {
      setMenu(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    setMenu({ user, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const menuItem = 'flex w-full items-center px-3.5 py-2 text-left text-sm transition hover:bg-slate-50 disabled:opacity-50';

  return (
    <div className="space-y-5">
      <KpiStrip
        items={[
          { label: 'Нийт хэрэглэгч', value: users.length, note: `${users.filter((u) => !u.isActive).length} идэвхгүй`, accent: 'bg-slate-400' },
          { label: 'Илгээгч', value: counts.sender ?? 0, note: 'Тайлан илгээх байгууллага', accent: 'bg-sky-500' },
          { label: 'Хянах менежер', value: counts.review_manager ?? 0, note: 'Хянах байгууллага', accent: 'bg-violet-500' },
          {
            label: 'Ажилтан',
            value: counts.evaluator ?? 0,
            note: staffWithoutSignature ? `${staffWithoutSignature} нь гарын үсэггүй` : 'Бүгд гарын үсэгтэй',
            accent: 'bg-teal-600',
          },
        ]}
      />

      <section className="border border-slate-200 bg-white shadow-soft">
        {/* Toolbar: instant search, role tabs, create */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <HiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, имэйл, байгууллага"
              className="h-10 w-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="flex overflow-x-auto border border-slate-200 bg-slate-50 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setRole(tab.value)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 px-3.5 text-sm font-medium transition ${
                  role === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                <span className="text-xs tabular-nums text-slate-400">{tab.count}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59] lg:ml-auto"
          >
            <HiPlus size={16} /> Ажилтны эрх үүсгэх
          </button>
        </div>

        {pendingCompanies > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            <span>
              <span className="font-semibold">{pendingCompanies} байгууллага</span> бүртгүүлж, баталгаажуулалт хүлээж байна. Мөрийн ⋮
              цэснээс эсвэл «Компаниуд» хэсгээс дүгнэлтийг нь шалгаад баталгаажуулна уу.
            </span>
            <Link href="/admin/companies" className="font-semibold text-amber-900 underline-offset-2 hover:underline">
              Компаниуд руу
            </Link>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-400">Хэрэглэгч олдсонгүй.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Хэрэглэгч</th>
                  <th className="px-4 py-2.5">Байгууллага, албан тушаал</th>
                  <th className="px-4 py-2.5">Утас</th>
                  <th className="px-4 py-2.5">Эрх</th>
                  <th className="px-4 py-2.5">Төлөв</th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => {
                  const staff = u.role === 'evaluator' || u.role === 'review_manager';
                  return (
                    <tr key={u.id} className={`transition-colors hover:bg-slate-50 ${u.isActive ? '' : 'opacity-60'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-slate-100 text-xs font-bold text-slate-600">
                            {u.name.trim().charAt(0).toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{u.name}</p>
                            <p className="truncate text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3">
                        <p className="truncate text-slate-800">{u.company?.name || '—'}</p>
                        {u.position && <p className="truncate text-xs text-slate-500">{u.position}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{u.phone || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <span className={`h-2 w-2 rounded-full ${ROLE_DOT[u.role] ?? 'bg-slate-400'}`} />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {u.role === 'sender' && u.company?.approvalStatus === 'pending' ? (
                          <span className="font-medium text-amber-700">Баталгаажуулалт хүлээж буй</span>
                        ) : u.role === 'sender' && u.company?.approvalStatus === 'rejected' ? (
                          <span className="font-medium text-rose-600">Татгалзсан</span>
                        ) : !u.isActive ? (
                          <span className="text-slate-500">Идэвхгүй</span>
                        ) : u.mustChangePassword ? (
                          <span className="font-medium text-amber-700">Нууц үг солиогүй</span>
                        ) : (
                          <span className="text-emerald-700">Идэвхтэй</span>
                        )}
                        {u.isActive && staff && !u.hasSignature && (
                          <span className="block text-xs text-amber-700">Гарын үсэг олгоогүй</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => openMenu(u, event.currentTarget)}
                          disabled={busy === u.id}
                          aria-label={`${u.name}: үйлдэл`}
                          aria-expanded={menu?.user.id === u.id}
                          className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                        >
                          <HiDotsVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            role="menu"
            className="fixed z-50 w-52 border border-slate-200 bg-white py-1 shadow-lg"
            style={{ top: menu.top, right: menu.right }}
          >
            {menu.user.isActive && (menu.user.role === 'evaluator' || menu.user.role === 'review_manager') && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={`${menuItem} text-slate-700`}
                  onClick={() => {
                    setResetting(menu.user);
                    setMenu(null);
                  }}
                >
                  Нууц үг шинэчлэх
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${menuItem} ${menu.user.hasSignature ? 'text-slate-700' : 'font-semibold text-amber-700'}`}
                  onClick={() => {
                    const user = menu.user;
                    setMenu(null);
                    issueSignature(user);
                  }}
                >
                  {menu.user.hasSignature ? 'Гарын үсэг шинэчлэх' : 'Гарын үсэг олгох'}
                </button>
                <div className="my-1 h-px bg-slate-100" />
              </>
            )}
            {menu.user.role === 'sender' &&
              (menu.user.company?.approvalStatus === 'pending' || menu.user.company?.approvalStatus === 'rejected') && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${menuItem} font-semibold text-teal-700`}
                    onClick={() => {
                      const user = menu.user;
                      setMenu(null);
                      decide(user, 'approve');
                    }}
                  >
                    Байгууллагыг баталгаажуулах
                  </button>
                  {menu.user.company.approvalStatus === 'pending' && (
                    <button
                      type="button"
                      role="menuitem"
                      className={`${menuItem} text-rose-600 hover:bg-rose-50`}
                      onClick={() => {
                        const user = menu.user;
                        setMenu(null);
                        decide(user, 'reject');
                      }}
                    >
                      Бүртгэлийг татгалзах
                    </button>
                  )}
                  <div className="my-1 h-px bg-slate-100" />
                </>
              )}
            <button
              type="button"
              role="menuitem"
              className={`${menuItem} ${menu.user.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-teal-700'}`}
              onClick={() => {
                const user = menu.user;
                setMenu(null);
                setActive(user, !user.isActive);
              }}
            >
              {menu.user.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            </button>
          </div>
        </>
      )}

      {creating && (
        <CreateStaffDialog
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            setCredentials(created);
            router.refresh();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onDone={(password) => {
            setCredentials({ email: resetting.email, password });
            setResetting(null);
            router.refresh();
          }}
        />
      )}
      {credentials && <CredentialsDialog {...credentials} onClose={() => setCredentials(null)} />}
    </div>
  );
}
