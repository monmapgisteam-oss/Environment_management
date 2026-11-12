import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { CORE_TYPE_SLUGS } from '@shared/reports/terms';

// Rename and/or activate-deactivate a report type. Deactivating (not
// deleting) keeps existing reports of that type intact while hiding it from
// new-report pickers. The two core types the workflow is built on (plan and
// performance report) can't be renamed or switched off.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await getApiUser('admin'))) return unauthorized();
  const params = await props.params;
  try {
    const existing = await dataStore.reportType.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Тайлангийн төрөл олдсонгүй.' }, { status: 404 });
    if (CORE_TYPE_SLUGS.includes(existing.slug)) {
      return NextResponse.json({ error: 'Үндсэн төрлийг өөрчлөх боломжгүй.' }, { status: 400 });
    }
    const data = await request.json();
    const update: { name?: string; isActive?: boolean } = {};
    if (typeof data.name === 'string') {
      const name = data.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'Нэр оруулна уу' }, { status: 400 });
      }
      update.name = name;
    }
    if (typeof data.isActive === 'boolean') {
      update.isActive = data.isActive;
    }

    const reportType = await dataStore.reportType.update({
      where: { id: params.id },
      data: update,
    });
    return NextResponse.json(reportType);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Шинэчлэхэд алдаа гарлаа' }, { status: 500 });
  }
}
