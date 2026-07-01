const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const senderCompanies = await prisma.company.findMany({
    where: { type: 'sender' },
    orderBy: { registerNumber: 'asc' },
  });

  if (senderCompanies.length === 0) {
    throw new Error('No sender companies found. Run npx prisma db seed first.');
  }

  for (let i = 1; i <= senderCompanies.length; i++) {
    await prisma.user.upsert({
      where: { email: `sender${i}@tailan.mn` },
      update: {
        password: '123',
        role: 'sender',
        companyId: senderCompanies[i - 1].id,
      },
      create: {
        name: `Илгээгч ${i}`,
        email: `sender${i}@tailan.mn`,
        password: '123',
        role: 'sender',
        companyId: senderCompanies[i - 1].id,
        phone: `9900000${i}`,
        position: 'Тайлан илгээгч',
      },
    });
  }

  console.log('Sender users created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
