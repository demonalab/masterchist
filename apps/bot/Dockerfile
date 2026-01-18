# Stage 1: Build
FROM node:20.11-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared

# Copy app
COPY apps/bot ./apps/bot

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and app
RUN pnpm --filter @himchistka/shared build
RUN pnpm --filter @himchistka/bot build

# Stage 2: Production
FROM node:20.11-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

COPY --from=builder /app/apps/bot/package.json ./apps/bot/
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

CMD ["node", "apps/bot/dist/index.js"]
