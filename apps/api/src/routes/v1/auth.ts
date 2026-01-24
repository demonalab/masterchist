import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@himchistka/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'masterchist-secret-key-change-in-prod';
const JWT_EXPIRES_IN = '30d';

const registerSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(6).max(100),
  firstName: z.string().min(1).max(128).optional(),
});

const loginSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(1).max(100),
  maxId: z.string().optional(),
});

const linkAccountSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(6).max(100),
});

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register new user with phone and password
  fastify.post<{ Body: z.infer<typeof registerSchema> }>('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const { phone, password, firstName } = parseResult.data;

    // Check if phone already registered
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, passwordHash: true },
    });

    if (existing && existing.passwordHash) {
      return reply.conflict('Телефон уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    if (existing) {
      // User exists (from bot) but no password - set password
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, firstName: firstName || undefined },
        select: { id: true, phone: true, firstName: true },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone,
          passwordHash,
          firstName,
        },
        select: { id: true, phone: true, firstName: true },
      });
    }

    const token = generateToken(user.id);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
      },
    };
  });

  // Login with phone and password
  fastify.post<{ Body: z.infer<typeof loginSchema> }>('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const { phone, password, maxId } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, firstName: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return reply.unauthorized('Неверный телефон или пароль');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.unauthorized('Неверный телефон или пароль');
    }

    // Link MAX account if maxId provided
    if (maxId) {
      const maxUser = await prisma.user.findUnique({
        where: { maxId: String(maxId) },
        select: { id: true },
      });

      if (maxUser && maxUser.id !== user.id) {
        // Merge: move bookings from MAX user to phone user
        await prisma.booking.updateMany({
          where: { userId: maxUser.id },
          data: { userId: user.id },
        });

        // Move addresses
        await prisma.address.updateMany({
          where: { userId: maxUser.id },
          data: { userId: user.id },
        });

        // Update phone user with MAX ID
        await prisma.user.update({
          where: { id: user.id },
          data: { maxId: String(maxId) },
        });

        // Delete old MAX user
        await prisma.user.delete({
          where: { id: maxUser.id },
        });
      } else if (!maxUser) {
        // Just add maxId to phone user
        await prisma.user.update({
          where: { id: user.id },
          data: { maxId: String(maxId) },
        });
      }
    }

    const token = generateToken(user.id);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
      },
    };
  });

  // Link existing Telegram/MAX account to phone account
  fastify.post<{ Body: z.infer<typeof linkAccountSchema> }>('/link', async (request, reply) => {
    const telegramId = request.telegramUser?.id;
    if (!telegramId) {
      return reply.unauthorized('Требуется авторизация через Telegram');
    }

    const parseResult = linkAccountSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.errors[0]?.message ?? 'Invalid request');
    }

    const { phone, password } = parseResult.data;

    // Find phone account
    const phoneUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, passwordHash: true },
    });

    if (!phoneUser || !phoneUser.passwordHash) {
      return reply.notFound('Аккаунт с таким телефоном не найден');
    }

    const valid = await bcrypt.compare(password, phoneUser.passwordHash);
    if (!valid) {
      return reply.unauthorized('Неверный пароль');
    }

    // Find Telegram user
    const telegramUser = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
      select: { id: true },
    });

    if (telegramUser && telegramUser.id !== phoneUser.id) {
      // Merge: move bookings from telegram user to phone user
      await prisma.booking.updateMany({
        where: { userId: telegramUser.id },
        data: { userId: phoneUser.id },
      });

      // Move addresses
      await prisma.address.updateMany({
        where: { userId: telegramUser.id },
        data: { userId: phoneUser.id },
      });

      // Update phone user with telegram data
      await prisma.user.update({
        where: { id: phoneUser.id },
        data: { telegramId: String(telegramId) },
      });

      // Delete old telegram user
      await prisma.user.delete({
        where: { id: telegramUser.id },
      });
    } else if (!telegramUser) {
      // Just add telegramId to phone user
      await prisma.user.update({
        where: { id: phoneUser.id },
        data: { telegramId: String(telegramId) },
      });
    }

    return { success: true, message: 'Аккаунты связаны' };
  });

  // Get current user profile
  fastify.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;

    if (token) {
      const decoded = verifyToken(token);
      userId = decoded?.userId ?? null;
    }

    if (!userId && request.telegramUser?.id) {
      const tgUser = await prisma.user.findUnique({
        where: { telegramId: String(request.telegramUser.id) },
        select: { id: true },
      });
      userId = tgUser?.id ?? null;
    }

    if (!userId) {
      return reply.unauthorized('Не авторизован');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        firstName: true,
        username: true,
        telegramId: true,
        maxId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.notFound('Пользователь не найден');
    }

    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      username: user.username,
      hasTelegram: !!user.telegramId,
      hasMax: !!user.maxId,
      createdAt: user.createdAt.toISOString(),
    };
  });

  // Get user's bookings (combined from all sources)
  fastify.get('/my-bookings', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;

    if (token) {
      const decoded = verifyToken(token);
      userId = decoded?.userId ?? null;
    }

    if (!userId && request.telegramUser?.id) {
      const tgUser = await prisma.user.findUnique({
        where: { telegramId: String(request.telegramUser.id) },
        select: { id: true },
      });
      userId = tgUser?.id ?? null;
    }

    if (!userId) {
      return reply.unauthorized('Не авторизован');
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        source: true,
        scheduledDate: true,
        createdAt: true,
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { code: true, title: true } },
        address: { select: { addressLine: true } },
      },
    });

    return bookings.map(b => ({
      id: b.id,
      status: b.status,
      source: (b as any).source ?? 'telegram_bot',
      scheduledDate: b.scheduledDate?.toISOString().split('T')[0] ?? null,
      createdAt: b.createdAt.toISOString(),
      kitNumber: b.cleaningKit?.number ?? null,
      timeSlot: b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : null,
      service: b.service?.title ?? b.service?.code ?? null,
      address: b.address?.addressLine ?? null,
    }));
  });
};

export default authRoutes;
export { verifyToken, generateToken };
