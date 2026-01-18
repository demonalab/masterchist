import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/health/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected' };
    } catch (error) {
      request.log.error(error, 'Database health check failed');
      return reply.status(503).send({
        status: 'not_ready',
        database: 'disconnected',
      });
    }
  });
};

export default healthRoutes;
