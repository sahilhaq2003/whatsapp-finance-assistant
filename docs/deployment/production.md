# Production Deployment Guide

Step-by-step guide for deploying to production with high availability.

---

## Infrastructure Overview

| Service | Provider | Tier | Instances | Region |
|---|---|---|---|---|
| Backend API | Fly.io / AWS ECS | Performance | 2-4 | us-east-1 |
| Worker | Fly.io / AWS ECS | Performance | 2-6 | us-east-1 |
| Frontend | Fly.io / Vercel | Standard | 2-4 | us-east-1 |
| MongoDB | Atlas | M30+ Dedicated | 3-node RS | us-east-1 |
| Redis | Upstash / ElastiCache | Standard | 1 (HA) | us-east-1 |
| CDN | CloudFlare | Pro | — | Global |
| DNS | CloudFlare | — | — | Global |

---

## Pre-Deployment

### 1. Create Production Secrets

```bash
# Generate all secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
WHATSAPP_VERIFY_TOKEN=$(openssl rand -hex 16)
```

### 2. MongoDB Atlas Production Setup

```bash
# In Atlas UI:
# 1. Create M30+ dedicated cluster: "finance-production"
# 2. Enable continuous backups
# 3. Create database user: finance_prod_app (strong password)
# 4. Whitelist only application IPs (Fly.io addrs or VPC CIDR)
# 5. Enable audit logging
# 6. Set up Atlas alerts (connections, CPU, storage, oplog window)
```

### 3. Redis Production Setup

```bash
# Using Upstash or ElastiCache
# 1. Create instance: finance-production
# 2. Plan: Standard (1GB+ RAM)
# 3. Enable TLS
# 4. Set strong password
# 5. Enable AOF persistence
# 6. Set maxmemory-policy: allkeys-lru
```

### 4. WhatsApp Production Configuration

```bash
# In Meta Business Manager:
# 1. Complete business verification
# 2. Request production access for WhatsApp Cloud API
# 3. Set production webhook URL: https://api.example.com/webhook/whatsapp
# 4. Subscribe to messages, message_deliveries, message_reads
# 5. Set access token to non-expiring system user token
# 6. Move from sandbox to production phone number
```

### 5. OpenAI Production

```bash
# In OpenAI dashboard:
# 1. Verify organization billing
# 2. Set usage limits (monthly budget cap)
# 3. Create separate API key for production
# 4. Enable production rate limits (if needed)
```

---

## Deployment Steps

### Phase 1: Database Migration

```bash
# Run any pending migrations before deploying new code
cd backend
npm run migration:run -- --env production

# Verify migrations
npm run migration:status -- --env production
```

### Phase 2: Deploy Worker First

```bash
# Deploy worker (backward-compatible with old API version)
cd worker

# Fly.io
fly deploy --config fly.toml --app finance-worker --strategy rolling

# Verify worker is healthy
fly logs --app finance-worker --instance <id>
```

### Phase 3: Deploy Backend API

```bash
cd backend

# Fly.io
fly deploy --config fly.toml --app finance-api --strategy rolling

# Rolling deploy: waits for new instance to be healthy before stopping old

# Verify
curl https://api.example.com/health
```

### Phase 4: Deploy Frontend

```bash
cd frontend

# Fly.io
fly deploy --config fly.toml --app finance-web --strategy rolling

# Vercel (if using)
vercel --prod
```

### Phase 5: Post-Deploy Validation

```bash
# Run smoke tests
./scripts/smoke-test.sh production

# Check all services
curl https://api.example.com/health
curl https://app.example.com/

# Monitor logs for 15 minutes
fly logs --app finance-api --app finance-worker
```

---

## fly.toml — Production Backend

```toml
app = "finance-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"
  target = "production"

[env]
  PORT = "3001"
  API_PREFIX = "api/v1"
  NODE_ENV = "production"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false
  min_machines_running = 2

  [http_service.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

  [http_service.checks]
    grace_period = "10s"
    interval = "15s"
    method = "GET"
    path = "/health"
    timeout = "5s"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[vm]]
  cpu_kind = "performance"
  cpus = 2
  memory_mb = 1024
```

---

## fly.toml — Production Worker

```toml
app = "finance-worker"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"
  target = "production"

[env]
  NODE_ENV = "production"
  WORKER_CONCURRENCY = "10"

[[vm]]
  cpu_kind = "performance"
  cpus = 2
  memory_mb = 2048
```

---

## Health Check Endpoint

Backend exposes `GET /health`:

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  async check(
    @InjectConnection() mongoConnection: Connection,
    @InjectRedis() redis: Redis,
  ) {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: 'up',
        redis: 'up',
      },
    };

    try {
      await mongoConnection.db.admin().ping();
    } catch {
      checks.services.mongodb = 'down';
      checks.status = 'degraded';
    }

    try {
      await redis.ping();
    } catch {
      checks.services.redis = 'down';
      checks.status = 'degraded';
    }

    const httpStatus = checks.status === 'ok' ? 200 : 503;
    return { statusCode: httpStatus, ...checks };
  }
}
```

---

## Scaling Configuration

### Auto-scaling Rules (Fly.io)

```toml
# In fly.toml for API
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 2

  [http_service.autoscaling]
    min_count = 2
    max_count = 8
    target_cpu = 70
    target_memory = 75
```

### Manual Scaling

```bash
# Scale backend to 4 instances
fly scale count 4 --app finance-api

# Scale worker to 3 instances
fly scale count 3 --app finance-worker

# Check current scale
fly status --app finance-api
```

---

## PostgreSQL (If Added Later)

Not in current scope, but if needed:

```bash
# On Fly.io
fly postgres create --name finance-db --region iad
fly postgres attach --app finance-api finance-db
```

---

## Domain & TLS Setup

```bash
# Point domains to Fly
fly certs add example.com --app finance-api
fly certs add api.example.com --app finance-api
fly certs add app.example.com --app finance-web

# In CloudFlare DNS:
# A record:    api.example.com → Fly app IP (or use CNAME)
# CNAME record: app.example.com → finance-web.fly.dev
```

---

## Monitoring & Alerts

### Sentry Setup

```typescript
// src/main.ts
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
}
```

### Key Alerts

| Alert | Threshold | Channel |
|---|---|---|
| API error rate | > 1% in 5 min | PagerDuty |
| API latency p95 | > 3s for 5 min | Slack |
| Worker queue depth | > 100 for 10 min | Slack |
| MongoDB connections | > 80% pool | PagerDuty |
| MongoDB storage | > 80% | PagerDuty |
| Redis memory | > 80% | Slack |
| Health check failing | 2 consecutive | PagerDuty |
| Disk usage (worker temp) | > 90% | Slack |

---

## Backup & Recovery

### MongoDB Backups

```bash
# Atlas continuous backups are enabled
# Manual snapshot before major deployments
atlas clusters backups create finance-production --snapshotName "pre-deploy-$(date +%Y%m%d)"

# Restore to point-in-time
atlas clusters backups restore start \
  --clusterName finance-production \
  --oplogTime <timestamp> \
  --targetClusterName finance-production-restore
```

### Redis Persistence

```bash
# Upstash: automatic RDB snapshots
# ElastiCache: enable snapshot backups
# Manual backup
redis-cli -h <host> -a <password> BGSAVE
```

---

## Security Checklist

- [ ] All secrets stored in platform secrets manager (not env files)
- [ ] TLS enforced on all endpoints
- [ ] CORS restricted to production domain
- [ ] Rate limiting configured and tested
- [ ] MongoDB IP whitelist restricts to app IPs only
- [ ] Redis password + TLS enabled
- [ ] WhatsApp webhook signature validation active
- [ ] No secrets in git history
- [ ] Sentry scrubbing sensitive data
- [ ] Audit logging enabled on MongoDB
