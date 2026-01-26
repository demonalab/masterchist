const { PrismaClient } = require('@prisma/client');
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
      
      // Add maxId to telegram user
      await prisma.user.update({
        where: { id: tgUser.id },
        data: { maxId: matchingMax.maxId }
      });
      console.log('Added maxId to telegram user');
      
      // Move bookings from MAX user to Telegram user
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
      
      // Delete MAX user
      await prisma.user.delete({ where: { id: matchingMax.id } });
      console.log('Deleted MAX user profile');
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
