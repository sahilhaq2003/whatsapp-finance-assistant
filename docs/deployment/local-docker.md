# Local Development with Docker Compose

Run the full stack locally using Docker Compose for consistent, reproducible development environments.

---

## Prerequisites

- Docker Desktop 4.x+ (or Docker Engine + Docker Compose v2)
- Node.js 20+ (only needed for non-Docker tooling)
- At least 4GB RAM allocated to Docker

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/whatsapp-finance-assistant.git
cd whatsapp-finance-assistant

# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp worker/.env.example worker/.env

# Start everything
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

---

## docker-compose.yml

```yaml
version: "3.9"

services:
  # ── MongoDB ──────────────────────────────────────────────
  mongodb:
    image: mongo:7.0
    container_name: finance-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-password123}
      MONGO_INITDB_DATABASE: ${MONGODB_DB_NAME:-finance}
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - finance-net

  # ── Redis ────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: finance-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - finance-net

  # ── Backend API ──────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: development
    container_name: finance-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - ./backend/.env
    environment:
      NODE_ENV: development
      PORT: 3001
      MONGODB_URI: mongodb://${MONGO_USER:-admin}:${MONGO_PASSWORD:-password123}@mongodb:27017/${MONGODB_DB_NAME:-finance}?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - ./backend/src:/app/src
      - /app/node_modules
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - finance-net

  # ── Worker ───────────────────────────────────────────────
  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile
      target: development
    container_name: finance-worker
    restart: unless-stopped
    env_file:
      - ./worker/.env
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://${MONGO_USER:-admin}:${MONGO_PASSWORD:-password123}@mongodb:27017/${MONGODB_DB_NAME:-finance}?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - ./worker/src:/app/src
      - /app/node_modules
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - finance-net

  # ── Frontend ─────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    container_name: finance-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1
      NEXT_PUBLIC_ENVIRONMENT: development
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - /app/node_modules
      - /app/.next
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - finance-net

  # ── BullMQ Dashboard (dev only) ─────────────────────────
  bullboard:
    image: bullboard/bullboard:latest
    container_name: finance-bullboard
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - finance-net

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local

networks:
  finance-net:
    driver: bridge
```

---

## Dockerfile — Backend / Worker (Multi-stage)

```dockerfile
# ── Base ──────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ── Development ───────────────────────────────
FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# ── Build ─────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ── Production ────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser
CMD ["node", "dist/main"]
```

---

## Dockerfile — Frontend (Next.js)

```dockerfile
# ── Base ──────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ── Development ───────────────────────────────
FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# ── Build ─────────────────────────────────────
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm ci
COPY . .
RUN npm run build

# ── Production ────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Database Initialization

Create `scripts/mongo-init/01-init.js`:

```javascript
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || "finance");

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "createdAt"],
      properties: {
        email: { bsonType: "string" },
        createdAt: { bsonType: "date" },
      },
    },
  },
});

db.users.createIndex({ email: 1 }, { unique: true });
db.createCollection("conversations");
db.conversations.createIndex({ userId: 1, updatedAt: -1 });
db.createCollection("messages");
db.messages.createIndex({ conversationId: 1, createdAt: 1 });
db.createCollection("transactions");
db.transactions.createIndex({ userId: 1, date: -1 });
db.transactions.createIndex({ userId: 1, category: 1, date: -1 });
db.createCollection("categories");
db.categories.createIndex({ userId: 1, name: 1 }, { unique: true });
db.createCollection("invoices");
db.invoices.createIndex({ userId: 1, createdAt: -1 });

print("Database initialized successfully");
```

---

## Useful Commands

```bash
# Start in background
docker compose up -d

# View specific service logs
docker compose logs -f backend
docker compose logs -f worker

# Rebuild after dependency changes
docker compose build --no-cache backend

# Execute commands inside containers
docker compose exec backend sh
docker compose exec mongodb mongosh

# Seed database
docker compose exec mongodb mongosh < scripts/seed.js

# Check service health
docker compose ps

# Full reset (destroy data)
docker compose down -v
docker compose up -d
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs for the specific service
docker compose logs backend

# Common issue: MongoDB not ready
# Wait for healthcheck or increase start_period
```

### Port conflicts

```bash
# Check what's using port 3001
netstat -ano | findstr :3001

# Change ports in docker-compose.yml or .env
```

### Slow file watching (macOS/Windows)

The bind mounts use Docker's file sync which can be slow. For large codebases, consider:

```yaml
volumes:
  type: delegated
  source: ./backend/src
  target: /app/src
```

### Out of memory

Increase Docker Desktop memory allocation:
- Docker Desktop → Settings → Resources → Memory → 4GB+
