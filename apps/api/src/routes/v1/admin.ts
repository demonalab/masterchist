import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const SUPER_ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';

// Helper to check admin status
async function getAdminRole(telegramId: string): Promise<'super_admin' | 'admin' | null> {
  // Super admin from env
  if (telegramId === SUPER_ADMIN_TELEGRAM_ID) {
    return 'super_admin';
  }
  
  // Check database for admins
  const admin = await prisma.admin.findUnique({
    where: { telegramId },
    select: { role: true, isActive: true },
  });
  
  if (admin && admin.isActive) {
    return admin.role as 'super_admin' | 'admin';
  }
  
  return null;
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  // Check if user is admin (any role)
  fastify.addHook('preHandler', async (request, reply) => {
    const telegramId = request.telegramUser?.id;
    if (!telegramId) {
      return reply.forbidden('Admin access required');
    }
    
    const role = await getAdminRole(String(telegramId));
    if (!role) {
      return reply.forbidden('Admin access required');
    }
    
    // Attach role to request for later use
    (request as any).adminRole = role;
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

  // Get current admin role
  fastify.get('/role', async (request) => {
    const role = (request as any).adminRole;
    return { role };
  });

  // List all admins (super_admin only)
  fastify.get('/admins', async (request, reply) => {
    const role = (request as any).adminRole;
    if (role !== 'super_admin') {
      return reply.forbidden('Super admin access required');
    }

    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        telegramId: true,
        role: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return admins;
  });

  // Add admin (super_admin only)
  fastify.post<{ Body: { telegramId: string; name?: string; role?: string } }>('/admins', async (request, reply) => {
    const adminRole = (request as any).adminRole;
    if (adminRole !== 'super_admin') {
      return reply.forbidden('Super admin access required');
    }

    const { telegramId, name, role } = request.body;
    if (!telegramId) {
      return reply.badRequest('telegramId is required');
    }

    const admin = await prisma.admin.upsert({
      where: { telegramId },
      update: { name, role: role === 'super_admin' ? 'super_admin' : 'admin', isActive: true },
      create: {
        telegramId,
        name,
        role: role === 'super_admin' ? 'super_admin' : 'admin',
        addedBy: String(request.telegramUser?.id),
      },
    });

    return admin;
  });

  // Remove admin (super_admin only)
  fastify.delete<{ Params: { telegramId: string } }>('/admins/:telegramId', async (request, reply) => {
    const adminRole = (request as any).adminRole;
    if (adminRole !== 'super_admin') {
      return reply.forbidden('Super admin access required');
    }

    const { telegramId } = request.params;

    await prisma.admin.update({
      where: { telegramId },
      data: { isActive: false },
    });

    return { success: true };
  });

  // Delete booking (super_admin only)
  fastify.delete<{ Params: { id: string } }>('/bookings/:id', async (request, reply) => {
    const adminRole = (request as any).adminRole;
    if (adminRole !== 'super_admin') {
      return reply.forbidden('Super admin access required');
    }

    const { id } = request.params;

    await prisma.booking.delete({ where: { id } });

    return { success: true };
  });

  // Export bookings (all admins)
  fastify.get<{ Querystring: { period?: string } }>('/export', async (request) => {
    const { period } = request.query;

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const bookings = await prisma.booking.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        user: { select: { telegramId: true, firstName: true } },
        address: { select: { city: true, addressLine: true, contactName: true, contactPhone: true } },
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { code: true, title: true } },
      },
    });

    // Return as CSV-ready data
    return bookings.map((b) => ({
      id: b.id,
      status: b.status,
      scheduledDate: b.scheduledDate?.toISOString().split('T')[0] ?? '',
      createdAt: b.createdAt.toISOString(),
      service: b.service?.title ?? b.service?.code ?? '',
      kitNumber: b.cleaningKit?.number ?? '',
      timeSlot: b.timeSlot ? `${b.timeSlot.startTime}-${b.timeSlot.endTime}` : '',
      city: b.address?.city ?? '',
      address: b.address?.addressLine ?? '',
      contactName: b.address?.contactName ?? '',
      contactPhone: b.address?.contactPhone ?? '',
      userTelegramId: b.user?.telegramId ?? '',
      userName: b.user?.firstName ?? '',
    }));
  });
};

export default adminRoutes;
