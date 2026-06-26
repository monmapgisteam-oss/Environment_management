const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Removes every report and its related data so the workflow can be tested
// from scratch. Keeps companies, users, report types and evaluation criteria
// intact so you can still log in, pick a report type and evaluate.
async function main() {
  const scores = await prisma.evaluationScore.deleteMany();
  const evaluations = await prisma.evaluation.deleteMany();
  const assignments = await prisma.reportAssignment.deleteMany();
  const locations = await prisma.reportLocation.deleteMany();
  // Notifications and activity logs reference reports, so clear them too.
  const notifications = await prisma.notification.deleteMany();
  const activityLogs = await prisma.activityLog.deleteMany();
  const reports = await prisma.report.deleteMany();

  console.log('Cleared report data:');
  console.log(`  reports:           ${reports.count}`);
  console.log(`  locations:         ${locations.count}`);
  console.log(`  assignments:       ${assignments.count}`);
  console.log(`  evaluations:       ${evaluations.count}`);
  console.log(`  evaluation scores: ${scores.count}`);
  console.log(`  notifications:     ${notifications.count}`);
  console.log(`  activity logs:     ${activityLogs.count}`);

  const remaining = {
    companies: await prisma.company.count(),
    users: await prisma.user.count(),
    reportTypes: await prisma.reportType.count(),
    criteria: await prisma.evaluationCriterion.count(),
  };
  console.log('Kept for testing:', remaining);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
