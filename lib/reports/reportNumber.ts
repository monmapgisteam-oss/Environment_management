import dataStore from '@/lib/db';

// Report numbers are assigned by the server as RPT-<year>-<sequence>, e.g.
// RPT-2026-0007. The sequence restarts every year.
export async function nextReportNumber(year = new Date().getFullYear()) {
  const prefix = `RPT-${year}-`;
  // '.' sorts right after '-', so this range holds exactly this year's numbers.
  const reports = await dataStore.report.findMany({
    where: { reportNumber: { gte: prefix, lt: `RPT-${year}.` } },
    select: { reportNumber: true },
  });
  const last = reports.reduce((max, report) => {
    const sequence = Number(report.reportNumber.slice(prefix.length));
    return Number.isInteger(sequence) && sequence > max ? sequence : max;
  }, 0);
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
}

// Runs `create` with a fresh number, retrying when another report took the
// same number in the meantime.
export async function withNextReportNumber<T>(create: (reportNumber: string) => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(await nextReportNumber());
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Error) || !/unique/i.test(error.message)) throw error;
    }
  }
}
