import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import { Cities } from '@himchistka/shared';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const createAddressSchema = z.object({
  city: z.enum([Cities.ROSTOV_NA_DONU, Cities.BATAYSK, Cities.STAVROPOL]),
  addressLine: z.string().min(1).max(256),
  contactName: z.string().min(1).max(128),
  contactPhone: z.string().min(5).max(32),
  label: z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = z.object({
  city: z.enum([Cities.ROSTOV_NA_DONU, Cities.BATAYSK, Cities.STAVROPOL]).optional(),
  addressLine: z.string().min(1).max(256).optional(),
  contactName: z.string().min(1).max(128).optional(),
  contactPhone: z.string().min(5).max(32).optional(),
  label: z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
});

type CreateAddressBody = z.infer<typeof createAddressSchema>;
type UpdateAddressBody = z.infer<typeof updateAddressSchema>;

const addressesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  // Get user's saved addresses
  fastify.get('/', async (request, reply) => {
    const userId = request.dbUserId;
    const telegramId = request.telegramUser?.id;
    console.log(`GET /addresses: userId=${userId}, telegramId=${telegramId}`);
    
    if (!userId) {
      console.log('GET /addresses: No userId - unauthorized');
      return reply.unauthorized('User not authenticated');
    }

    const addresses = await prisma.address.findMany({
      where: { userId, isSaved: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        city: true,
        addressLine: true,
        contactName: true,
        contactPhone: true,
        label: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return addresses;
  });

  // Create new saved address
  fastify.post<{ Body: CreateAddressBody }>('/', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const parseResult = createAddressSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const { city, addressLine, contactName, contactPhone, label, isDefault } = parseResult.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isSaved: true, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        city,
        addressLine,
        contactName,
        contactPhone,
        label: label || null,
        isDefault: isDefault || false,
        isSaved: true,
      },
      select: {
        id: true,
        city: true,
        addressLine: true,
        contactName: true,
        contactPhone: true,
        label: true,
        isDefault: true,
      },
    });

    return reply.status(201).send(address);
  });

  // Update saved address
  fastify.patch<{ Params: { id: string }; Body: UpdateAddressBody }>('/:id', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const { id } = request.params;
    const parseResult = updateAddressSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const existing = await prisma.address.findUnique({
      where: { id },
      select: { userId: true, isSaved: true },
    });

    if (!existing || existing.userId !== userId || !existing.isSaved) {
      return reply.notFound('Address not found');
    }

    const { isDefault, ...rest } = parseResult.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isSaved: true, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...rest,
        isDefault: isDefault ?? undefined,
      },
      select: {
        id: true,
        city: true,
        addressLine: true,
        contactName: true,
        contactPhone: true,
        label: true,
        isDefault: true,
      },
    });

    return address;
  });

  // Delete saved address
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const { id } = request.params;

    const existing = await prisma.address.findUnique({
      where: { id },
      select: { userId: true, isSaved: true },
    });

    if (!existing || existing.userId !== userId || !existing.isSaved) {
      return reply.notFound('Address not found');
    }

    await prisma.address.delete({ where: { id } });

    return { success: true };
  });

  // Set address as default
  fastify.post<{ Params: { id: string } }>('/:id/default', async (request, reply) => {
    const userId = request.dbUserId;
    if (!userId) {
      return reply.unauthorized('User not authenticated');
    }

    const { id } = request.params;

    const existing = await prisma.address.findUnique({
      where: { id },
      select: { userId: true, isSaved: true },
    });

    if (!existing || existing.userId !== userId || !existing.isSaved) {
      return reply.notFound('Address not found');
    }

    // Unset all defaults, then set this one
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId, isSaved: true, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return { success: true };
  });
};

export default addressesRoutes;
