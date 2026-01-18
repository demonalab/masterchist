import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import ExcelJS from 'exceljs';

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
    const [total, newCount, awaitingPrepayment, prepaid, confirmed, cancelled] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatuses.NEW } }),
      prisma.booking.count({ where: { status: BookingStatuses.AWAITING_PREPAYMENT } }),
      prisma.booking.count({ where: { status: BookingStatuses.PREPAID } }),
      prisma.booking.count({ where: { status: BookingStatuses.CONFIRMED } }),
      prisma.booking.count({ where: { status: BookingStatuses.CANCELLED } }),
    ]);

    return {
      totalBookings: total,
      newBookings: newCount,
      awaitingPrepaymentBookings: awaitingPrepayment,
      prepaidBookings: prepaid,
      confirmedBookings: confirmed,
      cancelledBookings: cancelled,
    };
  });

  // Get current admin role
  fastify.get('/role', async (request) => {
    const role = (request as any).adminRole;
    return { role };
  });

  // ============ SUPER ADMIN ONLY ============

  // List all admins
  fastify.get('/admins', async (request, reply) => {
    if ((request as any).adminRole !== 'super_admin') {
      return reply.forbidden('Только для супер-админа');
    }

    const admins = await prisma.admin.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return admins;
  });

  // Add admin
  fastify.post<{ Body: { telegramId: string; name?: string } }>('/admins', async (request, reply) => {
    if ((request as any).adminRole !== 'super_admin') {
      return reply.forbidden('Только для супер-админа');
    }

    const { telegramId, name } = request.body;
    if (!telegramId) {
      return reply.badRequest('telegramId обязателен');
    }

    const admin = await prisma.admin.upsert({
      where: { telegramId },
      update: { name, isActive: true },
      create: {
        telegramId,
        name,
        role: 'admin',
        addedBy: String(request.telegramUser?.id),
      },
    });

    return admin;
  });

  // Remove admin
  fastify.delete<{ Params: { telegramId: string } }>('/admins/:telegramId', async (request, reply) => {
    if ((request as any).adminRole !== 'super_admin') {
      return reply.forbidden('Только для супер-админа');
    }

    const { telegramId } = request.params;

    await prisma.admin.update({
      where: { telegramId },
      data: { isActive: false },
    });

    return { success: true };
  });

  // Delete booking
  fastify.delete<{ Params: { id: string } }>('/bookings/:id', async (request, reply) => {
    if ((request as any).adminRole !== 'super_admin') {
      return reply.forbidden('Только для супер-админа');
    }

    const { id } = request.params;

    // First delete related payment proofs
    await prisma.paymentProof.deleteMany({ where: { bookingId: id } });
    // Then delete booking
    await prisma.booking.delete({ where: { id } });

    return { success: true };
  });

  // ============ EXPORT ============

  const STATUS_LABELS: Record<string, string> = {
    NEW: 'Новый',
    AWAITING_PREPAYMENT: 'Ожидает предоплаты',
    PREPAID: 'Предоплачен',
    CONFIRMED: 'Подтверждён',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершён',
    CANCELLED: 'Отменён',
    // lowercase variants
    new: 'Новый',
    awaiting_prepayment: 'Ожидает предоплаты',
    prepaid: 'Предоплачен',
    confirmed: 'Подтверждён',
    in_progress: 'В работе',
    completed: 'Завершён',
    cancelled: 'Отменён',
  };

  const CITY_LABELS: Record<string, string> = {
    ROSTOV_NA_DONU: 'Ростов-на-Дону',
    BATAYSK: 'Батайск',
    STAVROPOL: 'Ставрополь',
  };

  // Export bookings to XLSX
  fastify.get<{ Querystring: { period?: string } }>('/export', async (request, reply) => {
    const { period } = request.query;

    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodLabel = 'Сегодня';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'Неделя';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'Месяц';
        break;
      default:
        startDate = new Date(0);
        periodLabel = 'Всё время';
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'МастерЧист';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Заказы', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    // Header row with period info
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Отчёт по заказам — ${periodLabel} (${bookings.length} шт.)`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Column headers
    const headers = [
      { header: '№', key: 'num', width: 5 },
      { header: 'Статус', key: 'status', width: 20 },
      { header: 'Дата заказа', key: 'scheduledDate', width: 14 },
      { header: 'Время', key: 'timeSlot', width: 14 },
      { header: 'Услуга', key: 'service', width: 28 },
      { header: 'Набор', key: 'kitNumber', width: 8 },
      { header: 'Город', key: 'city', width: 18 },
      { header: 'Адрес', key: 'address', width: 35 },
      { header: 'Клиент', key: 'contactName', width: 18 },
      { header: 'Телефон', key: 'contactPhone', width: 18 },
      { header: 'Telegram', key: 'userName', width: 14 },
      { header: 'Создан', key: 'createdAt', width: 14 },
    ];

    sheet.columns = headers;

    // Style header row (row 2)
    const headerRow = sheet.getRow(2);
    headerRow.values = headers.map(h => h.header);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1F4E79' } },
        bottom: { style: 'thin', color: { argb: 'FF1F4E79' } },
        left: { style: 'thin', color: { argb: 'FF1F4E79' } },
        right: { style: 'thin', color: { argb: 'FF1F4E79' } },
      };
    });

    // Data rows with zebra striping
    bookings.forEach((b, index) => {
      const rowNum = index + 3;
      const row = sheet.getRow(rowNum);
      
      const cityRu = b.address?.city ? (CITY_LABELS[b.address.city] || b.address.city) : '—';
      
      row.values = [
        index + 1,
        STATUS_LABELS[b.status] || b.status,
        b.scheduledDate?.toLocaleDateString('ru-RU') ?? '—',
        b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : '—',
        b.service?.title ?? '—',
        b.cleaningKit?.number ?? '—',
        cityRu,
        b.address?.addressLine ?? '—',
        b.address?.contactName ?? '—',
        b.address?.contactPhone ?? '—',
        b.user?.firstName ?? '—',
        b.createdAt.toLocaleDateString('ru-RU'),
      ];

      row.height = 20;
      const isEven = index % 2 === 0;
      
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFF2F2F2' : 'FFFFFFFF' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });

      // Center align number column
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      // Center align status
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      // Center dates and times
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Summary row
    if (bookings.length > 0) {
      const summaryRowNum = bookings.length + 4;
      sheet.mergeCells(`A${summaryRowNum}:L${summaryRowNum}`);
      const summaryCell = sheet.getCell(`A${summaryRowNum}`);
      summaryCell.value = `Итого: ${bookings.length} заказов`;
      summaryCell.font = { bold: true, size: 11 };
      summaryCell.alignment = { horizontal: 'right' };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="orders_${period || 'all'}.xlsx"`);
    
    return reply.send(Buffer.from(buffer));
  });
};

export default adminRoutes;
