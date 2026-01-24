import { PrismaClient, ServiceCode, City } from '@prisma/client';

const prisma = new PrismaClient();

const CLEANING_KITS = [
  { number: 1 },
  { number: 2 },
  { number: 3 },
] as const;

const TIME_SLOTS = [
  { code: 'SLOT_07_08', startTime: '07:00', endTime: '08:00', sortOrder: 1 },
  { code: 'SLOT_08_09', startTime: '08:00', endTime: '09:00', sortOrder: 2 },
  { code: 'SLOT_09_10', startTime: '09:00', endTime: '10:00', sortOrder: 3 },
] as const;

const SERVICES = [
  {
    code: ServiceCode.self_cleaning,
    title: 'Химчистка самообслуживания',
    priceRub: 1500,
    prepaymentRub: 500,
    isActive: true,
  },
  {
    code: ServiceCode.pro_cleaning,
    title: 'Профессиональная химчистка мастером',
    priceRub: 0,
    prepaymentRub: null,
    isActive: true,
  },
  {
    code: ServiceCode.cleaning,
    title: 'Клининг',
    priceRub: 0,
    prepaymentRub: null,
    isActive: false,
  },
] as const;

const CITY_SETTINGS = [
  {
    city: City.ROSTOV_NA_DONU,
    isActive: true,
    deliveryPriceRub: 0,
    workingHoursFrom: '07:00',
    workingHoursTo: '21:00',
  },
  {
    city: City.BATAYSK,
    isActive: true,
    deliveryPriceRub: 200,
    workingHoursFrom: '08:00',
    workingHoursTo: '20:00',
  },
  {
    city: City.STAVROPOL,
    isActive: true,
    deliveryPriceRub: 0,
    workingHoursFrom: '08:00',
    workingHoursTo: '20:00',
  },
] as const;

async function seedCleaningKits() {
  for (const kit of CLEANING_KITS) {
    await prisma.cleaningKit.upsert({
      where: { number: kit.number },
      update: { isActive: true },
      create: { number: kit.number, isActive: true },
    });
  }
  console.log(`Seeded ${CLEANING_KITS.length} cleaning kits`);
}

async function seedTimeSlots() {
  for (const slot of TIME_SLOTS) {
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
  console.log(`Seeded ${TIME_SLOTS.length} time slots`);
}

async function seedServices() {
  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: {
        title: service.title,
        priceRub: service.priceRub,
        prepaymentRub: service.prepaymentRub,
        isActive: service.isActive,
      },
      create: {
        code: service.code,
        title: service.title,
        priceRub: service.priceRub,
        prepaymentRub: service.prepaymentRub ?? undefined,
        isActive: service.isActive,
      },
    });
  }
  console.log(`Seeded ${SERVICES.length} services`);
}

async function seedCitySettings() {
  for (const settings of CITY_SETTINGS) {
    await prisma.citySettings.upsert({
      where: { city: settings.city },
      update: {
        isActive: settings.isActive,
        deliveryPriceRub: settings.deliveryPriceRub,
        workingHoursFrom: settings.workingHoursFrom,
        workingHoursTo: settings.workingHoursTo,
      },
      create: {
        city: settings.city,
        isActive: settings.isActive,
        deliveryPriceRub: settings.deliveryPriceRub,
        workingHoursFrom: settings.workingHoursFrom,
        workingHoursTo: settings.workingHoursTo,
      },
    });
  }
  console.log(`Seeded ${CITY_SETTINGS.length} city settings`);
}

async function main() {
  console.log('Starting seed...');
  await seedCleaningKits();
  await seedTimeSlots();
  await seedServices();
  await seedCitySettings();
  console.log('Seed completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
