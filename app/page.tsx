import Link from 'next/link';
import { HiOutlineUpload, HiOutlineSearch } from 'react-icons/hi';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg px-4 py-12">
      <div className="max-w-5xl w-full bg-white rounded-[32px] shadow-soft p-8 md:p-12 border border-sky-100">
        <div className="text-center mb-10">
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold text-navy">Тайлан илгээх, үнэлгээ өгөх систем</h1>
          <p className="mt-3 text-base text-slate-600">Та нэвтрэх төрлөө сонгоно уу</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Link href="/login/sender" className="group block rounded-3xl border border-sky-100 bg-white p-8 text-center transition hover:-translate-y-1 hover:shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-[#2563EB] mb-5">
              <HiOutlineUpload size={32} />
            </div>
            <p className="text-xl font-semibold text-[#08264A]">Тайлан илгээх байгууллага</p>
            <span className="mt-6 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0c3f6b]">
              Нэвтрэх
            </span>
          </Link>

          <Link href="/login/reviewer" className="group block rounded-3xl border border-sky-100 bg-white p-8 text-center transition hover:-translate-y-1 hover:shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-[#2563EB] mb-5">
              <HiOutlineSearch size={32} />
            </div>
            <p className="text-xl font-semibold text-[#08264A]">Тайлан хянах байгууллага</p>
            <span className="mt-6 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0c3f6b]">
              Нэвтрэх
            </span>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/login/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary">
            <span>Системийн админ нэвтрэх</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
