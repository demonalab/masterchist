import { FastifyPluginAsync } from 'fastify';
import servicesRoutes from './services';
import availabilityRoutes from './availability';
import bookingsRoutes from './bookings';
import paymentProofsRoutes from './payment-proofs';
import adminRoutes, { getAdminRole } from './admin';
import conversationsRoutes from './conversations';
import addressesRoutes from './addresses';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  // Public admin role check - does NOT require admin access, only auth
  fastify.get('/admin/role', { preHandler: [telegramAuthHook] }, async (request) => {
    const telegramId = request.telegramUser?.id;
    if (!telegramId) {
      return { role: null };
    }
    
    const role = await getAdminRole(String(telegramId));
    return { role };
  });

  fastify.register(servicesRoutes, { prefix: '/services' });
  fastify.register(availabilityRoutes, { prefix: '/availability' });
  fastify.register(bookingsRoutes, { prefix: '/bookings' });
  fastify.register(paymentProofsRoutes, { prefix: '/payment-proofs' });
  fastify.register(adminRoutes, { prefix: '/admin' });
  fastify.register(conversationsRoutes, { prefix: '/conversations' });
  fastify.register(addressesRoutes, { prefix: '/addresses' });
};

export default v1Routes;
