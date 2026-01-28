# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack and install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Next.js pode não ter /public no repo; garanta a pasta para o COPY do runner
RUN mkdir -p public

# Build the application
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9002

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copia artefatos e dependências já instaladas no build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 9002

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "9002"]
