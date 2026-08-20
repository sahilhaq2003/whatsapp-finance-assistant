# Environment Variables Reference

Complete reference for all environment variables used across backend, worker, and frontend services.

---

## Backend (NestJS API Server)

### Core

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime environment | `development`, `staging`, `production` |
| `PORT` | No | HTTP server port (default: 3001) | `3001` |
| `API_PREFIX` | No | Route prefix (default: `api/v1`) | `api/v1` |
| `LOG_LEVEL` | No | Logging verbosity | `debug`, `info`, `warn`, `error` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins | `https://app.example.com,https://staging.example.com` |

### MongoDB

| Variable | Required | Description | Example |
|---|---|---|---|
| `MONGODB_URI` | Yes | Full MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/finance?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | Yes | Database name | `finance` |
| `MONGODB_MAX_POOL_SIZE` | No | Max connection pool size (default: 10) | `20` |
| `MONGODB_MIN_POOL_SIZE` | No | Min connection pool size (default: 2) | `5` |

### Redis

| Variable | Required | Description | Example |
|---|---|---|---|
| `REDIS_HOST` | Yes | Redis hostname | `redis.example.com` |
| `REDIS_PORT` | Yes | Redis port | `6379` |
| `REDIS_PASSWORD` | Yes | Redis auth password | `r3d1s_s3cur3_p@ss` |
| `REDIS_TLS` | No | Enable TLS (default: `false` in dev) | `true` |
| `REDIS_DB` | No | Redis database index (default: `0`) | `0` |

### JWT / Authentication

| Variable | Required | Description | Example |
|---|---|---|---|
| `JWT_SECRET` | Yes | Signing key (min 256-bit) | `your-256-bit-secret-key-here` |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`) | `7d` |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key | `your-refresh-256-bit-secret` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token lifetime (default: `30d`) | `30d` |

### WhatsApp (Meta Cloud API)

| Variable | Required | Description | Example |
|---|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Business phone number ID | `1234567890` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Yes | WABA ID | `WABA_ID_HERE` |
| `WHATSAPP_ACCESS_TOKEN` | Yes | System user access token | `EAABx...` |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Webhook verification token | `my_custom_verify_token` |
| `WHATSAPP_APP_SECRET` | Yes | App secret for signature validation | `app_secret_here` |
| `WHATSAPP_API_VERSION` | No | Graph API version (default: `v18.0`) | `v18.0` |
| `WHATSAPP_WEBHOOK_PATH` | No | Webhook route (default: `webhook/whatsapp`) | `webhook/whatsapp` |

### AI / LLM

| Variable | Required | Description | Example |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | No | Model name (default: `gpt-4o`) | `gpt-4o` |
| `OPENAI_MAX_TOKENS` | No | Max response tokens (default: `1024`) | `1024` |
| `OPENAI_TEMPERATURE` | No | Sampling temperature (default: `0.3`) | `0.3` |
| `LLM_FALLBACK_MODEL` | No | Fallback model if primary fails | `gpt-4o-mini` |

### Financial / External APIs

| Variable | Required | Description | Example |
|---|---|---|---|
| `PLAID_CLIENT_ID` | Conditional | Plaid client ID (if using Plaid) | `plaid_client_id` |
| `PLAID_SECRET` | Conditional | Plaid secret | `plaid_secret` |
| `PLAID_ENV` | Conditional | Plaid environment | `sandbox`, `development`, `production` |
| `STRIPE_SECRET_KEY` | Conditional | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Conditional | Stripe webhook signing secret | `whsec_...` |

### Rate Limiting

| Variable | Required | Description | Example |
|---|---|---|---|
| `RATE_LIMIT_TTL` | No | Window in seconds (default: `60`) | `60` |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: `60`) | `100` |

### BullMQ / Queue

| Variable | Required | Description | Example |
|---|---|---|---|
| `QUEUE_CONCURRENCY` | No | Default job concurrency (default: `5`) | `10` |
| `JOB_ATTEMPTS` | No | Default retry attempts (default: `3`) | `3` |
| `JOB_BACKOFF_DELAY` | No | Default backoff ms (default: `2000`) | `5000` |

---

## Worker (BullMQ Job Processor)

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `LOG_LEVEL` | No | Logging verbosity | `info` |
| `MONGODB_URI` | Yes | Same as backend | `mongodb+srv://...` |
| `MONGODB_DB_NAME` | Yes | Same as backend | `finance` |
| `REDIS_HOST` | Yes | Same as backend | `redis.example.com` |
| `REDIS_PORT` | Yes | Same as backend | `6379` |
| `REDIS_PASSWORD` | Yes | Same as backend | `r3d1s_s3cur3_p@ss` |
| `REDIS_TLS` | No | Same as backend | `true` |
| `OPENAI_API_KEY` | Yes | Same as backend | `sk-...` |
| `OPENAI_MODEL` | No | Same as backend | `gpt-4o` |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Same as backend | `1234567890` |
| `WHATSAPP_ACCESS_TOKEN` | Yes | Same as backend | `EAABx...` |
| `WORKER_CONCURRENCY` | No | Job concurrency per queue (default: `5`) | `10` |
| `WORKER_SHUTDOWN_TIMEOUT` | No | Graceful shutdown ms (default: `5000`) | `10000` |

---

## Frontend (Next.js)

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL | `https://api.example.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL (if applicable) | `wss://api.example.com` |
| `NEXT_PUBLIC_APP_NAME` | Yes | Application display name | `Business Finance Assistant` |
| `NEXT_PUBLIC_WHATSAPP_DEEP_LINK` | No | WhatsApp click-to-chat link | `https://wa.me/1234567890` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | No | GA4 measurement ID | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error tracking | `https://...@sentry.io/...` |
| `NEXT_PUBLIC_ENVIRONMENT` | Yes | Environment label | `staging`, `production` |
| `NEXTAUTH_SECRET` | No | NextAuth secret (if using auth) | `nextauth-secret` |
| `NEXTAUTH_URL` | No | NextAuth callback URL | `https://app.example.com` |

---

## Generating Secure Secrets

```bash
# Generate a 256-bit (32-byte) hex key
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Validation

The backend uses `@nestjs/config` with Joi schemas to validate env vars on startup. Missing required variables will prevent the process from starting. See `src/config/validation.ts` for the full schema.
