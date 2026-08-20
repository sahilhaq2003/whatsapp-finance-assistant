# Go-Live Checklist

Complete checklist for launching the WhatsApp-First Business Finance Assistant to production.

---

## Phase 1: Infrastructure (T-14 days)

### Cloud Provider Account

- [ ] Create production account (Fly.io / AWS / GCP)
- [ ] Set up billing alerts (>$50, >$100, >$500)
- [ ] Enable MFA on all admin accounts
- [ ] Create separate staging and production projects/orgs
- [ ] Set up IAM roles with least privilege

### Domain & DNS

- [ ] Purchase/verify domain (example.com)
- [ ] Configure CloudFlare DNS
  - [ ] A record → backend
  - [ ] CNAME → frontend
  - [ ] CNAME → API
- [ ] SSL/TLS certificates provisioned
- [ ] DNS propagation verified (`dig example.com`)

### MongoDB Atlas

- [ ] Production cluster created (M30+)
- [ ] 3-node replica set in correct region
- [ ] Database user created with strong password
- [ ] IP whitelist configured (application IPs only)
- [ ] Continuous backups enabled
- [ ] Point-in-time recovery enabled
- [ ] Audit logging enabled
- [ ] Atlas alerts configured
  - [ ] Connection count > 80%
  - [ ] CPU > 80%
  - [ ] Storage > 80%
  - [ ] Oplog window < 24h
- [ ] Connection pooling configured (max: 20, min: 5)

### Redis

- [ ] Production instance created (Standard tier)
- [ ] TLS enabled
- [ ] Strong password set
- [ ] AOF persistence enabled
- [ ] maxmemory-policy set to allkeys-lru
- [ ] VPC peering or private endpoint configured
- [ ] Firewall rules restrict to app IPs only

---

## Phase 2: Application Configuration (T-10 days)

### Backend Secrets

Generate all secrets and store in platform secrets manager:

```bash
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
WHATSAPP_VERIFY_TOKEN=$(openssl rand -hex 16)
```

- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `MONGODB_URI` (production connection string)
- [ ] `MONGODB_DB_NAME=finance`
- [ ] `REDIS_HOST` (production Redis)
- [ ] `REDIS_PORT=6379`
- [ ] `REDIS_PASSWORD` (production)
- [ ] `REDIS_TLS=true`
- [ ] `JWT_SECRET` (generated, 256-bit)
- [ ] `JWT_REFRESH_SECRET` (generated, 256-bit)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `JWT_REFRESH_EXPIRES_IN=30d`
- [ ] `WHATSAPP_PHONE_NUMBER_ID`
- [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID`
- [ ] `WHATSAPP_ACCESS_TOKEN` (non-expiring system user token)
- [ ] `WHATSAPP_VERIFY_TOKEN`
- [ ] `WHATSAPP_APP_SECRET`
- [ ] `WHATSAPP_API_VERSION=v18.0`
- [ ] `OPENAI_API_KEY` (production)
- [ ] `OPENAI_MODEL=gpt-4o`
- [ ] `CORS_ORIGINS=https://app.example.com`
- [ ] `RATE_LIMIT_TTL=60`
- [ ] `RATE_LIMIT_MAX=100`
- [ ] `LOG_LEVEL=info`
- [ ] `SENTRY_DSN` (production project)

### Worker Secrets

- [ ] All shared secrets (same as backend)
- [ ] `WORKER_CONCURRENCY=10`
- [ ] `WORKER_SHUTDOWN_TIMEOUT=10000`

### Frontend Secrets

- [ ] `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1`
- [ ] `NEXT_PUBLIC_ENVIRONMENT=production`
- [ ] `NEXT_PUBLIC_APP_NAME=Business Finance Assistant`
- [ ] `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` (GA4)
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `NEXTAUTH_SECRET` (if used)

---

## Phase 3: WhatsApp Business (T-7 days)

### Meta Business Manager

- [ ] Business account verified
- [ ] WhatsApp Business Account created
- [ ] Phone number registered and verified
- [ ] Business profile completed (name, description, logo, website)
- [ ] Message templates submitted and approved
  - [ ] Transaction confirmation template
  - [ ] Daily summary template
  - [ ] Invoice ready template
  - [ ] Weekly report template
- [ ] Production access requested for Cloud API
- [ ] System user created with `whatsapp_business_messaging` permission
- [ ] Non-expiring access token generated
- [ ] Webhook subscribed to events:
  - [ ] `messages`
  - [ ] `message_deliveries`
  - [ ] `message_reads`
  - [ ] `account_update`

### Webhook Configuration

- [ ] Production webhook URL set: `https://api.example.com/webhook/whatsapp`
- [ ] Verify token matches `WHATSAPP_VERIFY_TOKEN`
- [ ] Webhook verification test passes
- [ ] Signature validation (`X-Hub-Signature-256`) implemented and tested

### Testing with Meta

- [ ] Send test message from personal WhatsApp
- [ ] Receive AI response
- [ ] Verify message delivery status updates
- [ ] Test with multiple message types (text, image, document)
- [ ] Test error handling (invalid input, rate limits)
- [ ] Verify 24-hour session window behavior

---

## Phase 4: Security (T-5 days)

### Application Security

- [ ] All secrets in platform secrets manager (NOT in code or .env files)
- [ ] `.env` files in `.gitignore`
- [ ] No secrets in git history (`git log -S "SECRET" --all`)
- [ ] CORS restricted to production origins only
- [ ] Rate limiting active and tested
- [ ] Request validation on all endpoints (class-validator)
- [ ] SQL/NoSQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] Helmet.js security headers configured
- [ ] WhatsApp webhook signature validation active

### Infrastructure Security

- [ ] MongoDB IP whitelist: application IPs only
- [ ] Redis password + TLS
- [ ] All services behind load balancer
- [ ] No direct internet access to backend or worker
- [ ] SSH access restricted or disabled
- [ ] CloudFlare WAF rules configured
- [ ] DDoS protection active

### Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Data retention policy documented
- [ ] GDPR/CCPA compliance (if applicable)
- [ ] Financial data handling compliant

---

## Phase 5: Monitoring & Observability (T-3 days)

### Logging

- [ ] Structured JSON logging configured
- [ ] Log levels appropriate (info in production)
- [ ] Sensitive data not logged (passwords, tokens, PII)
- [ ] Log aggregation tool configured (Datadog / LogDNA / ELK)

### Error Tracking

- [ ] Sentry configured for backend
- [ ] Sentry configured for worker
- [ ] Sentry configured for frontend
- [ ] Source maps uploaded for frontend
- [ ] Error alerting rules configured

### Uptime Monitoring

- [ ] External uptime check on `https://api.example.com/health`
- [ ] External uptime check on `https://app.example.com`
- [ ] Check interval: 1 minute
- [ ] Alert channel: PagerDuty / Slack

### Alerts

- [ ] API error rate > 1% → PagerDuty
- [ ] API latency p95 > 3s → Slack
- [ ] Queue depth > 100 for 10 min → Slack
- [ ] Health check failing → PagerDuty
- [ ] MongoDB connections > 80% → PagerDuty
- [ ] Redis memory > 80% → Slack
- [ ] Disk usage > 90% → Slack

### Dashboards

- [ ] API request rate dashboard
- [ ] Error rate dashboard
- [ ] Queue processing dashboard
- [ ] MongoDB performance dashboard
- [ ] Redis performance dashboard
- [ ] Business metrics dashboard (messages processed, transactions added)

---

## Phase 6: Testing (T-3 days)

### Staging Validation

- [ ] Full E2E test suite passing on staging
- [ ] Integration tests passing
- [ ] Load test completed (target: 100 concurrent users)
- [ ] Stress test completed (target: 500 concurrent users)
- [ ] WhatsApp message flow tested end-to-end
- [ ] Invoice generation tested
- [ ] Report generation tested
- [ ] Error scenarios tested (invalid input, API failures)

### Security Testing

- [ ] Penetration test completed (if required)
- [ ] OWASP Top 10 checklist reviewed
- [ ] Dependency audit (`npm audit`)
- [ ] Container image scan (`trivy image`)

### Performance Testing

```bash
# Run load test (example with k6)
k6 run --vus 100 --duration 5m scripts/load-test.js

# Expected results:
# - p50 response time < 500ms
# - p95 response time < 2000ms
# - p99 response time < 5000ms
# - Error rate < 0.1%
# - Throughput > 500 req/s
```

---

## Phase 7: Deployment (T-1 day)

### Pre-Deploy

- [ ] All staging tests passing
- [ ] Database migrations tested on staging
- [ ] Rollback plan documented and tested
- [ ] Team notified of deployment window
- [ ] On-call engineer assigned
- [ ] Deployment freeze on non-critical changes

### Deploy Order

```
1. Database migrations
2. Worker (backward-compatible)
3. Backend API
4. Frontend
5. Smoke tests
6. Monitor for 30 minutes
```

### Deploy Commands

```bash
# 1. Run migrations
npm run migration:run --workspace=backend --env production

# 2. Deploy worker
fly deploy --config worker/fly.toml --app finance-worker --strategy rolling

# 3. Deploy backend
fly deploy --config backend/fly.toml --app finance-api --strategy rolling

# 4. Deploy frontend
fly deploy --config frontend/fly.toml --app finance-web --strategy rolling

# 5. Verify
curl https://api.example.com/health
curl https://app.example.com/
```

### Post-Deploy Smoke Tests

```bash
# API health
curl -sf https://api.example.com/health

# WhatsApp webhook verification
curl -sf "https://api.example.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=test"

# Frontend loads
curl -sf https://app.example.com/ | grep -q "<!DOCTYPE"

# Send test WhatsApp message
# → Verify AI response received
# → Verify transaction recorded in MongoDB
# → Verify no errors in Sentry
```

---

## Phase 8: Go-Live (T-0)

### Final Checks

- [ ] All services showing healthy in monitoring
- [ ] No errors in Sentry for 30 minutes
- [ ] WhatsApp message flow working
- [ ] Dashboard accessible
- [ ] Team notified of successful launch

### Enable Traffic

- [ ] Update DNS to point to production
- [ ] CloudFlare proxy enabled
- [ ] Rate limiting active
- [ ] WAF rules active

### Communication

- [ ] Internal team notified
- [ ] Stakeholders notified
- [ ] Support team briefed on common issues
- [ ] Documentation links shared

---

## Phase 9: Post-Launch (T+1 to T+7 days)

### Day 1

- [ ] Monitor error rates hourly
- [ ] Check queue processing times
- [ ] Review WhatsApp delivery rates
- [ ] Address any critical bugs immediately

### Day 2-3

- [ ] Review user feedback
- [ ] Check performance metrics
- [ ] Optimize slow queries if any
- [ ] Fine-tune rate limits if needed

### Day 7

- [ ] Full week review
- [ ] Performance report
- [ ] Error report
- [ ] User adoption metrics
- [ ] Infrastructure cost review
- [ ] Lessons learned document

---

## Emergency Contacts

| Role | Name | Contact |
|---|---|---|
| Engineering Lead | — | — |
| DevOps | — | — |
| On-call Engineer | — | — |
| Meta/WhatsApp Support | — | business.facebook.com/help |
| MongoDB Atlas Support | — | cloud.mongodb.com/support |
| OpenAI Support | — | help.openai.com |

---

## Rollback Quick Reference

```bash
# If anything goes wrong during go-live:

# 1. Rollback all services
fly releases rollback --app finance-api
fly releases rollback --app finance-worker
fly releases rollback --app finance-web

# 2. Disable webhook in Meta Business Manager

# 3. Check Sentry for errors

# 4. Notify team
```
