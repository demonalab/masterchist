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

    const { city, scheduledDate } = parseResult.data;
    
    // Check if city is active
    const citySettings = await prisma.citySettings.findUnique({ where: { city: city as any } });
    if (citySettings && !citySettings.isActive) {
      return reply.badRequest('Город временно недоступен');
    }
    const dateObj = new Date(scheduledDate + 'T00:00:00.000Z');
    
    // Previous day
    const prevDateObj = new Date(dateObj);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    
    // Next day
    const nextDateObj = new Date(dateObj);
    nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);

    // NEW LOGIC: 1 courier - if a time slot is booked on any of 3 days (yesterday, today, tomorrow),
    // it's unavailable for the requested date
    const [timeSlots, bookingsIn3Days] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, startTime: true, endTime: true, sortOrder: true },
      }),
      // Get all bookings for yesterday, today, and tomorrow
      prisma.booking.findMany({
        where: {
          scheduledDate: { in: [prevDateObj, dateObj, nextDateObj] },
          status: { in: [...BLOCKING_STATUSES] },
          timeSlotId: { not: null },
        },
        select: { timeSlotId: true, scheduledDate: true },
      }),
    ]);

    // Build set of blocked time slots for the requested date
    // A slot is blocked if it's booked on yesterday, today, or tomorrow
    const blockedSlotIds = new Set<string>();
    for (const booking of bookingsIn3Days) {
      if (booking.timeSlotId) {
        blockedSlotIds.add(booking.timeSlotId);
      }
    }

    const result: TimeSlotAvailability[] = timeSlots.map((slot: typeof timeSlots[number]) => {
      const available = !blockedSlotIds.has(slot.id);

      return {
        timeSlotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        available,
      };
    });

    return result;
  });

  // Monthly availability - for calendar view
  // With new 1-courier logic, we need to check 3-day windows
  fastify.get<{ Querystring: { city: string; month: string; serviceCode: string } }>('/monthly', async (request, reply) => {
    const { city, month, serviceCode } = request.query;
    
    if (!city || !month || !serviceCode) {
      return reply.badRequest('city, month, and serviceCode are required');
    }
    
    // Check if city is active
    const citySettings = await prisma.citySettings.findUnique({ where: { city: city as any } });
    if (citySettings && !citySettings.isActive) {
      return []; // Return empty array for inactive cities
    }
    
    // Parse month (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return reply.badRequest('month must be YYYY-MM format');
    }
    
    // Get first and last day of month, plus 1 day before and after for 3-day window check
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0)); // Last day of month
    
    const extendedStart = new Date(startDate);
    extendedStart.setUTCDate(extendedStart.getUTCDate() - 1);
    const extendedEnd = new Date(endDate);
    extendedEnd.setUTCDate(extendedEnd.getUTCDate() + 1);
    
    const [timeSlots, bookingsInRange] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.booking.findMany({
        where: {
          scheduledDate: { gte: extendedStart, lte: extendedEnd },
          status: { in: [...BLOCKING_STATUSES] },
          timeSlotId: { not: null },
        },
        select: { scheduledDate: true, timeSlotId: true },
      }),
    ]);
    
    const totalSlots = timeSlots.length;
    
    // Build map: date -> set of booked slot IDs
    const bookedSlotsPerDay = new Map<string, Set<string>>();
    for (const booking of bookingsInRange) {
      if (!booking.scheduledDate || !booking.timeSlotId) continue;
      const dateStr = booking.scheduledDate.toISOString().split('T')[0] as string;
      const existing = bookedSlotsPerDay.get(dateStr) ?? new Set();
      existing.add(booking.timeSlotId);
      bookedSlotsPerDay.set(dateStr, existing);
    }
    
    // Build result for each day
    const result: { date: string; status: 'available' | 'limited' | 'full' | 'past'; slotsLeft: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0] as string;
      
      // For 3-day window logic: a slot is blocked if booked on prev, current, or next day
      const prevDate = new Date(d);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const nextDate = new Date(d);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      
      const prevDateStr = prevDate.toISOString().split('T')[0] as string;
      const nextDateStr = nextDate.toISOString().split('T')[0] as string;
      
      // Collect all blocked slots for this day
      const blockedSlots = new Set<string>();
      for (const slotId of bookedSlotsPerDay.get(prevDateStr) ?? []) blockedSlots.add(slotId);
      for (const slotId of bookedSlotsPerDay.get(dateStr) ?? []) blockedSlots.add(slotId);
      for (const slotId of bookedSlotsPerDay.get(nextDateStr) ?? []) blockedSlots.add(slotId);
      
      const slotsLeft = totalSlots - blockedSlots.size;
      
      let status: 'available' | 'limited' | 'full' | 'past';
      
      if (d < today) {
        status = 'past';
      } else if (slotsLeft === 0) {
        status = 'full';
      } else if (slotsLeft <= Math.ceil(totalSlots * 0.3)) {
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
