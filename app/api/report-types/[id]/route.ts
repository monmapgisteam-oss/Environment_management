import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Rename and/or activate-deactivate a report type. Deactivating (not
// deleting) keeps existing reports of that type intact while hiding it from
// new-report pickers.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
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

    const reportType = await prisma.reportType.update({
      where: { id: params.id },
      data: update,
    });
    return NextResponse.json(reportType);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Шинэчлэхэд алдаа гарлаа' }, { status: 500 });
  }
}
