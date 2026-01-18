import { FastifyPluginAsync } from 'fastify';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const availabilityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get('/', async (request, reply) => {
    return reply.notImplemented('GET /availability - get available dates');
  });

  fastify.get('/:date', async (request, reply) => {
    return reply.notImplemented('GET /availability/:date - get available time slots for date');
  });
};

export default availabilityRoutes;
