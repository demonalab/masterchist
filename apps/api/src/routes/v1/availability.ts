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

    const [timeSlots, activeKits, existingBookings] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, startTime: true, endTime: true },
      }),
      prisma.cleaningKit.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.booking.findMany({
        where: {
          scheduledDate: dateObj,
          status: { in: [...BLOCKING_STATUSES] },
          cleaningKitId: { not: null },
        },
        select: { timeSlotId: true, cleaningKitId: true },
      }),
    ]);

    const totalKits = activeKits.length;

    const bookedKitsPerSlot = new Map<string, Set<string>>();
    for (const booking of existingBookings) {
      if (!booking.timeSlotId || !booking.cleaningKitId) continue;
      const existing = bookedKitsPerSlot.get(booking.timeSlotId) ?? new Set();
      existing.add(booking.cleaningKitId);
      bookedKitsPerSlot.set(booking.timeSlotId, existing);
    }

    const result: TimeSlotAvailability[] = timeSlots.map((slot) => {
      const bookedKits = bookedKitsPerSlot.get(slot.id)?.size ?? 0;
      const available = bookedKits < totalKits;

      return {
        timeSlotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        available,
      };
    });

    return result;
  });
};

export default availabilityRoutes;
