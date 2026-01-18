const { prisma } = require('@himchistka/db');

async function main() {
  const user = await prisma.user.upsert({
    where: { telegramId: '18782420' },
    update: { isAdmin: true },
    create: { telegramId: '18782420', firstName: 'Roman', isAdmin: true }
  });
  console.log('Admin added:', user.id, 'isAdmin:', user.isAdmin);
}

main().catch(console.error);
