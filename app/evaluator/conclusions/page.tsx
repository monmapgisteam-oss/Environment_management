import { redirect } from 'next/navigation';
import dataStore from '@/lib/db';
import ConclusionSectionPage from '@/components/ConclusionSectionPage';
import { getCurrentUser } from '@/lib/auth';
import { fetchConclusionRows } from '@/lib/conclusionReports';
import type { ConclusionSearchParams } from '@/lib/conclusions';

type Props = {
  searchParams: Promise<ConclusionSearchParams>;
};

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export default async function EvaluatorConclusionsPage(props: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const searchParams = await props.searchParams;
  const [rows, reportTypes] = await Promise.all([
    fetchConclusionRows(searchParams),
    fetchReportTypes(),
  ]);
  const additionalType = reportTypes.find((rt: any) => rt.name.includes('Нэмэлт'));
  const sidebarChildren = reportTypes
    .filter((rt: any) => !rt.name.includes('Нэмэлт'))
    .map((rt: any) => ({ label: rt.name, href: `/evaluator?type=${rt.slug}` }));

  return (
    <ConclusionSectionPage
      rows={rows}
      search={searchParams}
      role="staff"
      userName={user.name}
      headerRole="staff"
      sidebarItems={[
        {
          label: 'Надад оноогдсон тайлангууд',
          href: '/evaluator',
          children: sidebarChildren,
        },
        { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
        { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
        { label: 'Тайлан хайх', href: '/evaluator/survey' },
        ...(additionalType
          ? [{ label: 'Нэмэлт мэдээлэл', href: `/evaluator?type=${additionalType.slug}` }]
          : []),
      ]}
    />
  );
}
