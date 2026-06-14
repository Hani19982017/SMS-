const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@aqar.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Admin',
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  await prisma.template.upsert({
    where: { name: 'intro_real_estate' },
    update: {},
    create: {
      name: 'intro_real_estate',
      language: 'ar',
      category: 'MARKETING',
      bodyText: 'Hello {{1}}, we are a real estate marketing team. Do you have a property for rent or sale?',
      variableCount: 1,
    },
  });

  console.log('Admin account created:', email);
  console.log('Password:', password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());