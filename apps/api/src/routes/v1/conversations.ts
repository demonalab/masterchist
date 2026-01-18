import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { ServiceCodes } from '@himchistka/shared';

const startSchema = z.object({
  telegramId: z.string().min(1),
  serviceCode: z.enum([ServiceCodes.SELF_CLEANING, ServiceCodes.PRO_CLEANING, ServiceCodes.CLEANING]),
});

const completeSchema = z.object({
  telegramId: z.string().min(1),
  serviceCode: z.enum([ServiceCodes.SELF_CLEANING, ServiceCodes.PRO_CLEANING, ServiceCodes.CLEANING]),
});

const conversationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Track conversation start
  fastify.post<{ Body: z.infer<typeof startSchema> }>('/start', async (request, reply) => {
    const parseResult = startSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const { telegramId, serviceCode } = parseResult.data;

    // Check if there's already an incomplete conversation for this user and service
    const existing = await prisma.abandonedConversation.findFirst({
      where: {
        telegramId,
        serviceCode,
        completedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });

    // If exists and started less than 30 minutes ago, don't create new one
    if (existing) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (existing.startedAt > thirtyMinutesAgo) {
        return { id: existing.id, status: 'existing' };
      }
    }

    const conversation = await prisma.abandonedConversation.create({
      data: {
        telegramId,
        serviceCode,
      },
    });

    return { id: conversation.id, status: 'created' };
  });

  // Track conversation completion
  fastify.post<{ Body: z.infer<typeof completeSchema> }>('/complete', async (request, reply) => {
    const parseResult = completeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const { telegramId, serviceCode } = parseResult.data;

    // Mark the most recent incomplete conversation as completed
    const conversation = await prisma.abandonedConversation.findFirst({
      where: {
        telegramId,
        serviceCode,
        completedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (conversation) {
      await prisma.abandonedConversation.update({
        where: { id: conversation.id },
        data: { completedAt: new Date() },
      });
      return { status: 'completed' };
    }

    return { status: 'not_found' };
  });

  // Get conversations needing 2h reminder
  fastify.get('/reminders/2h', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const conversations = await prisma.abandonedConversation.findMany({
      where: {
        completedAt: null,
        reminder2hSent: false,
        startedAt: {
          gte: threeHoursAgo,
          lte: twoHoursAgo,
        },
      },
    });

    return conversations;
  });

  // Get conversations needing next day reminder
  fastify.get('/reminders/next-day', async () => {
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const conversations = await prisma.abandonedConversation.findMany({
      where: {
        completedAt: null,
        reminderNextDay: false,
        reminder2hSent: true, // Only send next day if 2h was sent
        startedAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
      },
    });

    return conversations;
  });

  // Mark 2h reminder as sent
  fastify.post<{ Params: { id: string } }>('/:id/mark-2h-sent', async (request, reply) => {
    const { id } = request.params;

    try {
      await prisma.abandonedConversation.update({
        where: { id },
        data: { reminder2hSent: true },
      });
      return { status: 'ok' };
    } catch {
      return reply.notFound('Conversation not found');
    }
  });

  // Mark next day reminder as sent
  fastify.post<{ Params: { id: string } }>('/:id/mark-next-day-sent', async (request, reply) => {
    const { id } = request.params;

    try {
      await prisma.abandonedConversation.update({
        where: { id },
        data: { reminderNextDay: true },
      });
      return { status: 'ok' };
    } catch {
      return reply.notFound('Conversation not found');
    }
  });
};

export default conversationsRoutes;
