import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { Cities, ServiceCodes, BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { config } from '../../config';

async function notifyAdminsAboutPayment(bookingId: string): Promise<void> {
  if (!config.ADMIN_TELEGRAM_ID || !config.BOT_TOKEN) {
    console.log('ADMIN_TELEGRAM_ID or BOT_TOKEN not set, skipping notification');
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        scheduledDate: true,
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        address: { select: { addressLine: true, contactName: true, contactPhone: true } },
        user: { select: { telegramId: true, firstName: true } },
        service: { select: { title: true } },
      },
    });

    if (!booking) return;

    const date = booking.scheduledDate
      ? booking.scheduledDate.toISOString().split('T')[0]
      : '—';

    const message = `💰 <b>Новая оплата!</b>

📋 ID: <code>${booking.id.slice(0, 8).toUpperCase()}</code>
🧹 ${booking.service?.title ?? 'Химчистка'}
📅 ${date}
🕐 ${booking.timeSlot?.startTime ?? '—'} - ${booking.timeSlot?.endTime ?? '—'}
📦 Набор #${booking.cleaningKit?.number ?? '—'}

👤 ${booking.address?.contactName ?? '—'}
📞 ${booking.address?.contactPhone ?? '—'}
📍 ${booking.address?.addressLine ?? '—'}

⏳ Подтвердите в админ-панели`;

    const adminIds = config.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim());
    
    for (const adminId of adminIds) {
      await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
    }
    console.log('Admin notifications sent to:', adminIds);
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
}

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
        address: { select: { addressLine: true, city: true } },
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
      address: b.address?.addressLine ?? null,
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
        // Previous day - kits booked yesterday are unavailable until their slot time today
        const prevDateObj = new Date(dateObj);
        prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
        
        // Next day - kits booked tomorrow block today's late slots
        const nextDateObj = new Date(dateObj);
        nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);

        const [activeKits, timeSlots, todayBookings, yesterdayBookings, tomorrowBookings] = await Promise.all([
          tx.cleaningKit.findMany({
            where: { isActive: true },
            select: { id: true },
          }),
          tx.timeSlot.findMany({
            where: { isActive: true },
            select: { id: true, sortOrder: true },
          }),
          tx.booking.findMany({
            where: {
              scheduledDate: dateObj,
              status: { in: [...BLOCKING_STATUSES] },
              cleaningKitId: { not: null },
            },
            select: { timeSlotId: true, cleaningKitId: true },
          }),
          tx.booking.findMany({
            where: {
              scheduledDate: prevDateObj,
              status: { in: [...BLOCKING_STATUSES] },
              cleaningKitId: { not: null },
            },
            select: { timeSlotId: true, cleaningKitId: true },
          }),
          tx.booking.findMany({
            where: {
              scheduledDate: nextDateObj,
              status: { in: [...BLOCKING_STATUSES] },
              cleaningKitId: { not: null },
            },
            select: { timeSlotId: true, cleaningKitId: true },
          }),
        ]);

        // Build slot sort order map
        const slotSortOrder = new Map<string, number>();
        for (const slot of timeSlots) {
          slotSortOrder.set(slot.id, slot.sortOrder);
        }
        const requestedSlotOrder = slotSortOrder.get(timeSlotId) ?? 0;

        // Collect all blocked kit IDs for the requested slot
        const bookedSet = new Set<string>();

        // Kits booked today for this specific slot
        for (const booking of todayBookings) {
          if (booking.timeSlotId === timeSlotId && booking.cleaningKitId) {
            bookedSet.add(booking.cleaningKitId);
          }
        }

        // Kits blocked from yesterday (kit rented for 24h, blocked until same slot today)
        for (const booking of yesterdayBookings) {
          if (!booking.timeSlotId || !booking.cleaningKitId) continue;
          const blockedUntilOrder = slotSortOrder.get(booking.timeSlotId) ?? 0;
          if (requestedSlotOrder <= blockedUntilOrder) {
            bookedSet.add(booking.cleaningKitId);
          }
        }

        // Kits blocked by tomorrow's bookings (must return before tomorrow's use)
        for (const booking of tomorrowBookings) {
          if (!booking.timeSlotId || !booking.cleaningKitId) continue;
          const blockedFromOrder = slotSortOrder.get(booking.timeSlotId) ?? 0;
          if (requestedSlotOrder >= blockedFromOrder) {
            bookedSet.add(booking.cleaningKitId);
          }
        }

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
    const { id } = request.params as { id: string };
    const userId = request.dbUserId;

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

    // Can only cancel bookings in these statuses
    const cancellableStatuses = [BookingStatuses.NEW, BookingStatuses.AWAITING_PREPAYMENT];
    if (!cancellableStatuses.includes(booking.status as any)) {
      return reply.badRequest(`Невозможно отменить заказ со статусом: ${booking.status}`);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { 
        status: BookingStatuses.CANCELLED,
        cleaningKitId: null,
      },
      select: { id: true, status: true },
    });

    return { success: true, id: updated.id, status: updated.status };
  });

  // Upload photos for pro cleaning request
  fastify.post<{ Params: { id: string } }>('/:id/photos', async (request, reply) => {
    const { id } = request.params;
    const userId = request.dbUserId;

    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, userId: true, service: { select: { code: true } } },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    if (booking.userId !== userId) {
      return reply.forbidden('Not your booking');
    }

    if (booking.service?.code !== 'pro_cleaning') {
      return reply.badRequest('Photos can only be uploaded for pro cleaning requests');
    }

    const data = await request.file();
    if (!data) {
      return reply.badRequest('No file uploaded');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.badRequest('Invalid file type. Allowed: jpeg, png, webp');
    }

    // Generate placeholder file ID (in production, upload to storage and get real ID)
    const crypto = await import('node:crypto');
    const fileBuffer = await data.toBuffer();
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileId = `photo_${fileHash.slice(0, 32)}`;

    // Add file ID to booking's photo array
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        proCleaningPhotoFileIds: {
          push: fileId,
        },
      },
      select: { id: true, proCleaningPhotoFileIds: true },
    });

    return { 
      success: true, 
      fileId,
      totalPhotos: updated.proCleaningPhotoFileIds.length,
    };
  });

  // Payment proof upload (supports both FormData from web and JSON from MAX bot)
  fastify.post<{ Params: { id: string }; Body: { photoUrl?: string; maxUserId?: number } }>(
    '/:id/payment-proof',
    async (request, reply) => {
      const { id } = request.params;
      
      // Handle both FormData and JSON body
      const body = request.body || {};
      const { photoUrl, maxUserId } = body as { photoUrl?: string; maxUserId?: number };

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
        },
        select: { id: true, status: true },
      });

      // Notify admins about payment
      notifyAdminsAboutPayment(id).catch(err => {
        console.error('Admin notification failed:', err);
      });

      return { success: true, id: updated.id, status: updated.status };
    }
  );
};

export default bookingsRoutes;
