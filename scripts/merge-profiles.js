const { PrismaClient } = require('../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all users
  const users = await prisma.user.findMany({
    select: { id: true, telegramId: true, maxId: true, phone: true, firstName: true }
  });
  
  console.log('All users:');
  users.forEach(u => console.log(JSON.stringify(u)));
  
  // Find users that need merging (same numeric ID for telegram and max)
  const telegramUsers = users.filter(u => u.telegramId);
  const maxUsers = users.filter(u => u.maxId && !u.telegramId);
  
  console.log('\nTelegram users:', telegramUsers.length);
  console.log('MAX-only users:', maxUsers.length);
  
  // Check for users with same ID
  for (const tgUser of telegramUsers) {
    const matchingMax = maxUsers.find(m => m.maxId === tgUser.telegramId && m.id !== tgUser.id);
    if (matchingMax) {
      console.log('\nFound matching profiles to merge:');
      console.log('Telegram:', JSON.stringify(tgUser));
      console.log('MAX:', JSON.stringify(matchingMax));
      
      // Move bookings from MAX user to Telegram user FIRST
      const bookings = await prisma.booking.updateMany({
        where: { userId: matchingMax.id },
        data: { userId: tgUser.id }
      });
      console.log('Moved', bookings.count, 'bookings');
      
      // Move addresses from MAX user to Telegram user
      const addresses = await prisma.address.updateMany({
        where: { userId: matchingMax.id },
        data: { userId: tgUser.id }
      });
      console.log('Moved', addresses.count, 'addresses');
      
      // Delete MAX user BEFORE adding maxId (to avoid unique constraint)
      const maxIdToAdd = matchingMax.maxId;
      await prisma.user.delete({ where: { id: matchingMax.id } });
      console.log('Deleted MAX user profile');
      
      // Now add maxId to telegram user if it doesn't have one
      if (!tgUser.maxId) {
        await prisma.user.update({
          where: { id: tgUser.id },
          data: { maxId: maxIdToAdd }
        });
        console.log('Added maxId to telegram user');
      } else {
        console.log('Telegram user already has maxId:', tgUser.maxId);
      }
    }
  }
  
  // Also check for MAX users matching telegram users by ID (reverse check)
  for (const maxUser of maxUsers) {
    const matchingTg = telegramUsers.find(t => t.telegramId === maxUser.maxId && t.id !== maxUser.id);
    if (matchingTg) {
      console.log('\nFound MAX user that matches Telegram user ID:');
      console.log('MAX:', JSON.stringify(maxUser));
      console.log('Telegram:', JSON.stringify(matchingTg));
      
      // Move bookings
      const bookings = await prisma.booking.updateMany({
        where: { userId: maxUser.id },
        data: { userId: matchingTg.id }
      });
      console.log('Moved', bookings.count, 'bookings');
      
      // Move addresses
      const addresses = await prisma.address.updateMany({
        where: { userId: maxUser.id },
        data: { userId: matchingTg.id }
      });
      console.log('Moved', addresses.count, 'addresses');
      
      // Delete duplicate MAX user
      await prisma.user.delete({ where: { id: maxUser.id } });
      console.log('Deleted duplicate MAX user');
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
