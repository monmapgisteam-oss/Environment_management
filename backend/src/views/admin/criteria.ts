import dataStore from '@/lib/db';
import { defineView } from '../define';

export default defineView({
  name: 'admin/criteria',
  roles: ['admin'],
  async load() {
    const criteria = await dataStore.evaluationCriterion.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { scores: true } } },
    });
    return {
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        sheet: c.sheet,
        maxScore: c.maxScore,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        scoreCount: c._count.scores,
      })),
    };
  },
});
