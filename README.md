# Мастерчист

Платформа онлайн-бронирования услуг химчистки с интеграцией Telegram Bot и Mini App.

## Описание

**Мастерчист** — B2C сервис для аренды наборов химчистки самообслуживания с доставкой. Клиенты бронируют временной слот через Telegram, вносят предоплату и получают набор для самостоятельной чистки мебели и ковров.

### Решаемые задачи

- Онлайн-бронирование с защитой от двойных броней
- Учёт ограниченного количества наборов по городам
- Предоплата через загрузку чека
- Админ-подтверждение оплаты
- Уведомления в Telegram

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        MONOREPO                             │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                      │
│  ├── api/        REST API (Fastify)           :3001         │
│  ├── bot/        Telegram Bot (grammY)        polling/wh    │
│  └── web/        Mini App (Next.js 14)        :3002         │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                  │
│  ├── db/         Prisma ORM + PostgreSQL                    │
│  └── shared/     Типы, константы, утилиты                   │
└─────────────────────────────────────────────────────────────┘
```

**API как источник истины** — вся бизнес-логика сосредоточена в `apps/api`. Bot и Mini App являются клиентами API.

### Компоненты

| Компонент | Назначение |
|-----------|------------|
| `apps/api` | REST API для бронирований, доступности, загрузки чеков |
| `apps/bot` | Telegram Bot с conversation flow и админ-панелью |
| `apps/web` | Telegram Mini App для визуального бронирования |
| `packages/db` | Prisma schema, миграции, seed data |
| `packages/shared` | Shared типы и константы |

## Технологический стек

### Backend (API)

- **Runtime**: Node.js 20
- **Framework**: Fastify 4
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Validation**: Zod
- **Auth**: Telegram initData verification

### Telegram Bot

- **Framework**: grammY
- **Conversations**: @grammyjs/conversations
- **Sessions**: In-memory (stateless design)
- **Mode**: Polling (dev) / Webhook (prod)

### Mini App (Web)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **SDK**: Telegram WebApp

### Infrastructure

- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Package Manager**: pnpm (workspaces)

## Основные фичи

### Бронирование Self-Cleaning

1. Выбор города и даты
2. Проверка доступных слотов (учёт наборов)
3. Ввод адреса и контактов
4. Создание брони с атомарным захватом набора

### Защита от двойных броней

- Уникальный constraint `(kitId, scheduledDate, timeSlotId)`
- Транзакционная проверка доступности
- HTTP 409 при конфликте

### Предоплата

1. Клиент получает реквизиты
2. Загружает фото чека (бот или Mini App)
3. Админ получает уведомление с inline-кнопками
4. Подтверждение / отклонение

### Статусы бронирования

| Статус | Описание |
|--------|----------|
| `new` | Создано, ожидает загрузки чека |
| `awaiting_prepayment` | Чек загружен, ожидает проверки |
| `prepaid` | Предоплата подтверждена |
| `confirmed` | Заказ выполнен |
| `cancelled` | Отменено |

## Локальный запуск

### Требования

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16 (или через Docker)

### Установка

```bash
# Клонирование
git clone https://github.com/YOUR_REPO/himchistka.git
cd himchistka

# Установка зависимостей
pnpm install

# Настройка окружения
cp .env.example .env
# Заполнить BOT_TOKEN, ADMIN_TELEGRAM_ID
```

### Запуск через Docker Compose

```bash
# Запуск всех сервисов
docker compose up -d

# Миграции
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed

# Проверка
curl http://localhost:3001/health
```

### Запуск для разработки

```bash
# База данных
docker compose up -d postgres

# Миграции
pnpm --filter @himchistka/db db:migrate
pnpm --filter @himchistka/db db:seed

# Запуск сервисов (в разных терминалах)
pnpm --filter @himchistka/api dev      # :3001
pnpm --filter @himchistka/bot dev      # polling
pnpm --filter @himchistka/web dev      # :3002
```

## Production Deploy

Подробная инструкция: [`deploy/DEPLOY.md`](deploy/DEPLOY.md)

### Краткий обзор

1. **VDS**: Ubuntu 22.04, 2GB RAM
2. **Docker**: Контейнеризация всех сервисов
3. **Nginx**: Reverse proxy с SSL termination
4. **HTTPS**: Let's Encrypt через Certbot
5. **Bot**: Webhook mode через `/bot/webhook`

```bash
# На сервере
./deploy/setup-server.sh
./deploy/deploy.sh
```

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `BOT_TOKEN` | Telegram Bot API token | `123456:ABC...` |
| `ADMIN_TELEGRAM_ID` | ID администратора для уведомлений | `123456789` |
| `WEBHOOK_DOMAIN` | Домен для webhook (prod) | `example.com` |
| `NEXT_PUBLIC_API_URL` | URL API для Mini App | `https://example.com/api` |
| `CORS_ORIGIN` | Разрешённый origin | `https://example.com` |

Полный список: [`.env.example`](.env.example)

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe (+ DB) |
| `GET` | `/api/v1/availability` | Доступные слоты |
| `POST` | `/api/v1/bookings` | Создание брони |
| `GET` | `/api/v1/bookings/:id` | Детали брони |
| `POST` | `/api/v1/bookings/:id/payment-proof` | Загрузка чека |
| `PATCH` | `/api/v1/bookings/:id/confirm` | Подтверждение (admin) |
| `PATCH` | `/api/v1/bookings/:id/reject` | Отклонение (admin) |

## Структура проекта

```
.
├── apps/
│   ├── api/                 # REST API
│   │   ├── src/
│   │   │   ├── routes/      # Endpoints
│   │   │   ├── services/    # Business logic
│   │   │   └── plugins/     # Fastify plugins
│   │   └── Dockerfile
│   ├── bot/                 # Telegram Bot
│   │   ├── src/
│   │   │   ├── conversations/
│   │   │   ├── handlers/
│   │   │   └── keyboards.ts
│   │   └── Dockerfile
│   └── web/                 # Mini App
│       ├── src/
│       │   ├── app/         # Next.js App Router
│       │   ├── components/
│       │   └── lib/
│       └── Dockerfile
├── packages/
│   ├── db/                  # Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/index.ts
│   └── shared/              # Shared code
│       └── src/
├── deploy/                  # Deploy scripts
│   ├── nginx.conf
│   ├── setup-server.sh
│   ├── deploy.sh
│   └── DEPLOY.md
├── docker-compose.yml
├── .env.example
└── README.md
```

## Лицензия

Proprietary. All rights reserved.