import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { notifyBookingStatusChange } from '../../lib/user-notifications';
import ExcelJS from 'exceljs';

// Support multiple admin IDs via comma-separated list
const SUPER_ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const MAX_ADMIN_USER_ID = process.env.MAX_ADMIN_USER_ID || '';

// Fallback hardcoded super admin IDs (in case env is not set)
// Telegram IDs: 8468584965, 1152185834, 1447933960
// MAX ID: 18782420
const FALLBACK_SUPER_ADMINS = ['8468584965', '1152185834', '1447933960', '18782420'];

// Helper to check admin status - exported for use in public role endpoint
export async function getAdminRole(telegramId: string): Promise<'super_admin' | 'admin' | null> {
  // Super admin from env (Telegram or MAX) - supports multiple IDs
  if (SUPER_ADMIN_IDS.includes(telegramId) || telegramId === MAX_ADMIN_USER_ID || FALLBACK_SUPER_ADMINS.includes(telegramId)) {
    return 'super_admin';
  }
  
  // Check database for admins by telegramId
  const admin = await prisma.admin.findUnique({
    where: { telegramId },
    select: { role: true, isActive: true },
  });
  
  if (admin && admin.isActive) {
    return admin.role as 'super_admin' | 'admin';
  }
  
  // Check if this is a MAX user linked to a Telegram admin
  const userWithMaxId = await prisma.user.findFirst({
    where: { maxId: telegramId },
    select: { telegramId: true },
  });
  
  if (userWithMaxId?.telegramId) {
    // Check if linked Telegram ID is admin
    if (SUPER_ADMIN_IDS.includes(userWithMaxId.telegramId) || FALLBACK_SUPER_ADMINS.includes(userWithMaxId.telegramId)) {
      return 'super_admin';
    }
    const linkedAdmin = await prisma.admin.findUnique({
      where: { telegramId: userWithMaxId.telegramId },
      select: { role: true, isActive: true },
    });
    if (linkedAdmin && linkedAdmin.isActive) {
      return linkedAdmin.role as 'super_admin' | 'admin';
    }
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
        source: true,
        proCleaningDetails: true,
        proCleaningPhotoFileIds: true,
        user: { select: { telegramId: true, firstName: true } },
        address: { select: { city: true, district: true, addressLine: true, contactName: true, contactPhone: true } },
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { code: true, title: true } },
        paymentProofs: { select: { photoUrl: true, telegramFileId: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return bookings.map((b: typeof bookings[number]) => ({
      id: b.id,
      status: b.status,
      scheduledDate: b.scheduledDate?.toISOString().split('T')[0] ?? null,
      createdAt: b.createdAt.toISOString(),
      source: (b as any).source ?? 'telegram_bot',
      kitNumber: b.cleaningKit?.number ?? null,
      timeSlot: b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : null,
      service: b.service?.title ?? b.service?.code ?? null,
      city: b.address?.city ?? null,
      district: b.address?.district ?? null,
      user: b.user ? { telegramId: b.user.telegramId, firstName: b.user.firstName ?? '' } : null,
      address: b.address ? {
        addressLine: b.address.addressLine,
        contactName: b.address.contactName ?? '',
        contactPhone: b.address.contactPhone ?? '',
      } : null,
      proCleaningDetails: b.proCleaningDetails ?? null,
      proCleaningPhotoUrls: b.proCleaningPhotoFileIds ?? [],
      paymentProofUrl: (b as any).paymentProofs?.[0]?.photoUrl ?? null,
    }));
  });

  // Get stats
  fastify.get('/stats', async () => {
    const [total, newCount, awaitingPrepayment, prepaid, confirmed, cancelled, totalUsers, telegramUsers, maxUsers] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatuses.NEW } }),
      prisma.booking.count({ where: { status: BookingStatuses.AWAITING_PREPAYMENT } }),
      prisma.booking.count({ where: { status: BookingStatuses.PREPAID } }),
      prisma.booking.count({ where: { status: BookingStatuses.CONFIRMED } }),
      prisma.booking.count({ where: { status: BookingStatuses.CANCELLED } }),
      prisma.user.count(),
      prisma.user.count({ where: { telegramId: { not: null } } }),
      prisma.user.count({ where: { maxId: { not: null } } }),
    ]);

    console.log(`Stats: total=${total}, new=${newCount}, awaiting=${awaitingPrepayment}, prepaid=${prepaid}, confirmed=${confirmed}, cancelled=${cancelled}, users=${totalUsers}`);

    return {
      totalBookings: total,
      newBookings: newCount,
      awaitingPrepaymentBookings: awaitingPrepayment,
      prepaidBookings: prepaid,
      confirmedBookings: confirmed,
      cancelledBookings: cancelled,
      totalUsers,
      telegramUsers,
      maxUsers,
    };
  });

  // Confirm booking (any admin)
  fastify.post<{ Params: { id: string } }>('/bookings/:id/confirm', async (request, reply) => {
    const { id } = request.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, user: { select: { telegramId: true } } },
    });

    if (!booking) {
      return reply.notFound('Заказ не найден');
    }

    const confirmableStatuses = [BookingStatuses.NEW, BookingStatuses.AWAITING_PREPAYMENT, BookingStatuses.PREPAID];
    if (!confirmableStatuses.includes(booking.status as any)) {
      return reply.badRequest(`Нельзя подтвердить заказ со статусом: ${booking.status}`);
    }

    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatuses.CONFIRMED },
    });

    // Notify user in all linked messengers
    notifyBookingStatusChange(id, BookingStatuses.CONFIRMED, '✅ <b>Ваш заказ подтверждён!</b>').catch(console.error);

    return { success: true, userTelegramId: booking.user.telegramId };
  });

  // Reject booking (any admin)
  fastify.post<{ Params: { id: string } }>('/bookings/:id/reject', async (request, reply) => {
    const { id } = request.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, user: { select: { telegramId: true } } },
    });

    if (!booking) {
      return reply.notFound('Заказ не найден');
    }

    const rejectableStatuses = [BookingStatuses.NEW, BookingStatuses.AWAITING_PREPAYMENT, BookingStatuses.PREPAID];
    if (!rejectableStatuses.includes(booking.status as any)) {
      return reply.badRequest(`Нельзя отклонить заказ со статусом: ${booking.status}`);
    }

    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatuses.CANCELLED },
    });

    // Notify user in all linked messengers
    notifyBookingStatusChange(id, BookingStatuses.CANCELLED, '❌ <b>Ваш заказ отклонён</b>\n\nПожалуйста, свяжитесь с поддержкой для уточнения деталей.').catch(console.error);

    return { success: true, userTelegramId: booking.user.telegramId };
  });

  // ============ SUPER ADMIN ONLY ============

  // List all admins
  fastify.get('/admins', async (request, reply) => {
    if ((request as any).adminRole !== 'super_admin') {
      return reply.forbidden('Только для супер-админа');
    }

    // Get admins from database
    const dbAdmins = await prisma.admin.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        telegramId: true,
        role: true,
        name: true,
        isActive: true,
        notifyTelegram: true,
        notifyMax: true,
        createdAt: true,
      },
    });

    // Get linked MAX IDs for admins
    const adminTelegramIds = dbAdmins.map((a: { telegramId: string }) => a.telegramId);
    const linkedUsers = await prisma.user.findMany({
      where: { telegramId: { in: [...adminTelegramIds, ...SUPER_ADMIN_IDS] } },
      select: { telegramId: true, maxId: true, firstName: true },
    });
    const linkedMap = new Map<string, { maxId: string | null; firstName: string | null }>(linkedUsers.map((u: { telegramId: string | null; maxId: string | null; firstName: string | null }) => [u.telegramId!, { maxId: u.maxId, firstName: u.firstName }]));

    // Get notification settings for env admins from DB (if they exist)
    const envAdminSettings = await prisma.admin.findMany({
      where: { telegramId: { in: SUPER_ADMIN_IDS } },
      select: { telegramId: true, notifyTelegram: true, notifyMax: true },
    });
    const envSettingsMap = new Map<string, { telegramId: string; notifyTelegram: boolean; notifyMax: boolean }>(envAdminSettings.map((a: { telegramId: string; notifyTelegram: boolean; notifyMax: boolean }) => [a.telegramId, a]));

    // Get super admins from env
    const envSuperAdmins = SUPER_ADMIN_IDS.filter(id => id.length > 0).map(id => {
      const linked = linkedMap.get(id);
      const settings = envSettingsMap.get(id);
      return {
        id: `env_${id}`,
        telegramId: id,
        role: 'super_admin',
        name: linked?.firstName || null,
        isActive: true,
        notifyTelegram: settings?.notifyTelegram ?? true,
        notifyMax: settings?.notifyMax ?? true,
        maxId: linked?.maxId || null,
        isEnvAdmin: true,
        createdAt: new Date(),
      };
    });

    // Filter out DB admins that are already in env SUPER_ADMIN_IDS to avoid duplicates
    const formattedDbAdmins = dbAdmins
      .filter((a: { telegramId: string }) => !SUPER_ADMIN_IDS.includes(a.telegramId))
      .map((a: any) => {
        const linked = linkedMap.get(a.telegramId);
        return {
          ...a,
          maxId: linked?.maxId || null,
          isEnvAdmin: false,
        };
      });

    return [...envSuperAdmins, ...formattedDbAdmins];
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

  // Update admin notification settings
  fastify.patch<{ Params: { telegramId: string }; Body: { notifyTelegram?: boolean; notifyMax?: boolean } }>(
    '/admins/:telegramId/notifications',
    async (request, reply) => {
      if ((request as any).adminRole !== 'super_admin') {
        return reply.forbidden('Только для супер-админа');
      }

      const { telegramId } = request.params;
      const { notifyTelegram, notifyMax } = request.body;

      // For env admins, create/update record in DB
      const admin = await prisma.admin.upsert({
        where: { telegramId },
        update: {
          ...(notifyTelegram !== undefined && { notifyTelegram }),
          ...(notifyMax !== undefined && { notifyMax }),
        },
        create: {
          telegramId,
          role: SUPER_ADMIN_IDS.includes(telegramId) || FALLBACK_SUPER_ADMINS.includes(telegramId) ? 'super_admin' : 'admin',
          notifyTelegram: notifyTelegram ?? true,
          notifyMax: notifyMax ?? true,
          addedBy: String(request.telegramUser?.id),
        },
      });

      return admin;
    }
  );

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

  // ============ CITY SETTINGS ============

  // Get all city settings
  fastify.get('/cities', async () => {
    const cities = await prisma.citySettings.findMany({
      orderBy: { city: 'asc' },
    });
    return cities;
  });

  // Update city settings (super admin only)
  fastify.patch<{
    Params: { city: string };
    Body: { isActive?: boolean; deliveryPriceRub?: number; minOrderRub?: number };
  }>('/cities/:city', async (request, reply) => {
    if ((request as any).adminRole !== 'super_admin') {
      return reply.forbidden('Только для супер-админа');
    }

    const { city } = request.params;
    const { isActive, deliveryPriceRub, minOrderRub } = request.body;

    const updated = await prisma.citySettings.upsert({
      where: { city: city as any },
      update: {
        ...(isActive !== undefined && { isActive }),
        ...(deliveryPriceRub !== undefined && { deliveryPriceRub }),
        ...(minOrderRub !== undefined && { minOrderRub }),
      },
      create: {
        city: city as any,
        isActive: isActive ?? true,
        deliveryPriceRub: deliveryPriceRub ?? 0,
        minOrderRub: minOrderRub ?? null,
      },
    });

    return updated;
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

    // Calculate statistics
    const stats = {
      total: bookings.length,
      new: bookings.filter((b: any) => b.status.toLowerCase() === 'new').length,
      awaitingPrepayment: bookings.filter((b: any) => b.status.toLowerCase() === 'awaiting_prepayment').length,
      prepaid: bookings.filter((b: any) => b.status.toLowerCase() === 'prepaid').length,
      confirmed: bookings.filter((b: any) => b.status.toLowerCase() === 'confirmed').length,
      completed: bookings.filter((b: any) => b.status.toLowerCase() === 'completed').length,
      cancelled: bookings.filter((b: any) => b.status.toLowerCase() === 'cancelled').length,
    };

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'МастерЧист';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Заказы');

    // ============ SUMMARY TABLE ============
    // Summary header
    const summaryHeaderRow = sheet.getRow(1);
    summaryHeaderRow.values = ['Показатель', 'Значение'];
    summaryHeaderRow.height = 22;
    summaryHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1F4E79' } },
        bottom: { style: 'thin', color: { argb: 'FF1F4E79' } },
        left: { style: 'thin', color: { argb: 'FF1F4E79' } },
        right: { style: 'thin', color: { argb: 'FF1F4E79' } },
      };
    });

    // Summary data
    const summaryData = [
      ['Всего заказов', stats.total],
      ['Новых', stats.new],
      ['Ожидает предоплаты', stats.awaitingPrepayment],
      ['Предоплачено', stats.prepaid],
      ['Подтверждено', stats.confirmed],
      ['Завершено', stats.completed],
      ['Отменено', stats.cancelled],
    ];

    summaryData.forEach((item, index) => {
      const row = sheet.getRow(index + 2);
      row.values = item;
      row.height = 20;
      const isEven = index % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF2F2F2' : 'FFFFFFFF' } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'center' : 'left' };
      });
    });

    // Set summary columns width
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 12;

    // Add autofilter to summary
    sheet.autoFilter = { from: 'A1', to: 'B1' };

    // ============ DATA TABLE ============
    const dataStartRow = summaryData.length + 4;

    // Data table header
    const headers = [
      { key: 'num', width: 5 },
      { key: 'status', width: 20 },
      { key: 'scheduledDate', width: 14 },
      { key: 'timeSlot', width: 14 },
      { key: 'service', width: 28 },
      { key: 'kitNumber', width: 8 },
      { key: 'city', width: 18 },
      { key: 'address', width: 35 },
      { key: 'contactName', width: 18 },
      { key: 'contactPhone', width: 18 },
      { key: 'userName', width: 14 },
    ];
    const headerLabels = ['№', 'Статус', 'Дата заказа', 'Время', 'Услуга', 'Набор', 'Город', 'Адрес', 'Клиент', 'Телефон', 'Telegram'];

    // Set column widths (columns 3-13 for data table, reusing 1-2 for summary)
    headers.forEach((h, i) => {
      if (i >= 2) sheet.getColumn(i + 1).width = h.width;
    });
    sheet.getColumn(3).width = 14;
    sheet.getColumn(4).width = 14;
    sheet.getColumn(5).width = 28;
    sheet.getColumn(6).width = 8;
    sheet.getColumn(7).width = 18;
    sheet.getColumn(8).width = 35;
    sheet.getColumn(9).width = 18;
    sheet.getColumn(10).width = 18;
    sheet.getColumn(11).width = 14;

    // Data header row
    const dataHeaderRow = sheet.getRow(dataStartRow);
    dataHeaderRow.values = headerLabels;
    dataHeaderRow.height = 22;
    dataHeaderRow.eachCell((cell) => {
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
    bookings.forEach((b: any, index: number) => {
      const rowNum = dataStartRow + index + 1;
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
      ];

      row.height = 20;
      const isEven = index % 2 === 0;
      
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF2F2F2' : 'FFFFFFFF' } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });

      // Center align specific columns
      [1, 2, 3, 4, 6].forEach(col => {
        row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // Add autofilter for data table
    if (bookings.length > 0) {
      sheet.autoFilter = {
        from: { row: dataStartRow, column: 1 },
        to: { row: dataStartRow + bookings.length, column: 11 },
      };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="orders_${period || 'all'}.xlsx"`);
    
    return reply.send(Buffer.from(buffer));
  });
};

export default adminRoutes;
