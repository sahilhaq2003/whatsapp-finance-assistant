# Staging Deployment Guide

Deploy a staging environment that mirrors production for pre-release validation.

---

## Overview

| Component | Staging | Production |
|---|---|---|
| Backend | 1 instance | 2-4 instances |
| Worker | 1 instance | 2-6 instances |
| Frontend | 1 instance | 2-4 instances |
| MongoDB | M10 shared | M30+ dedicated |
| Redis | Basic C1 | Standard |
| Domain | staging.example.com | app.example.com |
| Data | Synthetic + anonymized | Real |

---

## Platform Setup (Fly.io Example)

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Initialize Apps

```bash
# Backend
cd backend
fly launch --name finance-api-staging --copy-config --no-deploy
fly secrets set \
  NODE_ENV=staging \
  MONGODB_URI="mongodb+srv://..." \
  REDIS_HOST="..." \
  REDIS_PASSWORD="..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  WHATSAPP_ACCESS_TOKEN="..." \
  WHATSAPP_APP_SECRET="..." \
  WHATSAPP_VERIFY_TOKEN="..." \
  OPENAI_API_KEY="..."

# Worker
cd ../worker
fly launch --name finance-worker-staging --copy-config --no-deploy
fly secrets set \
  NODE_ENV=staging \
  MONGODB_URI="mongodb+srv://..." \
  REDIS_HOST="..." \
  REDIS_PASSWORD="..." \
  WHATSAPP_ACCESS_TOKEN="..." \
  OPENAI_API_KEY="..."

# Frontend
cd ../frontend
fly launch --name finance-web-staging --copy-config --no-deploy
fly secrets set \
  NEXT_PUBLIC_API_URL="https://finance-api-staging.fly.dev/api/v1" \
  NEXT_PUBLIC_ENVIRONMENT=staging
```

### 3. fly.toml — Backend

```toml
app = "finance-api-staging"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"
  target = "production"

[env]
  PORT = "3001"
  API_PREFIX = "api/v1"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

### 4. fly.toml — Worker

```toml
app = "finance-worker-staging"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"
  target = "production"

# Worker has no HTTP service — runs as a plain process
[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 768
```

### 5. fly.toml — Frontend

```toml
app = "finance-web-staging"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"
  target = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

---

## MongoDB Atlas Staging

```bash
# Create a staging cluster (or use a separate database on production cluster)
# In Atlas UI:
# 1. Create M10 cluster named "finance-staging"
# 2. Create database user: finance_staging_app
# 3. Add IP whitelist: 0.0.0.0/0 (for Fly.io dynamic IPs)
# 4. Get connection string and set in secrets
```

---

## Redis Staging

```bash
# Using Upstash or similar managed Redis
# 1. Create a Redis instance named "finance-staging"
# 2. Copy the connection details
# 3. Set secrets on Fly.io
```

---

## Deploying

```bash
# Deploy all services
fly deploy --config fly.toml --app finance-api-staging
fly deploy --config fly.toml --app finance-worker-staging
fly deploy --config fly.toml --app finance-web-staging

# Verify deployment
fly status --app finance-api-staging
fly status --app finance-worker-staging
fly status --app finance-web-staging

# Check health
curl https://finance-api-staging.fly.dev/health
```

---

## Staging Database Seeding

```bash
# Connect to staging MongoDB and run seed script
mongosh "mongodb+srv://..." --file scripts/seed-staging.js

# Seed script should:
# - Create 5-10 test users
# - Generate sample conversations
# - Insert 100-500 realistic transactions
# - Create category templates
# - Include edge cases (large amounts, special characters, Unicode)
```

---

## Staging Validation Checklist

### Smoke Tests

```bash
# API health check
curl -sf https://finance-api-staging.fly.dev/health || exit 1

# WhatsApp webhook verification
curl -sf "https://finance-api-staging.fly.dev/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# Frontend loads
curl -sf https://finance-web-staging.fly.dev/ | grep -q "<!DOCTYPE html>"
```

### Functional Tests

- [ ] Send a WhatsApp test message → get AI response
- [ ] Add a transaction via dashboard → verify in MongoDB
- [ ] Generate an invoice → download PDF
- [ ] Generate a report → view analytics
- [ ] Check BullMQ dashboard for job processing
- [ ] Verify rate limiting is active

### Integration Tests

```bash
cd backend
npm run test:e2e -- --environment=staging

cd worker
npm run test:integration -- --environment=staging
```

---

## Staging Environment Variables

Create `.env.staging` (never commit this):

```env
NODE_ENV=staging
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@staging-cluster.mongodb.net/finance_staging?retryWrites=true&w=majority
MONGODB_DB_NAME=finance_staging
REDIS_HOST=redis-staging.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=...
REDIS_TLS=true
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o
CORS_ORIGINS=https://staging.example.com
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=120
```

---

## Monitoring Staging

- Set up separate Sentry project: `finance-staging`
- Configure separate LogDNA/Datadog logging group
- Alert on errors > 5% (more lenient than production)
- Monitor queue depth for backlogs
