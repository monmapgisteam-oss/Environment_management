import Link from 'next/link';
import { LuSend, LuFileSearch, LuUserCog } from 'react-icons/lu';
import AuthLayout from '@/components/auth/AuthLayout';
import OrgLoginCard from '@/components/auth/OrgLoginCard';

export default function HomePage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Нэвтрэх</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Та нэвтрэх төрлөө сонгоно уу</h1>
        <p className="mt-2 text-sm text-slate-500">Байгууллага бүр өөрийн имэйл, нууц үгээр нэвтэрнэ.</p>

        {/* Cards — each organisation links to its own email/password login page. */}
        <div className="mt-8 grid items-start gap-5 md:grid-cols-2">
          <OrgLoginCard
            title="Тайлан илгээх байгууллага"
            subtitle="Төсөл хэрэгжүүлэгч аж ахуйн нэгж: төлөвлөгөө, тайлангаа илгээнэ."
            icon={<LuSend size={26} />}
            href="/login/sender"
          />
          <OrgLoginCard
            title="Тайлан хянах байгууллага"
            subtitle="Хянах менежер, үнэлгээний гишүүд: тайланг хянаж үнэлнэ."
            icon={<LuFileSearch size={26} />}
            href="/login/reviewer"
          />
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <Link
            href="/login/admin"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800"
          >
            <LuUserCog size={16} />
            <span className="group-hover:underline">Системийн админ нэвтрэх</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
