import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { Cities, ServiceCodes, BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const createBookingSchema = z.object({
  serviceCode: z.literal(ServiceCodes.SELF_CLEANING),
  city: z.enum([Cities.ROSTOV_NA_DONU, Cities.BATAYSK, Cities.STAVROPOL]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  timeSlotId: z.string().uuid(),
  address: z.object({
    city: z.string().min(1).max(128),
    street: z.string().min(1).max(256),
    house: z.string().min(1).max(32),
    apartment: z.string().max(32).optional(),
  }),
  contact: z.object({
    name: z.string().min(1).max(128),
    phone: z.string().min(5).max(32),
  }),
});

type CreateBookingBody = z.infer<typeof createBookingSchema>;

const BLOCKING_STATUSES = [
  BookingStatuses.NEW,
  BookingStatuses.AWAITING_PREPAYMENT,
  BookingStatuses.PREPAID,
  BookingStatuses.CONFIRMED,
] as const;

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get('/', async (request, reply) => {
    return reply.notImplemented('GET /bookings - list user bookings');
  });

  fastify.post<{ Body: CreateBookingBody }>('/', async (request, reply) => {
    const parseResult = createBookingSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request body');
    }

    const { serviceCode, city, scheduledDate, timeSlotId, address, contact } = parseResult.data;
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const dateObj = new Date(scheduledDate + 'T00:00:00.000Z');

    const service = await prisma.service.findUnique({
      where: { code: serviceCode },
      select: { id: true, isActive: true },
    });

    if (!service || !service.isActive) {
      return reply.badRequest('Service not available');
    }

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: { id: true, isActive: true },
    });

    if (!timeSlot || !timeSlot.isActive) {
      return reply.badRequest('Time slot not available');
    }

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const activeKits = await tx.cleaningKit.findMany({
          where: { isActive: true },
          select: { id: true },
        });

        const bookedKitIds = await tx.booking.findMany({
          where: {
            scheduledDate: dateObj,
            timeSlotId: timeSlotId,
            status: { in: [...BLOCKING_STATUSES] },
            cleaningKitId: { not: null },
          },
          select: { cleaningKitId: true },
        });

        const bookedSet = new Set(bookedKitIds.map((b) => b.cleaningKitId));
        const availableKit = activeKits.find((kit) => !bookedSet.has(kit.id));

        if (!availableKit) {
          throw new Error('NO_AVAILABLE_KIT');
        }

        const addressLine = [
          address.street,
          `д. ${address.house}`,
          address.apartment ? `кв. ${address.apartment}` : null,
        ]
          .filter(Boolean)
          .join(', ');

        const newAddress = await tx.address.create({
          data: {
            userId,
            city: city,
            addressLine,
            contactName: contact.name,
            contactPhone: contact.phone,
          },
          select: { id: true },
        });

        const newBooking = await tx.booking.create({
          data: {
            userId,
            serviceId: service.id,
            status: BookingStatuses.AWAITING_PREPAYMENT,
            addressId: newAddress.id,
            scheduledDate: dateObj,
            timeSlotId: timeSlotId,
            cleaningKitId: availableKit.id,
          },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            createdAt: true,
            cleaningKit: { select: { number: true } },
            timeSlot: { select: { startTime: true, endTime: true } },
            address: { select: { addressLine: true, contactName: true, contactPhone: true } },
          },
        });

        return newBooking;
      });

      return reply.status(201).send({
        id: booking.id,
        status: booking.status,
        scheduledDate: scheduledDate,
        timeSlot: {
          startTime: booking.timeSlot?.startTime,
          endTime: booking.timeSlot?.endTime,
        },
        kitNumber: booking.cleaningKit?.number,
        address: booking.address,
        createdAt: booking.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_AVAILABLE_KIT') {
        return reply.conflict('No available cleaning kits for this time slot');
      }

      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        return reply.conflict('Time slot already booked');
      }

      throw error;
    }
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        user: { select: { telegramId: true, firstName: true } },
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        address: { select: { addressLine: true, contactName: true, contactPhone: true } },
        service: { select: { code: true, title: true } },
      },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    return booking;
  });

  fastify.patch('/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string };

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    if (booking.status !== BookingStatuses.PREPAID) {
      return reply.badRequest(`Cannot confirm booking with status: ${booking.status}`);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatuses.CONFIRMED },
      select: {
        id: true,
        status: true,
        user: { select: { telegramId: true } },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      userTelegramId: updated.user.telegramId,
    };
  });

  fastify.patch('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true, cleaningKitId: true },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    if (booking.status !== BookingStatuses.PREPAID) {
      return reply.badRequest(`Cannot reject booking with status: ${booking.status}`);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatuses.CANCELLED,
        cleaningKitId: null,
      },
      select: {
        id: true,
        status: true,
        user: { select: { telegramId: true } },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      userTelegramId: updated.user.telegramId,
    };
  });

  fastify.post('/:id/cancel', async (request, reply) => {
    return reply.notImplemented('POST /bookings/:id/cancel - cancel booking');
  });
};

export default bookingsRoutes;
