import { FastifyPluginAsync } from 'fastify';
import servicesRoutes from './services';
import availabilityRoutes from './availability';
import bookingsRoutes from './bookings';
import paymentProofsRoutes from './payment-proofs';
import adminRoutes, { getAdminRole } from './admin';
import conversationsRoutes from './conversations';
import addressesRoutes from './addresses';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { config } from '../../config';

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

  // Payment requisites - public endpoint (requires auth)
  fastify.get('/payment/requisites', { preHandler: [telegramAuthHook] }, async () => {
    return {
      prepaymentAmount: config.PREPAYMENT_AMOUNT,
      card: {
        number: config.PAYMENT_CARD_NUMBER,
        bank: config.PAYMENT_CARD_BANK,
        holder: config.PAYMENT_CARD_HOLDER,
      },
      sbp: {
        phone: config.PAYMENT_SBP_PHONE,
        bank: config.PAYMENT_SBP_BANK,
      },
    };
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
