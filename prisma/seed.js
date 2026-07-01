const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.evaluationScore.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.reportAssignment.deleteMany();
  await prisma.reportLocation.deleteMany();
  await prisma.report.deleteMany();
  await prisma.reportType.deleteMany();
  await prisma.evaluationCriterion.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // A single sender organisation is enough for this system.
  const senderCompanies = [
    await prisma.company.create({
      data: {
        name: 'Илгээх байгууллага',
        registerNumber: '2036479',
        type: 'sender',
      },
    }),
  ];

  const reviewerCompany = await prisma.company.create({
    data: {
      name: 'Хянах байгууллага',
      registerNumber: 'REV001',
      type: 'reviewer',
    },
  });

  const adminCompany = await prisma.company.create({
    data: {
      name: 'Системийн удирдлага',
      registerNumber: 'ADM001',
      type: 'admin',
    },
  });

  const reportTypes = [
    { name: 'Жилийн төлөвлөгөө', slug: 'type-1' },
    { name: 'Биелэлтийн тайлан', slug: 'type-2' },
    { name: 'Нэмэлт мэдээ', slug: 'type-5' },
  ];

  const createdTypes = [];
  for (const type of reportTypes) {
    createdTypes.push(
      await prisma.reportType.create({
        data: { ...type, isActive: true },
      }),
    );
  }

  const criteria = [
    { name: 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөөний биелэлт', maxScore: 20 },
    { name: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөөний биелэлт', maxScore: 15 },
    { name: 'Түүх, соёлын өвийг хамгаалах арга хэмжээний биелэлт', maxScore: 5 },
    { name: 'Осол, эрсдэлийн менежментийн төлөвлөгөөний биелэлт', maxScore: 20 },
    { name: 'Хог, хаягдлын менежментийн төлөвлөгөөний биелэлт', maxScore: 20 },
    { name: 'Орчны хяналт шинжилгээний хөтөлбөрийн биелэлт', maxScore: 10 },
    { name: 'Удирдлага зохион байгуулалтын төлөвлөгөөний биелэлт', maxScore: 5 },
    { name: 'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөөний биелэлт', maxScore: 5 },
  ];

  for (let i = 0; i < criteria.length; i += 1) {
    await prisma.evaluationCriterion.create({
      data: {
        name: criteria[i].name,
        maxScore: criteria[i].maxScore,
        sortOrder: i + 1,
      },
    });
  }

  // Create sender users
  const senderUsers = [];
  for (let i = 0; i < senderCompanies.length; i += 1) {
    senderUsers.push(
      await prisma.user.create({
        data: {
          name: `Илгээх хэрэглэгч ${i + 1}`,
          email: `sender${i + 1}@tailan.mn`,
          password: '123',
          role: 'sender',
          companyId: senderCompanies[i].id,
          phone: `99${200000 + i}`,
          position: 'Тайлан хариуцсан мэргэжилтэн',
        },
      }),
    );
  }

  const adminUser = await prisma.user.create({
    data: {
      name: 'Админ Хэрэглэгч',
      email: 'admin@tailan.mn',
      password: '123',
      role: 'admin',
      companyId: adminCompany.id,
      phone: '99111222',
      position: 'Систем админ',
    },
  });

  const reviewManager = await prisma.user.create({
    data: {
      name: 'Хяналтын менежер',
      email: 'manager@tailan.mn',
      password: '123',
      role: 'review_manager',
      companyId: reviewerCompany.id,
      phone: '99122334',
      position: 'Хянах албаны менежер',
    },
  });

  const evaluators = [];

  // Dedicated staff (evaluator) logins that share the review organisation
  // portal with the manager. Staff review and score the reports.
  const staffAccounts = [
    { email: 'staff@tailan.mn', name: 'Үнэлгээний ажилтан', phone: '99155667' },
    { email: 'staff2@tailan.mn', name: 'Үнэлгээний ажилтан 2', phone: '99155668' },
    { email: 'staff3@tailan.mn', name: 'Үнэлгээний ажилтан 3', phone: '99155669' },
  ];
  for (const account of staffAccounts) {
    evaluators.push(
      await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          password: '123',
          role: 'evaluator',
          companyId: reviewerCompany.id,
          phone: account.phone,
          position: 'Үнэлгээний ажилтан',
        },
      }),
    );
  }

  const reports = [];
  const locations = [
    { province: 'Улаанбаатар', district: 'Баянзүрх', khoroo: '5-р хороо', latitude: 47.9025, longitude: 106.9186 },
    { province: 'Дархан-Уул', district: 'Дархан', khoroo: 'Цамбагарав', latitude: 49.5070, longitude: 105.9250 },
    { province: 'Сэлэнгэ', district: 'Сүхбаатар', khoroo: '7-р хороо', latitude: 49.1000, longitude: 106.9000 },
    { province: 'Хэнтий', district: 'Чингис', khoroo: '1-р хороо', latitude: 47.7422, longitude: 108.6891 },
    { province: 'Орхон', district: 'Жаргалант', khoroo: '3-р хороо', latitude: 47.9200, longitude: 106.9166 },
  ];

  for (let i = 0; i < 10; i += 1) {
    const sender = senderCompanies[i % senderCompanies.length];
    const type = createdTypes[i % createdTypes.length];
    const statusOptions = ['submitted', 'assigned', 'in_review', 'needs_revision', 'completed', 'approved', 'rejected'];
    const status = statusOptions[i % statusOptions.length];
    const submittedAt = new Date(Date.now() - (i * 86400000));
    const year = 2025;
    const report = await prisma.report.create({
      data: {
        reportNumber: `RPT-${1000 + i}`,
        reportTypeId: type.id,
        senderCompanyId: sender.id,
        title: `${type.name} - ${sender.name}`,
        description: `${sender.name} компанийн тайланг илгээгдсэн.`,
        fileUrl: 'https://tailan.mn/files/sample.pdf',
        status,
        finalScore: status === 'completed' || status === 'approved' ? 88.4 + i : null,
        year,
        submittedAt,
        location: {
          create: {
            province: locations[i % locations.length].province,
            district: locations[i % locations.length].district,
            khoroo: locations[i % locations.length].khoroo,
            addressDetail: `Тодорхой хаяг ${i + 1}`,
            latitude: locations[i % locations.length].latitude,
            longitude: locations[i % locations.length].longitude,
          },
        },
      },
    });
    reports.push(report);
  }

  for (let i = 0; i < reports.length; i += 1) {
    const report = reports[i];
    const assigned = await prisma.reportAssignment.create({
      data: {
        reportId: report.id,
        evaluatorUserId: evaluators[i % evaluators.length].id,
        assignedByUserId: reviewManager.id,
        status: i % 2 === 0 ? 'submitted' : 'pending',
        deadline: new Date(Date.now() + 5 * 86400000),
      },
    });

    if (assigned.status === 'submitted') {
      const evaluation = await prisma.evaluation.create({
        data: {
          assignmentId: assigned.id,
          reportId: report.id,
          totalScore: 85 + i,
          comment: 'Тайланг сайн судалж үнэллээ.',
        },
      });
      const allCriteria = await prisma.evaluationCriterion.findMany({});
      await Promise.all(
        allCriteria.map((criterion) =>
          prisma.evaluationScore.create({
            data: {
              evaluationId: evaluation.id,
              criterionId: criterion.id,
              score: Math.min(criterion.maxScore, Math.max(0, Math.floor(criterion.maxScore * 0.8))),
            },
          }),
        ),
      );
    }
  }

  await prisma.notification.create({
    data: {
      userId: reviewManager.id,
      reportId: reports[0].id,
      title: 'Шинэ тайлан ирлээ',
      message: `${reports[0].title} тайлан хянагдахад орж байна.`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: evaluators[0].id,
      reportId: reports[1].id,
      title: 'Танд тайлан оноогдлоо',
      message: `${reports[1].title} тайланд үнэлгээ хийх үүрэг даалгавар ирлээ.`,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: reviewManager.id,
      reportId: reports[0].id,
      action: 'Report Submitted',
      description: `${reports[0].title} тайлан илгээсэн.`,
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
