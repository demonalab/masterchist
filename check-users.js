const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find users with this phone or name
  const users = await p.user.findMany({
    where: { 
      OR: [
        { phone: { contains: '79185093831' } }, 
        { firstName: 'Роман' },
        { username: 'temnidvor' }
      ] 
    },
    select: { 
      id: true, 
      phone: true, 
      telegramId: true, 
      maxId: true, 
      firstName: true, 
      username: true 
    }
  });
  
  console.log('Users found:');
  console.log(JSON.stringify(users, null, 2));
  
  // Check addresses for each user
  for (const u of users) {
    const addrs = await p.address.findMany({ where: { userId: u.id } });
    console.log(`Addresses for user ${u.id} (${u.firstName || u.telegramId || u.maxId}):`, addrs.length);
  }
}

main().finally(() => p.$disconnect());
