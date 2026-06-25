import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const senderCompany = await prisma.company.findFirst({
      where: { type: 'sender' },
    });
    if (!senderCompany) {
      return NextResponse.json({ error: 'No sender company found' }, { status: 400 });
    }

    const typeValue = data.reportType?.trim() || '';
    let reportType = typeValue
      ? await prisma.reportType.findFirst({
          where: { OR: [{ id: typeValue }, { slug: typeValue }, { name: typeValue }] },
        })
      : null;
    if (!reportType) {
      reportType = await prisma.reportType.findFirst({ where: { isActive: true } });
    }
    if (!reportType) {
      return NextResponse.json({ error: 'No report type found' }, { status: 400 });
    }
    const reportTypeId = reportType.id;

    const reportNumber = (data.reportNumber && data.reportNumber.trim()) || `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const status = data.status === 'draft' ? 'draft' : 'submitted';

    const report = await prisma.report.create({
      data: {
        reportNumber,
        reportTypeId,
        senderCompanyId: senderCompany.id,
        title: data.title || 'Тайлан',
        description: data.description || null,
        status,
        year: new Date().getFullYear(),
        submittedAt: status === 'draft' ? null : new Date(),
        ...(data.province && data.district && data.khoroo ? {
          location: {
            create: {
              province: data.province,
              district: data.district,
              khoroo: data.khoroo,
              addressDetail: data.addressDetail || null,
              latitude: data.latitude ? parseFloat(data.latitude) : null,
              longitude: data.longitude ? parseFloat(data.longitude) : null,
            },
          },
        } : {}),
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
