FROM node:20-alpine AS base

# This Dockerfile is optimized for monorepo using turborepo
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
RUN npm install -g pnpm turbo
COPY . .
RUN turbo prune api --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
RUN npm install -g pnpm

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# postinstall runs `prisma generate`; schema is not in the json prune output
COPY --from=builder /app/out/full/apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=api...

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache su-exec
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

ENV UPLOAD_ROOT=/var/smart-dispatch/uploads
RUN mkdir -p /var/smart-dispatch/uploads \
  && chown -R expressjs:nodejs /var/smart-dispatch/uploads

# Copy built application & schemas
COPY --from=installer /app/apps/api/package.json ./package.json
COPY --from=installer /app/apps/api/dist ./dist
COPY --from=installer /app/apps/api/prisma ./prisma

# Copy BOTH root and workspace node_modules so pnpm symlinks resolve properly
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules

COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

# Starts as root so a mounted volume can be chowned, then drops to expressjs.
ENTRYPOINT ["./docker-entrypoint.sh"]