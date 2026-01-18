import { PrismaClient, ServiceCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.service.upsert({
    where: { code: ServiceCode.self_cleaning },
    update: {},
    create: {
      code: ServiceCode.self_cleaning,
      title: 'Химчистка самообслуживания',
      priceRub: 1500,
      prepaymentRub: 500,
      isActive: true,
    },
  });

  await prisma.service.upsert({
    where: { code: ServiceCode.pro_cleaning },
    update: {},
    create: {
      code: ServiceCode.pro_cleaning,
      title: 'Профессиональная химчистка мастером',
      priceRub: 0,
      prepaymentRub: null,
      isActive: true,
    },
  });

  await prisma.service.upsert({
    where: { code: ServiceCode.cleaning },
    update: {},
    create: {
      code: ServiceCode.cleaning,
      title: 'Клининг',
      priceRub: 0,
      prepaymentRub: null,
      isActive: true,
    },
  });

  for (const number of [1, 2, 3]) {
    await prisma.cleaningKit.upsert({
      where: { number },
      update: { isActive: true },
      create: { number, isActive: true },
    });
  }

  const timeSlots = [
    { code: '07:00-08:00', startTime: '07:00', endTime: '08:00', sortOrder: 1 },
    { code: '08:00-09:00', startTime: '08:00', endTime: '09:00', sortOrder: 2 },
    { code: '09:00-10:00', startTime: '09:00', endTime: '10:00', sortOrder: 3 },
  ];

  for (const slot of timeSlots) {
    await prisma.timeSlot.upsert({
      where: { code: slot.code },
      update: {
        startTime: slot.startTime,
        endTime: slot.endTime,
        sortOrder: slot.sortOrder,
        isActive: true,
      },
      create: {
        code: slot.code,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sortOrder: slot.sortOrder,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    await prisma.$disconnect();
    throw err;
  });
