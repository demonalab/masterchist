import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { Cities, ServiceCodes, BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const availabilityQuerySchema = z.object({
  city: z.enum([Cities.ROSTOV_NA_DONU, Cities.BATAYSK, Cities.STAVROPOL]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  serviceCode: z.literal(ServiceCodes.SELF_CLEANING),
});

type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

interface TimeSlotAvailability {
  timeSlotId: string;
  startTime: string;
  endTime: string;
  available: boolean;
  availableKitNumber?: number;
}

const BLOCKING_STATUSES = [
  BookingStatuses.NEW,
  BookingStatuses.AWAITING_PREPAYMENT,
  BookingStatuses.PREPAID,
  BookingStatuses.CONFIRMED,
] as const;

const availabilityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get<{ Querystring: AvailabilityQuery }>('/', async (request, reply) => {
    const parseResult = availabilityQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid query');
    }

    const { scheduledDate } = parseResult.data;
    const dateObj = new Date(scheduledDate + 'T00:00:00.000Z');
    
    // Previous day - kits booked yesterday are unavailable until their slot time today
    const prevDateObj = new Date(dateObj);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);

    const [timeSlots, activeKits, todayBookings, yesterdayBookings] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, startTime: true, endTime: true, sortOrder: true },
      }),
      prisma.cleaningKit.findMany({
        where: { isActive: true },
        orderBy: { number: 'asc' },
        select: { id: true, number: true },
      }),
      // Bookings for requested date
      prisma.booking.findMany({
        where: {
          scheduledDate: dateObj,
          status: { in: [...BLOCKING_STATUSES] },
          cleaningKitId: { not: null },
        },
        select: { timeSlotId: true, cleaningKitId: true },
      }),
      // Bookings from previous day (kit rented for 24h)
      prisma.booking.findMany({
        where: {
          scheduledDate: prevDateObj,
          status: { in: [...BLOCKING_STATUSES] },
          cleaningKitId: { not: null },
        },
        select: { timeSlotId: true, cleaningKitId: true },
      }),
    ]);

    const totalKits = activeKits.length;
    
    // Build map: slotId -> sortOrder for comparison
    const slotSortOrder = new Map<string, number>();
    for (const slot of timeSlots) {
      slotSortOrder.set(slot.id, slot.sortOrder);
    }

    // Kits booked today per slot
    const bookedKitsPerSlot = new Map<string, Set<string>>();
    for (const booking of todayBookings) {
      if (!booking.timeSlotId || !booking.cleaningKitId) continue;
      const existing = bookedKitsPerSlot.get(booking.timeSlotId) ?? new Set();
      existing.add(booking.cleaningKitId visir);
      bookedKitsPerSlot.set(booking.timeSlotId, existing);
    }
    
    // Kits booked yesterday - blocked until same slot today
    // Map: kitId -> slotSortOrder (kit is blocked for slots with sortOrder < this value)
    const kitBlockedUntilSlot = new Map<string, number>();
    for (const booking of yesterdayBookings) {
      if (!booking.timeSlotId || !booking.cleaningKitId) continue;
      const slotOrder = slotSortOrder.get(booking.timeSlotId) ?? 0;
      kitBlockedUntilSlot.set(booking.cleaningKitId, slotOrder);
    }

    const result: TimeSlotAvailability[] = timeSlots.map((slot) => {
      const bookedKitIds = new Set(bookedKitsPerSlot.get(slot.id) ?? []);
      
      // Add kits blocked from yesterday's bookings
      for (const [kitId, blockedUntilOrder] of kitBlockedUntilSlot) {
        if (slot.sortOrder < blockedUntilOrder) {
          bookedKitIds.add(kitId);
        }
      }
      
      const available = bookedKitIds.size < totalKits;

      // Find first available kit number
      let availableKitNumber: number | undefined;
      if (available) {
        const freeKit = activeKits.find(kit => !bookedKitIds.has(kit.id));
        availableKitNumber = freeKit?.number;
      }

      return {
        timeSlotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        available,
        availableKitNumber,
      };
    });

    return result;
  });
};

export default availabilityRoutes;
