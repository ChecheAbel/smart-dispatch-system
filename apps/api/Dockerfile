FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Prune the monorepo workspace for api
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune api --docker

# 2. Install dependencies & build
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Copy schema so postinstall / prisma generate runs cleanly
COPY --from=builder /app/out/full/apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=api...

# Create an isolated production deployment bundle with resolved node_modules
RUN pnpm --filter=api --prod deploy /app/deployed

# 3. Production runner
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache su-exec
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy isolated dependencies and project files
COPY --from=installer /app/deployed .
COPY --from=installer /app/apps/api/dist ./dist
COPY --from=installer /app/apps/api/prisma ./prisma

# Copy your entrypoint script
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]