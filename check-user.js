const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find users with saved addresses
  const usersWithAddresses = await p.user.findMany({
    where: { addresses: { some: { isSaved: true } } },
    select: { 
      id: true, phone: true, telegramId: true, maxId: true, username: true, firstName: true,
      addresses: { where: { isSaved: true }, select: { id: true, addressLine: true, label: true } }
    }
  });
  console.log('Users with addresses:', JSON.stringify(usersWithAddresses, null, 2));
}

main().finally(() => p.$disconnect());
