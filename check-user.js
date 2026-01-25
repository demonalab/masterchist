const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  // Phone user ID
  const phoneUserId = 'b537b815-7663-4193-bf1b-63a548a27781';
  // Telegram user ID (@temnidvor)
  const tgUserId = '0009b679-95c4-43f8-9b60-f10029728530';

  console.log('Merging Telegram user @temnidvor into phone user...');

  // Move addresses from TG user to phone user
  const addrResult = await p.address.updateMany({
    where: { userId: tgUserId },
    data: { userId: phoneUserId }
  });
  console.log('Addresses moved:', addrResult.count);

  // Move bookings from TG user to phone user
  const bookResult = await p.booking.updateMany({
    where: { userId: tgUserId },
    data: { userId: phoneUserId }
  });
  console.log('Bookings moved:', bookResult.count);

  // Delete old TG user FIRST (to free up telegramId)
  await p.user.delete({ where: { id: tgUserId } });
  console.log('Old TG user deleted');

  // NOW update phone user with telegramId and username
  await p.user.update({
    where: { id: phoneUserId },
    data: { 
      telegramId: '8468584965',
      username: 'temnidvor'
    }
  });
  console.log('Phone user updated with telegramId and username');

  // Verify
  const result = await p.user.findUnique({
    where: { id: phoneUserId },
    select: { 
      id: true, phone: true, telegramId: true, maxId: true, username: true, firstName: true,
      addresses: { where: { isSaved: true }, select: { id: true, addressLine: true, label: true } }
    }
  });
  console.log('Final merged user:', JSON.stringify(result, null, 2));
}

main().finally(() => p.$disconnect());
