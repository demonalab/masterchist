import { FastifyPluginAsync } from 'fastify';
import { prisma, ServiceCode } from '@himchistka/db';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get('/', async () => {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return services;
  });

  fastify.get<{ Params: { code: string } }>('/:code', async (request, reply) => {
    const service = await prisma.service.findUnique({
      where: { code: request.params.code as ServiceCode },
    });
    if (!service) {
      return reply.notFound('Service not found');
    }
    return service;
  });
};

export default servicesRoutes;
