import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { parseCriterionFields } from '@/lib/reports/criteria';

// Edit one scoring criterion: name, score, order, active flag.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await getApiUser('admin'))) return unauthorized();
  const params = await props.params;
  try {
    const data = await request.json();
    const parsed = parseCriterionFields(data, { partial: true });
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const update: Record<string, unknown> = { ...parsed.fields };
    if (typeof data.isActive === 'boolean') update.isActive = data.isActive;
    if (Number.isInteger(data.sortOrder) && data.sortOrder >= 0) update.sortOrder = data.sortOrder;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Өөрчлөлт алга' }, { status: 400 });
    }
    const criterion = await dataStore.evaluationCriterion.update({ where: { id: params.id }, data: update });
    return NextResponse.json(criterion);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Шинэчлэхэд алдаа гарлаа' }, { status: 500 });
  }
}

// Remove a criterion nobody has scored yet. Scored criteria are deactivated
// instead so past evaluations keep their rows.
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await getApiUser('admin'))) return unauthorized();
  const params = await props.params;
  try {
    const used = await dataStore.evaluationScore.count({ where: { criterionId: params.id } });
    if (used > 0) {
      return NextResponse.json(
        { error: 'Энэ шалгуураар оноо өгсөн үнэлгээ байгаа тул устгах боломжгүй. Идэвхгүй болгоно уу.' },
        { status: 409 },
      );
    }
    await dataStore.evaluationCriterion.deleteMany({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Устгахад алдаа гарлаа' }, { status: 500 });
  }
}
