FROM node:22-alpine AS base
# Enable pnpm via corepack (version pinned by package.json "packageManager")
RUN corepack enable

# 1. Install deps
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Build the app — pinned to mock mode: this image is the clickdummy
# edition. isMockMode() reads the env at request time, but baking the value
# into BOTH stages closes the gap where a prerendered path could freeze the
# build-time value, and makes the image impossible to deploy un-mocked.
FROM base AS builder
WORKDIR /app
ENV MARKETPLACE_MOCK=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# 3. Create production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV MARKETPLACE_MOCK=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Only copy the final build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "server.js"]
