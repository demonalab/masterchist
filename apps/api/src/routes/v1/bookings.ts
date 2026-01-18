import { FastifyPluginAsync } from 'fastify';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.get('/', async (request, reply) => {
    return reply.notImplemented('GET /bookings - list user bookings');
  });

  fastify.post('/', async (request, reply) => {
    return reply.notImplemented('POST /bookings - create new booking');
  });

  fastify.get('/:id', async (request, reply) => {
    return reply.notImplemented('GET /bookings/:id - get booking details');
  });

  fastify.patch('/:id', async (request, reply) => {
    return reply.notImplemented('PATCH /bookings/:id - update booking');
  });

  fastify.post('/:id/cancel', async (request, reply) => {
    return reply.notImplemented('POST /bookings/:id/cancel - cancel booking');
  });
};

export default bookingsRoutes;
