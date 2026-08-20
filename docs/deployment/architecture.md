# Production Architecture

## High-Level Overview

```
                        ┌─────────────────────────────────────────┐
                        │              INTERNET                    │
                        └──────────────┬──────────────┬────────────┘
                                       │              │
                              ┌────────▼───────┐  ┌──▼───────────────┐
                              │   CloudFlare   │  │  WhatsApp/Meta   │
                              │   (CDN + WAF)  │  │  Cloud API       │
                              └────────┬───────┘  └──┬───────────────┘
                                       │              │
                              ┌────────▼──────────────▼──────────────┐
                              │        Load Balancer (L7)            │
                              │     (ALB / Cloud Run / Fly.io)       │
                              └────────┬──────────────┬──────────────┘
                                       │              │
                    ┌──────────────────┤              ├──────────────────┐
                    │                  │              │                  │
           ┌────────▼─────────┐ ┌─────▼──────┐ ┌────▼──────────────────▼────┐
           │   Next.js SSR    │ │  NestJS    │ │   NestJS Worker            │
           │   Frontend       │ │  API       │ │   (BullMQ Consumer)        │
           │   (Port 3000)    │ │  (Port 3001)│ │                            │
           └────────┬─────────┘ └─────┬──────┘ └────┬──────────────────────┘
                    │                  │              │
                    │           ┌──────┴──────┐       │
                    │           │             │       │
           ┌────────▼───┐  ┌───▼────┐  ┌─────▼──────▼─────┐
           │  Static    │  │MongoDB │  │     Redis         │
           │  Assets    │  │Atlas   │  │  (Managed)        │
           │  (CDN)     │  │        │  │                   │
           └────────────┘  └────────┘  └───────────────────┘
```

## Service Breakdown

### 1. Frontend — Next.js (Port 3000)

```
┌──────────────────────────────────────────┐
│              Next.js App                 │
├──────────────────────────────────────────┤
│  - Server-side rendering (SSR)           │
│  - Static page generation (SSG)          │
│  - API routes (BFF pattern)              │
│  - Tailwind CSS styling                  │
│  - WebSocket client (real-time updates)  │
├──────────────────────────────────────────┤
│  Build: next build                       │
│  Runtime: Node.js 20                     │
│  Memory: ~256MB                          │
│  Instances: 2-4 (auto-scaled)           │
└──────────────────────────────────────────┘
```

### 2. Backend API — NestJS (Port 3001)

```
┌──────────────────────────────────────────────────┐
│                 NestJS API Server                 │
├──────────────────────────────────────────────────┤
│  Modules:                                         │
│  ├─ AuthModule       (JWT, session management)   │
│  ├─ UserModule       (user CRUD, preferences)    │
│  ├─ WhatsAppModule   (webhook, message handling)  │
│  ├─ FinanceModule    (transactions, categories)   │
│  ├─ InvoiceModule    (invoice generation)         │
│  ├─ ReportModule     (analytics, summaries)       │
│  ├─ LLMModule        (AI conversation handler)    │
│  ├─ QueueModule      (BullMQ producers)           │
│  └─ WebhookModule    (Meta signature validation)  │
├──────────────────────────────────────────────────┤
│  - Request validation (class-validator)           │
│  - Rate limiting (express-rate-limit)             │
│  - Global exception filter                        │
│  - Request logging (Pino)                         │
│  - Health check endpoint (/health)                │
├──────────────────────────────────────────────────┤
│  Build: nest build                                │
│  Runtime: Node.js 20                              │
│  Memory: ~512MB                                   │
│  Instances: 2-4 (auto-scaled)                    │
└──────────────────────────────────────────────────┘
```

### 3. Worker — BullMQ Consumer

```
┌──────────────────────────────────────────────────────┐
│              NestJS Worker Process                    │
├──────────────────────────────────────────────────────┤
│  Queues:                                              │
│  ├─ message-processing   (WhatsApp message handling)  │
│  ├─ ai-inference         (LLM API calls)             │
│  ├─ invoice-generation   (PDF generation)            │
│  ├─ report-generation    (scheduled reports)          │
│  └─ notification         (email/SMS fallbacks)        │
├──────────────────────────────────────────────────────┤
│  Features:                                            │
│  - Graceful shutdown on SIGTERM/SIGINT                │
│  - Job retry with exponential backoff                 │
│  - Dead letter queue for failed jobs                  │
│  - Job progress tracking                              │
│  - Concurrent job processing (configurable)           │
├──────────────────────────────────────────────────────┤
│  Runtime: Node.js 20                                 │
│  Memory: ~768MB (AI inference jobs are memory-heavy)  │
│  Instances: 2-6 (auto-scaled based on queue depth)   │
└──────────────────────────────────────────────────────┘
```

### 4. MongoDB Atlas

```
┌──────────────────────────────────────────────┐
│              MongoDB Atlas                    │
├──────────────────────────────────────────────┤
│  Tier: M30+ (production)                     │
│  Replicas: 3-node replica set                │
│  Region: Same as application deployment      │
│  Backup: Continuous + daily snapshots        │
│  Encryption: AES-256 at rest, TLS in transit │
├──────────────────────────────────────────────┤
│  Collections:                                │
│  ├─ users            (user accounts)         │
│  ├─ conversations    (chat sessions)         │
│  ├─ messages         (chat messages)         │
│  ├─ transactions     (financial records)     │
│  ├─ categories       (expense/income cats)   │
│  ├─ invoices         (generated invoices)    │
│  ├─ reports          (cached reports)        │
│  ├─ business_profiles (business info)        │
│  └─ webhook_events   (audit log)             │
├──────────────────────────────────────────────┤
│  Indexes: Compound indexes on userId +       │
│           timestamp, category lookups,       │
│           conversation threads               │
└──────────────────────────────────────────────┘
```

### 5. Redis (Managed)

```
┌──────────────────────────────────────────────┐
│              Managed Redis                    │
├──────────────────────────────────────────────┤
│  Plan: Standard+ (production)                │
│  Memory: 1GB+                                │
│  Persistence: AOF enabled                    │
│  TLS: Enabled                                │
├──────────────────────────────────────────────┤
│  Use Cases:                                  │
│  ├─ BullMQ job queues                        │
│  ├─ Session store (optional)                 │
│  ├─ Rate limit counters                      │
│  ├─ LLM response cache                       │
│  ├─ Webhook deduplication                    │
│  └─ Real-time presence (typing indicators)   │
└──────────────────────────────────────────────┘
```

## Request Flow

### WhatsApp Message Flow

```
User sends WhatsApp message
        │
        ▼
Meta Cloud API → Webhook (POST /webhook/whatsapp)
        │
        ▼
Backend validates signature (X-Hub-Signature-256)
        │
        ▼
Deduplication check (Redis SET NX with message ID)
        │
        ▼
Persist raw message to MongoDB
        │
        ▼
Enqueue job: "message-processing" queue
        │
        ▼
Worker picks up job:
  ├─ Load conversation context from MongoDB
  ├─ Call OpenAI API with context + user message
  ├─ Parse AI response for actions (add transaction, etc.)
  ├─ Execute financial operations if applicable
  └─ Enqueue "send-reply" job
        │
        ▼
Worker sends reply via WhatsApp Cloud API
        │
        ▼
Delivery status webhook updates message status in MongoDB
```

### Dashboard / Web Flow

```
User opens dashboard
        │
        ▼
Next.js SSR renders page, calls backend API
        │
        ▼
Backend authenticates JWT → queries MongoDB
        │
        ▼
Returns JSON → Next.js renders UI
        │
        ▼
Client-side polling or WebSocket for real-time updates
```

## Scaling Strategy

| Service | Scaling Trigger | Min | Max | Target Metric |
|---|---|---|---|---|
| Next.js | CPU > 70% | 2 | 6 | CPU utilization |
| NestJS API | CPU > 70% or RPS > 500 | 2 | 8 | CPU / request rate |
| Worker | Queue depth > 50 | 2 | 6 | BullMQ waiting jobs |
| MongoDB | Connections > 80% pool | — | — | Atlas auto-scaling |
| Redis | Memory > 80% | — | — | Manual upgrade |

## Security Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  Public Zone (Internet-facing)                          │
│  ├─ CloudFlare WAF + DDoS protection                   │
│  ├─ Next.js (static assets, SSR pages)                 │
│  └─ Webhook endpoint (signature-validated)              │
├─────────────────────────────────────────────────────────┤
│  Private Zone (VPC / internal network)                  │
│  ├─ NestJS API (not exposed to internet directly)       │
│  ├─ Worker (no inbound ports)                           │
│  ├─ MongoDB Atlas (IP whitelist)                        │
│  └─ Redis (VPC peering or private endpoint)             │
└─────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────┐
│  Application Layer                               │
│  ├─ Structured JSON logs → stdout               │
│  ├─ Request tracing (request ID propagation)     │
│  └─ Custom metrics (business KPIs)               │
├─────────────────────────────────────────────────┤
│  Infrastructure Layer                             │
│  ├─ Health checks (/health endpoint)             │
│  ├─ Uptime monitoring (external ping)            │
│  └─ Resource utilization (CPU, memory, disk)     │
├─────────────────────────────────────────────────┤
│  Alerting                                         │
│  ├─ Error rate > 1% → PagerDuty                 │
│  ├─ Queue depth > 100 → Slack notification       │
│  ├─ Response time p95 > 2s → Slack              │
│  └─ MongoDB connections > 80% → Alert            │
└─────────────────────────────────────────────────┘
```
