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
  // Public endpoint - no auth required (availability is public info)
  
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
    
    // Next day - kits booked tomorrow block today's late slots (must return before tomorrow's booking)
    const nextDateObj = new Date(dateObj);
    nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);

    const [timeSlots, activeKits, todayBookings, yesterdayBookings, tomorrowBookings] = await Promise.all([
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
      // Bookings for next day (need kit back before this)
      prisma.booking.findMany({
        where: {
          scheduledDate: nextDateObj,
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
      existing.add(booking.cleaningKitId);
      bookedKitsPerSlot.set(booking.timeSlotId, existing);
    }
    
    // Kits booked yesterday - blocked until same slot today
    // Map: kitId -> slotSortOrder (kit is blocked for slots with sortOrder <= this value)
    const kitBlockedUntilSlot = new Map<string, number>();
    for (const booking of yesterdayBookings) {
      if (!booking.timeSlotId || !booking.cleaningKitId) continue;
      const slotOrder = slotSortOrder.get(booking.timeSlotId) ?? 0;
      kitBlockedUntilSlot.set(booking.cleaningKitId, slotOrder);
    }
    
    // Kits booked tomorrow - blocked from same slot today onwards
    // Map: kitId -> slotSortOrder (kit is blocked for slots with sortOrder >= this value)
    const kitBlockedFromSlot = new Map<string, number>();
    for (const booking of tomorrowBookings) {
      if (!booking.timeSlotId || !booking.cleaningKitId) continue;
      const slotOrder = slotSortOrder.get(booking.timeSlotId) ?? 0;
      // If same kit has multiple bookings tomorrow, use the earliest slot
      const existing = kitBlockedFromSlot.get(booking.cleaningKitId);
      if (existing === undefined || slotOrder < existing) {
        kitBlockedFromSlot.set(booking.cleaningKitId, slotOrder);
      }
    }

    const result: TimeSlotAvailability[] = timeSlots.map((slot) => {
      const bookedKitIds = new Set(bookedKitsPerSlot.get(slot.id) ?? []);
      
      // Add kits blocked from yesterday's bookings (kit rented for 24h, available after same slot next day)
      for (const [kitId, blockedUntilOrder] of kitBlockedUntilSlot) {
        if (slot.sortOrder <= blockedUntilOrder) {
          bookedKitIds.add(kitId);
        }
      }
      
      // Add kits blocked by tomorrow's bookings (must return before tomorrow's use)
      for (const [kitId, blockedFromOrder] of kitBlockedFromSlot) {
        if (slot.sortOrder >= blockedFromOrder) {
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

  // Monthly availability - for calendar view
  fastify.get<{ Querystring: { city: string; month: string; serviceCode: string } }>('/monthly', async (request, reply) => {
    const { city, month, serviceCode } = request.query;
    
    if (!city || !month || !serviceCode) {
      return reply.badRequest('city, month, and serviceCode are required');
    }
    
    // Parse month (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return reply.badRequest('month must be YYYY-MM format');
    }
    
    // Get first and last day of month
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0)); // Last day of month
    
    const [timeSlots, activeKits, bookingsInMonth] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.cleaningKit.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.booking.findMany({
        where: {
          scheduledDate: { gte: startDate, lte: endDate },
          status: { in: [...BLOCKING_STATUSES] },
          cleaningKitId: { not: null },
        },
        select: { scheduledDate: true, timeSlotId: true, cleaningKitId: true },
      }),
    ]);
    
    const totalKits = activeKits.length;
    const totalSlots = timeSlots.length;
    const maxBookingsPerDay = totalKits * totalSlots;
    
    // Count bookings per day
    const bookingsPerDay = new Map<string, number>();
    for (const booking of bookingsInMonth) {
      if (!booking.scheduledDate) continue;
      const dateStr = booking.scheduledDate.toISOString().split('T')[0] as string;
      bookingsPerDay.set(dateStr, (bookingsPerDay.get(dateStr) ?? 0) + 1);
    }
    
    // Build result for each day
    const result: { date: string; status: 'available' | 'limited' | 'full' | 'past'; slotsLeft: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0] as string;
      const bookingsCount = bookingsPerDay.get(dateStr) || 0;
      const slotsLeft = maxBookingsPerDay - bookingsCount;
      
      let status: 'available' | 'limited' | 'full' | 'past';
      
      if (d < today) {
        status = 'past';
      } else if (slotsLeft === 0) {
        status = 'full';
      } else if (slotsLeft <= Math.ceil(maxBookingsPerDay * 0.3)) {
        status = 'limited';
      } else {
        status = 'available';
      }
      
      result.push({ date: dateStr, status, slotsLeft });
    }
    
    return result;
  });
};

export default availabilityRoutes;
