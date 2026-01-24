import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { config } from '../../config';

async function notifyAdminsAboutPayment(bookingId: string, fileBuffer?: Buffer, mimeType?: string): Promise<void> {
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

    const message = `💰 <b>Получен чек предоплаты (Mini App)</b>

📋 ID: <code>${booking.id.slice(0, 8).toUpperCase()}</code>
🧹 Услуга: ${booking.service?.title ?? 'Химчистка'}
📅 Дата: ${date}
🕐 Время: ${booking.timeSlot?.startTime ?? '—'} - ${booking.timeSlot?.endTime ?? '—'}
📦 Набор: #${booking.cleaningKit?.number ?? '—'}

👤 Клиент: ${booking.address?.contactName ?? '—'}
📞 Телефон: ${booking.address?.contactPhone ?? '—'}
📍 Адрес: ${booking.address?.addressLine ?? '—'}
📱 Telegram: ${booking.user?.firstName ?? '—'} (ID: ${booking.user?.telegramId ?? '—'})

⏳ Ожидает подтверждения в админ-панели`;

    const adminIds = config.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim());
    
    for (const adminId of adminIds) {
      // Send photo if available
      if (fileBuffer && mimeType?.startsWith('image/')) {
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('chat_id', adminId);
        formData.append('photo', fileBuffer, { filename: 'payment_proof.jpg', contentType: mimeType });
        formData.append('caption', message);
        formData.append('parse_mode', 'HTML');
        
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          body: formData as any,
          headers: formData.getHeaders(),
        });
      } else {
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
    }
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

const paymentProofsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.post('/', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const data = await request.file();
    if (!data) {
      return reply.badRequest('No file uploaded');
    }

    const bookingIdField = data.fields['bookingId'];
    if (
      !bookingIdField ||
      typeof bookingIdField !== 'object' ||
      !('value' in bookingIdField) ||
      typeof bookingIdField.value !== 'string'
    ) {
      return reply.badRequest('bookingId is required');
    }

    const bookingId = bookingIdField.value;

    if (!ALLOWED_MIME_TYPES.includes(data.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      return reply.badRequest('Invalid file type. Allowed: jpeg, png, webp, pdf');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    if (booking.userId !== userId) {
      return reply.forbidden('Access denied');
    }

    if (booking.status !== BookingStatuses.AWAITING_PREPAYMENT) {
      return reply.badRequest(
        `Cannot upload payment proof for booking with status: ${booking.status}`
      );
    }

    const fileBuffer = await data.toBuffer();
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const placeholderFileId = `local_${fileHash.slice(0, 32)}`;

    const result = await prisma.$transaction(async (tx) => {
      await tx.paymentProof.create({
        data: {
          bookingId: booking.id,
          telegramFileId: placeholderFileId,
          mimeType: data.mimetype,
          fileName: data.filename,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatuses.PREPAID },
        select: { id: true, status: true },
      });

      return updatedBooking;
    });

    // Notify admins in background (don't await to not block response)
    notifyAdminsAboutPayment(result.id, fileBuffer, data.mimetype).catch(err => {
      console.error('Admin notification failed:', err);
    });

    return {
      bookingId: result.id,
      status: result.status,
    };
  });

  fastify.get('/:bookingId', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const { bookingId } = request.params as { bookingId: string };

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true },
    });

    if (!booking) {
      return reply.notFound('Booking not found');
    }

    if (booking.userId !== userId) {
      return reply.forbidden('Access denied');
    }

    const proofs = await prisma.paymentProof.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        telegramFileId: true,
        mimeType: true,
        fileName: true,
        createdAt: true,
      },
    });

    return { bookingId, proofs };
  });
};

export default paymentProofsRoutes;
