import fs from 'node:fs/promises';
import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { Cities, ServiceCodes, BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { config } from '../../config';
import { notifyUserAllChannels } from '../../lib/user-notifications';

const CITY_NAMES: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

async function notifyAdminsAboutPayment(bookingId: string, photoBuffer?: Buffer, mimeType?: string): Promise<void> {
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
        address: { select: { city: true, addressLine: true, contactName: true, contactPhone: true } },
        user: { select: { telegramId: true, firstName: true } },
        service: { select: { title: true } },
      },
    });

    if (!booking) return;

    const date = booking.scheduledDate
      ? booking.scheduledDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

    const cityNames: Record<string, string> = {
      ROSTOV_NA_DONU: 'Ростов-на-Дону',
      BATAYSK: 'Батайск',
      STAVROPOL: 'Ставрополь',
    };
    const cityName = booking.address?.city ? cityNames[booking.address.city] ?? booking.address.city : '—';

    const message = `💰 <b>Новая оплата!</b>

📋 ID: <code>${booking.id.slice(0, 8).toUpperCase()}</code>
🧹 ${booking.service?.title ?? 'Химчистка'}
📅 ${date}
🕐 ${booking.timeSlot?.startTime ?? '—'} - ${booking.timeSlot?.endTime ?? '—'}

👤 ${booking.address?.contactName ?? '—'}
📞 ${booking.address?.contactPhone ?? '—'}
🏙 ${cityName}
📍 ${booking.address?.addressLine ?? '—'}

⏳ Подтвердите в админ-панели`;

    const adminIds = config.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim());
    
    console.log('Sending payment notification, photoBuffer:', !!photoBuffer, 'mimeType:', mimeType);
    
    for (const adminId of adminIds) {
      try {
        if (photoBuffer && mimeType?.startsWith('image/')) {
          console.log('Sending photo to admin:', adminId, 'buffer size:', photoBuffer.length);
          
          // Use native FormData with Blob for better compatibility
          const blob = new Blob([photoBuffer], { type: mimeType });
          const formData = new FormData();
          formData.append('chat_id', adminId);
          formData.append('photo', blob, 'payment_proof.jpg');
          formData.append('caption', message);
          formData.append('parse_mode', 'HTML');
          
          const response = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const text = await response.text();
          console.log('Telegram sendPhoto response for', adminId, ':', text.substring(0, 300));
          if (!response.ok) {
            console.error('Telegram API error:', response.status, text);
          }
        } else {
          console.log('Sending text message to admin:', adminId, '(no photo)');
          const response = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminId,
              text: message,
              parse_mode: 'HTML',
            }),
          });
          const result = await response.json();
          console.log('Telegram sendMessage response for', adminId, ':', JSON.stringify(result));
        }
      } catch (adminErr) {
        console.error('Failed to send to admin', adminId, ':', adminErr);
      }
    }
    console.log('Admin Telegram notifications completed for:', adminIds);

    // Send to MAX admins
    if (config.MAX_BOT_TOKEN && config.ADMIN_MAX_ID) {
      const maxAdminIds = config.ADMIN_MAX_ID.split(',').map(id => id.trim());
      const maxMessage = message.replace(/<[^>]*>/g, ''); // Remove HTML tags for MAX
      
      for (const maxAdminId of maxAdminIds) {
        try {
          const maxRes = await fetch(`https://platform-api.max.ru/messages?user_id=${maxAdminId}`, {
            method: 'POST',
            headers: { 
              'Authorization': config.MAX_BOT_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: maxMessage,
            }),
          });
          const maxResult = await maxRes.json();
          console.log('MAX admin notification response for', maxAdminId, ':', JSON.stringify(maxResult));
        } catch (maxErr) {
          console.error('Failed to send MAX notification to admin', maxAdminId, ':', maxErr);
        }
      }
      console.log('Admin MAX notifications completed for:', maxAdminIds);
    }
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
}

async function notifyAdminsAboutProCleaning(bookingId: string, details: string, photoBuffer?: Buffer, mimeType?: string): Promise<void> {
  if (!config.ADMIN_TELEGRAM_ID || !config.BOT_TOKEN) {
    console.log('ADMIN_TELEGRAM_ID or BOT_TOKEN not set, skipping notification');
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        address: { select: { city: true, addressLine: true, contactName: true, contactPhone: true } },
        user: { select: { telegramId: true, firstName: true, phone: true } },
        service: { select: { title: true } },
        proCleaningPhotoFileIds: true,
      },
    });

    if (!booking) return;

    const cityName = CITY_NAMES[booking.address?.city ?? ''] || booking.address?.city || '—';
    
    const message = `🧹 <b>Новая заявка на проф. химчистку!</b>

📋 ID: <code>${booking.id.slice(0, 8).toUpperCase()}</code>
🏙 ${cityName}

📝 <b>Описание:</b>
${details || '—'}

👤 ${booking.address?.contactName ?? '—'}
📞 ${booking.address?.contactPhone ?? '—'}
📍 ${booking.address?.addressLine ?? '—'}

⚡️ Свяжитесь с клиентом!`;

    const adminIds = config.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim());
    
    console.log('Sending pro cleaning notification, photoBuffer:', !!photoBuffer, 'mimeType:', mimeType);
    
    for (const adminId of adminIds) {
      try {
        // Send photo with caption if available
        if (photoBuffer && mimeType?.startsWith('image/')) {
          console.log('Sending photo to admin:', adminId, 'buffer size:', photoBuffer.length);
          
          const blob = new Blob([photoBuffer], { type: mimeType });
          const formData = new FormData();
          formData.append('chat_id', adminId);
          formData.append('photo', blob, 'pro_cleaning.jpg');
          formData.append('caption', message);
          formData.append('parse_mode', 'HTML');
          
          const response = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const text = await response.text();
          console.log('Telegram sendPhoto response for', adminId, ':', text.substring(0, 300));
        } else {
          console.log('Sending text message to admin:', adminId, '(no photo)');
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
      } catch (adminErr) {
        console.error('Failed to send to admin', adminId, ':', adminErr);
      }
    }
    console.log('Pro cleaning Telegram notifications sent to:', adminIds);

    // Send to MAX admins
    if (config.MAX_BOT_TOKEN && config.ADMIN_MAX_ID) {
      const maxAdminIds = config.ADMIN_MAX_ID.split(',').map(id => id.trim());
      const maxMessage = message.replace(/<[^>]*>/g, ''); // Remove HTML tags for MAX
      
      for (const maxAdminId of maxAdminIds) {
        try {
          const maxRes = await fetch(`https://platform-api.max.ru/messages?user_id=${maxAdminId}`, {
            method: 'POST',
            headers: { 
              'Authorization': config.MAX_BOT_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: maxMessage,
            }),
          });
          const maxResult = await maxRes.json();
          console.log('MAX pro cleaning notification response for', maxAdminId, ':', JSON.stringify(maxResult));
        } catch (maxErr) {
          console.error('Failed to send MAX pro cleaning notification to admin', maxAdminId, ':', maxErr);
        }
      }
      console.log('Pro cleaning MAX notifications sent to:', maxAdminIds);
    }
  } catch (err) {
    console.error('Failed to notify admins about pro cleaning:', err);
  }
}

const BookingSources = {
  TELEGRAM_BOT: 'telegram_bot',
  TELEGRAM_MINIAPP: 'telegram_miniapp',
  MAX_BOT: 'max_bot',
} as const;

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
  source: z.enum(['telegram_bot', 'telegram_miniapp', 'max_bot']).optional(),
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
  source: z.enum(['telegram_bot', 'telegram_miniapp', 'max_bot']).optional(),
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

    // Find current user and check if they have linked accounts via phone
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    let userIds = [userId];
    
    // If user has phone, find all linked accounts with same phone
    if (currentUser?.phone) {
      const linkedUsers = await prisma.user.findMany({
        where: { phone: currentUser.phone },
        select: { id: true },
      });
      userIds = linkedUsers.map((u: { id: string }) => u.id);
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        source: true,
        scheduledDate: true,
        createdAt: true,
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { code: true, title: true } },
        address: { select: { addressLine: true, city: true } },
        proCleaningDetails: true,
        proCleaningPhotoFileIds: true,
        paymentProofs: { select: { photoUrl: true }, take: 1 },
      },
    });

    return bookings.map((b: typeof bookings[number]) => ({
      id: b.id,
      status: b.status,
      source: (b as any).source ?? 'telegram_bot',
      scheduledDate: b.scheduledDate?.toISOString().split('T')[0] ?? null,
      createdAt: b.createdAt.toISOString(),
      kitNumber: b.cleaningKit?.number ?? null,
      timeSlot: b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : null,
      service: b.service?.title ?? b.service?.code ?? null,
      address: b.address?.addressLine ?? null,
      proCleaningDetails: b.proCleaningDetails ?? null,
      proCleaningPhotoUrls: b.proCleaningPhotoFileIds ?? [],
      paymentProofUrl: b.paymentProofs?.[0]?.photoUrl ?? null,
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
    
    // Support MAX bot: if maxUserId provided, find or create user with maxId (not telegramId!)
    let userId = request.dbUserId;
    if (!userId && body.maxUserId) {
      // First try to find existing MAX user
      let maxUser = await prisma.user.findFirst({
        where: { maxId: String(body.maxUserId) },
        select: { id: true },
      });
      
      if (!maxUser) {
        // Create new MAX user with maxId field
        maxUser = await prisma.user.create({
          data: {
            maxId: String(body.maxUserId),
            firstName: body.maxUserName || 'MAX User',
          },
          select: { id: true },
        });
      }
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

      // Determine source
      const source = parseResult.data.source || (body.maxUserId ? 'max_bot' : 'telegram_miniapp');

      const newBooking = await prisma.booking.create({
        data: {
          userId,
          serviceId: service.id,
          status: BookingStatuses.NEW,
          addressId: newAddress.id,
          proCleaningDetails: proCleaningDetails,
          source: source as any,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          address: { select: { addressLine: true, contactName: true, contactPhone: true } },
          service: { select: { title: true } },
        },
      });

      // Note: Photos will be uploaded separately, notification will be sent after photos
      // For now, return booking ID so frontend can upload photos

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
        // NEW LOGIC: 1 courier - check if this time slot is booked on yesterday, today, or tomorrow
        const prevDateObj = new Date(dateObj);
        prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
        
        const nextDateObj = new Date(dateObj);
        nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);

        // Check if this specific time slot is already booked on any of the 3 days
        const conflictingBooking = await prisma.booking.findFirst({
          where: {
            scheduledDate: { in: [prevDateObj, dateObj, nextDateObj] },
            timeSlotId: timeSlotId,
            status: { in: [...BLOCKING_STATUSES] },
          },
          select: { id: true },
        });

        if (conflictingBooking) {
          throw new Error('TIME_SLOT_BLOCKED');
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

        // Determine source based on request origin
        const source = body.source || (body.maxUserId ? 'max_bot' : 'telegram_miniapp');

        const newBooking = await prisma.booking.create({
          data: {
            userId,
            serviceId: service.id,
            status: BookingStatuses.AWAITING_PREPAYMENT,
            addressId: newAddress.id,
            scheduledDate: dateObj,
            timeSlotId: timeSlotId,
            source: source as any,
          },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            createdAt: true,
            timeSlot: { select: { startTime: true, endTime: true } },
            address: { select: { addressLine: true, contactName: true, contactPhone: true } },
          },
        });

        return newBooking;
      });

      // Send confirmation to user
      notifyUserAllChannels({
        userId,
        message: `🎉 <b>Заказ оформлен!</b>

📋 Номер: <code>${booking.id.slice(0, 8).toUpperCase()}</code>
📅 Дата: ${scheduledDate}
🕐 Время: ${booking.timeSlot?.startTime ?? '—'} - ${booking.timeSlot?.endTime ?? '—'}

Ожидайте внесения предоплаты для подтверждения заказа.`,
      }).catch(console.error);

      return reply.status(201).send({
        id: booking.id,
        status: booking.status,
        scheduledDate: scheduledDate,
        timeSlot: {
          startTime: booking.timeSlot?.startTime,
          endTime: booking.timeSlot?.endTime,
        },
        address: booking.address,
        createdAt: booking.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'TIME_SLOT_BLOCKED') {
        return reply.conflict('Это время уже занято. Выберите другое время.');
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

    // Save file to disk
    const crypto = await import('node:crypto');
    const fileBuffer = await data.toBuffer();
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileExt = data.mimetype.split('/')[1] || 'jpg';
    const fileName = `${fileHash.slice(0, 32)}.${fileExt}`;
    
    // Create uploads directory and save file
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pro-cleaning');
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    
    const photoUrl = `/uploads/pro-cleaning/${fileName}`;

    // Add photo URL to booking's photo array
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        proCleaningPhotoFileIds: {
          push: photoUrl,
        },
      },
      select: { id: true, proCleaningPhotoFileIds: true, proCleaningDetails: true },
    });

    // Send notification to admins on first photo upload (with photo)
    if (updated.proCleaningPhotoFileIds.length === 1) {
      notifyAdminsAboutProCleaning(id, updated.proCleaningDetails || '', fileBuffer, data.mimetype).catch(err => {
        console.error('Pro cleaning notification failed:', err);
      });
    }

    return { 
      success: true, 
      fileId: photoUrl,
      totalPhotos: updated.proCleaningPhotoFileIds.length,
    };
  });

  // Get photos for pro cleaning booking
  fastify.get<{ Params: { id: string } }>('/:id/photos', async (request, reply) => {
    const { id } = request.params;
    const userId = request.dbUserId;

    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, userId: true, proCleaningPhotoFileIds: true },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    // Allow access to own bookings or for admins
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (booking.userId !== userId && !user?.isAdmin) {
      return reply.forbidden('Not your booking');
    }

    return { 
      bookingId: id,
      photos: booking.proCleaningPhotoFileIds || [],
    };
  });

  // Payment proof upload (supports both FormData from web and JSON from MAX bot)
  fastify.post<{ Params: { id: string } }>(
    '/:id/payment-proof',
    async (request, reply) => {
      const { id } = request.params;
      
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

      // Try to get uploaded file
      let fileBuffer: Buffer | undefined;
      let mimeType: string | undefined;
      let savedPhotoUrl: string | undefined;

      try {
        const data = await request.file();
        if (data) {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (allowedTypes.includes(data.mimetype)) {
            fileBuffer = await data.toBuffer();
            mimeType = data.mimetype;
            
            // Save file to disk
            const crypto = await import('node:crypto');
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const fileExt = data.mimetype.split('/')[1] || 'jpg';
            const fileName = `${fileHash.slice(0, 32)}.${fileExt}`;
            
            const uploadsDir = path.join(process.cwd(), 'uploads', 'proofs');
            await fs.mkdir(uploadsDir, { recursive: true });
            const filePath = path.join(uploadsDir, fileName);
            await fs.writeFile(filePath, fileBuffer);
            
            savedPhotoUrl = `/uploads/proofs/${fileName}`;
            console.log('Payment proof saved:', savedPhotoUrl);
          }
        }
      } catch (err) {
        console.log('No file in request or error parsing:', err);
      }

      // Create payment proof record if we have a photo
      if (savedPhotoUrl) {
        await prisma.paymentProof.create({
          data: {
            bookingId: id,
            photoUrl: savedPhotoUrl,
            telegramFileId: '', // Not from Telegram, using local file
          },
        });
      }

      // Update status to prepaid (payment proof received)
      const updated = await prisma.booking.update({
        where: { id },
        data: { 
          status: BookingStatuses.PREPAID,
        },
        select: { id: true, status: true },
      });

      // Notify admins about payment with photo
      notifyAdminsAboutPayment(id, fileBuffer, mimeType).catch(err => {
        console.error('Admin notification failed:', err);
      });

      return { success: true, id: updated.id, status: updated.status, photoUrl: savedPhotoUrl };
    }
  );
};

export default bookingsRoutes;
