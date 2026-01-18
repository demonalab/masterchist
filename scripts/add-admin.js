const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { telegramId: '18782420' },
      update: { isAdmin: true },
      create: { telegramId: '18782420', firstName: 'Roman', isAdmin: true }
    });
    console.log('Admin added:', user.id, 'isAdmin:', user.isAdmin);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
