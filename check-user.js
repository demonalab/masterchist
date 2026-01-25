const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check recent bookings with photos
  const bookings = await p.booking.findMany({
    where: { 
      OR: [
        { proCleaningPhotoFileIds: { isEmpty: false } },
        { service: { code: 'pro_cleaning' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { 
      id: true, 
      status: true,
      proCleaningDetails: true,
      proCleaningPhotoFileIds: true,
      createdAt: true,
      service: { select: { code: true, title: true } },
      address: { select: { addressLine: true } }
    }
  });
  console.log('Recent pro_cleaning bookings:', JSON.stringify(bookings, null, 2));

  // Check payment proofs
  const proofs = await p.paymentProof.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, bookingId: true, photoUrl: true, createdAt: true }
  });
  console.log('Recent payment proofs:', JSON.stringify(proofs, null, 2));
}

main().finally(() => p.$disconnect());
