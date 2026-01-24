import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
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
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
  await fastify.register(telegramAuthPlugin);

  // Serve uploaded files
  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

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
