import { FastifyPluginAsync } from 'fastify';
import servicesRoutes from './services';
import availabilityRoutes from './availability';
import bookingsRoutes from './bookings';
import paymentProofsRoutes from './payment-proofs';
import adminRoutes from './admin';
import conversationsRoutes from './conversations';
import addressesRoutes from './addresses';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(servicesRoutes, { prefix: '/services' });
  fastify.register(availabilityRoutes, { prefix: '/availability' });
  fastify.register(bookingsRoutes, { prefix: '/bookings' });
  fastify.register(paymentProofsRoutes, { prefix: '/payment-proofs' });
  fastify.register(adminRoutes, { prefix: '/admin' });
  fastify.register(conversationsRoutes, { prefix: '/conversations' });
  fastify.register(addressesRoutes, { prefix: '/addresses' });
};

export default v1Routes;
