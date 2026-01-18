import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { Cities, ServiceCodes, BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const createSelfCleaningSchema = z.object({
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

const createProCleaningSchema = z.object({
  serviceCode: z.literal(ServiceCodes.PRO_CLEANING),
  city: z.enum([Cities.ROSTOV_NA_DONU, Cities.BATAYSK, Cities.STAVROPOL]),
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
  proCleaningDetails: z.string().max(2000).optional(),
});

type CreateSelfCleaningBody = z.infer<typeof createSelfCleaningSchema>;
type CreateProCleaningBody = z.infer<typeof createProCleaningSchema>;

const BLOCKING_STATUSES = [
  BookingStatuses.NEW,
  BookingStatuses.AWAITING_PREPAYMENT,
  BookingStatuses.PREPAID,
  BookingStatuses.CONFIRMED,
] as const;

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get('/', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { code: true, title: true } },
      },
    });

    return bookings.map(b => ({
      id: b.id,
      status: b.status,
      scheduledDate: b.scheduledDate?.toISOString().split('T')[0] ?? null,
      createdAt: b.createdAt.toISOString(),
      kitNumber: b.cleaningKit?.number ?? null,
      timeSlot: b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : null,
      service: b.service?.title ?? b.service?.code ?? null,
    }));
  });

  fastify.get('/pending', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        status: { in: [BookingStatuses.NEW, BookingStatuses.AWAITING_PREPAYMENT] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { telegramId: true, firstName: true } },
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        address: { select: { addressLine: true, contactName: true, contactPhone: true } },
        service: { select: { code: true } },
      },
    });

    if (!booking) {
      return reply.notFound('No pending booking found');
    }

    return booking;
  });

  // Self-cleaning booking (with time slot and kit)
  fastify.post<{ Body: CreateSelfCleaningBody }>('/', async (request, reply) => {
    const body = request.body as any;
    
    // Support MAX bot: if maxUserId provided, find or create user
    let userId = request.dbUserId;
    if (!userId && body.maxUserId) {
      const maxUser = await prisma.user.upsert({
        where: { telegramId: String(body.maxUserId) },
        update: {},
        create: {
          telegramId: String(body.maxUserId),
          firstName: body.maxUserName || 'MAX User',
        },
        select: { id: true },
      });
      userId = maxUser.id;
    }
    
    // Check if it's a pro_cleaning request
    if (body.serviceCode === ServiceCodes.PRO_CLEANING) {
      const parseResult = createProCleaningSchema.safeParse(body);
      if (!parseResult.success) {
        return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request body');
      }

      const { city, address, contact, proCleaningDetails } = parseResult.data;
      if (!userId) {
        return reply.unauthorized('User not authenticated');
      }

      const service = await prisma.service.findUnique({
        where: { code: ServiceCodes.PRO_CLEANING },
        select: { id: true, isActive: true },
      });

      if (!service || !service.isActive) {
        return reply.badRequest('Service not available');
      }

      const addressLine = [
        address.street,
        `д. ${address.house}`,
        address.apartment ? `кв. ${address.apartment}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      const newAddress = await prisma.address.create({
        data: {
          userId,
          city: city,
          addressLine,
          contactName: contact.name,
          contactPhone: contact.phone,
        },
        select: { id: true },
      });

      const newBooking = await prisma.booking.create({
        data: {
          userId,
          serviceId: service.id,
          status: BookingStatuses.NEW,
          addressId: newAddress.id,
          proCleaningDetails: proCleaningDetails,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          address: { select: { addressLine: true, contactName: true, contactPhone: true } },
          service: { select: { title: true } },
        },
      });

      return reply.status(201).send({
        id: newBooking.id,
        status: newBooking.status,
        service: newBooking.service?.title,
        address: newBooking.address,
        createdAt: newBooking.createdAt.toISOString(),
      });
    }

    // Self-cleaning booking
    const parseResult = createSelfCleaningSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request body');
    }

    const { serviceCode, city, scheduledDate, timeSlotId, address, contact } = parseResult.data;
    // userId already set at the top (from Telegram auth or MAX bot)
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

        const bookedSet = new Set(bookedKitIds.map((b) => b.cleaningKitId).filter((id: string | null): id is string => id !== null));
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

    return {
      ...booking,
      scheduledDate: booking.scheduledDate?.toISOString().split('T')[0] ?? null,
      kitNumber: booking.cleaningKit?.number ?? null,
    };
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

    const confirmableStatuses = [BookingStatuses.NEW, BookingStatuses.AWAITING_PREPAYMENT, BookingStatuses.PREPAID];
    if (!confirmableStatuses.includes(booking.status as any)) {
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

    const rejectableStatuses = [BookingStatuses.NEW, BookingStatuses.AWAITING_PREPAYMENT, BookingStatuses.PREPAID];
    if (!rejectableStatuses.includes(booking.status as any)) {
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

  // Payment proof upload (for MAX bot - accepts photo URL)
  fastify.post<{ Params: { id: string }; Body: { photoUrl?: string; maxUserId?: number } }>(
    '/:id/payment-proof',
    async (request, reply) => {
      const { id } = request.params;
      const { photoUrl, maxUserId } = request.body;

      // Get userId from auth or maxUserId
      let userId = request.dbUserId;
      if (!userId && maxUserId) {
        const user = await prisma.user.findUnique({
          where: { telegramId: String(maxUserId) },
          select: { id: true },
        });
        userId = user?.id;
      }

      if (!userId) {
        return reply.unauthorized('User not authenticated');
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, status: true, userId: true },
      });

      if (!booking) {
        return reply.notFound('Booking not found');
      }

      if (booking.userId !== userId) {
        return reply.forbidden('Not your booking');
      }

      // Update status to prepaid (payment proof received)
      const updated = await prisma.booking.update({
        where: { id },
        data: { 
          status: BookingStatuses.PREPAID,
          // Store photo URL in notes or separate field if needed
        },
        select: { id: true, status: true },
      });

      return { success: true, id: updated.id, status: updated.status };
    }
  );
};

export default bookingsRoutes;
