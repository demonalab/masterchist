import { FastifyPluginAsync } from 'fastify';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get('/', async (request, reply) => {
    return reply.notImplemented('GET /services - list available services');
  });

  fastify.get('/:code', async (request, reply) => {
    return reply.notImplemented('GET /services/:code - get service details');
  });
};

export default servicesRoutes;
