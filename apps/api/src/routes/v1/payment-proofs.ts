import { FastifyPluginAsync } from 'fastify';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const paymentProofsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  fastify.post('/', async (request, reply) => {
    return reply.notImplemented('POST /payment-proofs - upload payment proof');
  });

  fastify.get('/:bookingId', async (request, reply) => {
    return reply.notImplemented('GET /payment-proofs/:bookingId - get payment proofs for booking');
  });
};

export default paymentProofsRoutes;
