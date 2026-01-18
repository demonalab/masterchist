import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { BookingStatuses } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

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
