import dataStore from '@/lib/arcgis/data';
import ConclusionSectionPage from '@/components/ConclusionSectionPage';
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

export default async function ReviewerConclusionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const [rows, reportTypes] = await Promise.all([
    fetchConclusionRows(searchParams),
    fetchReportTypes(),
  ]);
  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
    }));

  return (
    <ConclusionSectionPage
      rows={rows}
      search={searchParams}
      role="reviewer"
      userName="Хянах менежер"
      headerRole="reviewer"
      sidebarItems={[
        { label: 'Хяналтын самбар', href: '/reviewer' },
        {
          label: 'Ирсэн тайлангууд',
          href: '/reviewer/reports',
          children: sidebarChildren,
        },
        { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
        { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
        { label: 'Тайлан хайх', href: '/reviewer/survey' },
        { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
        { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
      ]}
    />
  );
}
