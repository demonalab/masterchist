import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  // Check if user is admin
  fastify.addHook('preHandler', async (request, reply) => {
    const telegramId = (request as any).telegramUserId;
    if (String(telegramId) !== ADMIN_TELEGRAM_ID) {
      return reply.forbidden('Admin access required');
    }
  });

  // Get bookings for admin
  fastify.get<{ Querystring: { status?: string } }>('/bookings', async (request) => {
    const { status } = request.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        user: { select: { telegramId: true, firstName: true } },
        address: { select: { addressLine: true, contactName: true, contactPhone: true } },
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { code: true, title: true } },
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      status: b.status,
      scheduledDate: b.scheduledDate?.toISOString().split('T')[0] ?? null,
      createdAt: b.createdAt.toISOString(),
      kitNumber: b.cleaningKit?.number ?? null,
      timeSlot: b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : null,
      service: b.service?.title ?? b.service?.code ?? null,
      user: b.user ? { telegramId: b.user.telegramId, firstName: b.user.firstName ?? '' } : null,
      address: b.address ? {
        addressLine: b.address.addressLine,
        contactName: b.address.contactName ?? '',
        contactPhone: b.address.contactPhone ?? '',
      } : null,
    }));
  });

  // Get stats
  fastify.get('/stats', async () => {
    const [total, newCount, prepaid, confirmed, cancelled] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatuses.NEW } }),
      prisma.booking.count({ where: { status: BookingStatuses.PREPAID } }),
      prisma.booking.count({ where: { status: BookingStatuses.CONFIRMED } }),
      prisma.booking.count({ where: { status: BookingStatuses.CANCELLED } }),
    ]);

    return {
      totalBookings: total,
      newBookings: newCount,
      confirmedBookings: confirmed,
      prepaidBookings: prepaid,
      cancelledBookings: cancelled,
    };
  });
};

export default adminRoutes;
