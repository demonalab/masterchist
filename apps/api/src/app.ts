import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import telegramAuthPlugin from './plugins/telegram-auth.plugin';
import healthRoutes from './routes/health';
import v1Routes from './routes/v1';
import { config } from './config';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(sensible);
  await fastify.register(telegramAuthPlugin);

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    const statusCode = error.statusCode ?? 500;
    const message = statusCode >= 500 ? 'Internal Server Error' : error.message;

    return reply.status(statusCode).send({
      error: error.name ?? 'Error',
      message,
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  await fastify.register(healthRoutes);
  await fastify.register(v1Routes, { prefix: '/api/v1' });

  return fastify;
}
