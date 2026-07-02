import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яөүё]+/gi, '-')
    .replace(/^-+|-+$/g, '') || `type-${Date.now()}`;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const name = (data.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Нэр оруулна уу' }, { status: 400 });
    }

    let slug = slugify(name);
    // Guard against colliding with an existing slug (e.g. two types with
    // similar names) by appending a short suffix instead of failing.
    if (await prisma.reportType.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const reportType = await prisma.reportType.create({
      data: { name, slug, isActive: true },
    });
    return NextResponse.json(reportType, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Тайлангийн төрөл нэмэхэд алдаа гарлаа' }, { status: 500 });
  }
}
