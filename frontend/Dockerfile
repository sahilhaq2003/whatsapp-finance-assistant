# Build stage
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy standalone output (may be nested depending on workspace structure)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Flatten if nested (monorepo workspace nesting)
RUN if [ -f "./WhatsApp-First Business Finance Assistant/frontend/server.js" ]; then \
      cp "./WhatsApp-First Business Finance Assistant/frontend/server.js" ./server.js; \
      cp -r "./WhatsApp-First Business Finance Assistant/frontend/.next" ./.next; \
      rm -rf "./WhatsApp-First Business Finance Assistant"; \
    fi

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
