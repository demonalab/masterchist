import { FastifyPluginAsync } from 'fastify';
import servicesRoutes from './services';
import availabilityRoutes from './availability';
import bookingsRoutes from './bookings';
import paymentProofsRoutes from './payment-proofs';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(servicesRoutes, { prefix: '/services' });
  fastify.register(availabilityRoutes, { prefix: '/availability' });
  fastify.register(bookingsRoutes, { prefix: '/bookings' });
  fastify.register(paymentProofsRoutes, { prefix: '/payment-proofs' });
};

export default v1Routes;
