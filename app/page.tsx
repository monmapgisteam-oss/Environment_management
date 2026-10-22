import Link from 'next/link';
import { LuSend, LuFileSearch, LuUserCog, LuBuilding2 } from 'react-icons/lu';
import AuthLayout from '@/components/auth/AuthLayout';
import OrgLoginCard from '@/components/auth/OrgLoginCard';

export default function HomePage() {
  return (
    <AuthLayout>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Нэвтрэх</p>
        <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-slate-900">Та нэвтрэх төрлөө сонгоно уу</h1>
        <p className="mt-1 text-sm text-slate-500">Байгууллага бүр өөрийн имэйл, нууц үгээр нэвтэрнэ.</p>

        {/* Each organisation links to its own email/password login page. */}
        <div className="mt-6 space-y-2.5">
          <OrgLoginCard
            title="Тайлан илгээх байгууллага"
            subtitle="Төсөл хэрэгжүүлэгч аж ахуйн нэгж"
            icon={<LuSend size={20} />}
            href="/login/sender"
          />
          <OrgLoginCard
            title="Тайлан хянах байгууллага"
            subtitle="Хянах менежер, үнэлгээний гишүүд"
            icon={<LuFileSearch size={20} />}
            href="/login/reviewer"
          />
        </div>

        {/* Self-service registration for a new sender company */}
        <div className="mt-5 flex items-center gap-4 border border-dashed border-teal-300 bg-teal-50/50 px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-white text-teal-700">
            <LuBuilding2 size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Шинэ байгууллага уу?</span>
            <span className="block text-xs text-slate-500">Байгууллагаа бүртгүүлж, тайлан илгээж эхэлнэ.</span>
          </span>
          <Link
            href="/signup"
            className="inline-flex h-9 shrink-0 items-center bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
          >
            Бүртгүүлэх
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-400">
          <span>Нийслэлийн Байгаль орчны газар</span>
          <Link href="/login/admin" className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors hover:text-teal-700">
            <LuUserCog size={14} />
            Админ нэвтрэх
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
