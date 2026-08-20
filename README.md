# Dulan Progiciel

WhatsApp-first business finance assistant for Sri Lankan small businesses.

## Product Purpose

Dulan Progiciel enables small business owners to record income and expenses via WhatsApp messages, manage invoices, track payments, and receive financial summaries — all powered by AI extraction with mandatory human confirmation.

## Architecture

```
Internet
    ↓
Frontend (Next.js)  →  Backend API (NestJS)  →  MongoDB Atlas
                              ↓
                         Redis (BullMQ)
                              ↓
                         Worker (reminders, summaries)
                              ↓
                    WhatsApp Cloud API / AI Provider / Speech Provider
```

## Technology Stack

| Service | Tech | Port |
|---------|------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 | 3000 |
| Backend API | NestJS 11, Mongoose 9, Passport | 5000 |
| Worker | NestJS (application context) | — |
| Database | MongoDB Atlas (managed) | 27017 |
| Queue | Redis + BullMQ | 6379 |
| AI | OpenAI GPT-4o-mini (extraction + queries) | — |
| Speech | OpenAI Whisper-1 (voice-to-text) | — |

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Redis (local or managed)

### Backend
```bash
cd backend
cp .env.example .env  # Configure with your values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.local  # Set NEXT_PUBLIC_API_URL
npm install
npm run dev
```

### Worker (optional, for reminders/summaries)
```bash
cd backend
npm run start:worker
```

## Docker

```bash
docker-compose -f docker-compose.production-test.yml up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:5000/api
- Health: http://localhost:5000/api/health/ready

## Testing

```bash
cd backend
npm test              # All tests (279 tests)
npm run test:unit     # Unit tests only
npm run test:security # Security tests only
```

## Environment Variables

See [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md) or `backend/.env.example`.

Key variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Authentication secrets
- `OPENAI_API_KEY` — OpenAI API key for AI extraction
- `WHATSAPP_APP_SECRET` — Meta WhatsApp webhook signature secret
- `WHATSAPP_ACCESS_TOKEN` — Meta WhatsApp Cloud API token
- `REDIS_URL` — Redis connection string

## Key Features

### Core MVP
- **Authentication**: JWT + HTTP-only cookies + business access guard
- **Business Onboarding**: Registration, profile setup, LKR currency default
- **WhatsApp Text**: Webhook integration, AI extraction, proposal confirmation
- **Manual Transactions**: CRUD via dashboard with void workflow
- **Categories**: Income/expense, system/custom, per-business
- **Customers**: CRUD, archive/restore, transaction history
- **Invoicing**: Draft → Issue → PDF → Payment tracking
- **Dashboard**: Period totals, recent activity, outstanding invoices
- **Reports**: 8 report types with CSV/PDF export
- **Audit Logging**: All financial mutations tracked

### Beyond MVP
- **Voice Notes**: WhatsApp voice → Whisper-1 transcription → proposal
- **Automated Reminders**: BullMQ workers for invoice payment reminders
- **Scheduled Summaries**: Daily/weekly WhatsApp financial summaries
- **Business Questions**: AI-powered financial queries with DB grounding
- **Beta Analytics**: Product metrics, retention, AI quality tracking

## Documentation

### Architecture
- [System Architecture](docs/architecture/system-architecture.md)
- [Request Flows](docs/architecture/request-flows.md)
- [Data Model](docs/architecture/data-model.md)
- [Architecture Decisions](docs/architecture/architecture-decisions.md)

### API
- [API Inventory](docs/api/api-inventory.md) — 111 endpoints
- [Webhook Contracts](docs/api/webhook-contracts.md)

### AI / Responsible AI
- [Responsible AI](docs/ai/responsible-ai.md)
- [AI Safety Rules](docs/ai/ai-safety-rules.md)
- [Language Support](docs/ai/language-support.md)
- [AI Evaluation](docs/ai/evaluation.md)

### Security
- [Security Checklist](docs/security/security-checklist.md)
- [Privacy & Data Handling](docs/security/privacy-data-handling.md)
- [Threat Summary](docs/security/threat-summary.md)

### Testing
- [Test Inventory](docs/testing/test-inventory.md)
- [Acceptance Evidence](docs/testing/acceptance-evidence.md)
- [Beta Test Plan](docs/testing/beta-test-plan.md)

### Release
- [MVP Requirements Traceability](docs/release/mvp-requirements-traceability.md)
- [Implemented vs Postponed](docs/release/implemented-vs-postponed.md)
- [Known Limitations](docs/release/known-limitations.md)
- [Beta Release Notes](docs/release/beta-release-notes.md)
- [Beta Demo Scenarios](docs/release/beta-demo-scenarios.md)
- [Final MVP Checklist](docs/release/final-mvp-checklist.md)

### Deployment
- [Architecture](docs/deployment/architecture.md)
- [Environment Variables](docs/deployment/environment-variables.md)
- [Local Docker](docs/deployment/local-docker.md)
- [Staging](docs/deployment/staging.md)
- [Production](docs/deployment/production.md)
- [CI/CD](docs/deployment/ci-cd.md)
- [Rollback](docs/deployment/rollback.md)
- [Go-Live Checklist](docs/deployment/go-live-checklist.md)
- [Secret Management](docs/deployment/secret-management.md)

### Decisions
- [ADR-001: MongoDB as Primary Database](docs/decisions/adr-mongodb-primary-database.md)

## Data Safety

**Non-negotiable principle:**
```
AI Proposal → Human Confirmation → Financial Record
```

AI never directly creates financial records. All financial data goes through
human confirmation. MongoDB confirmed records are the source of truth.

See [Responsible AI](docs/ai/responsible-ai.md) and [Data Retention](docs/policies/data-retention.md).

## Known MVP Limitations

- Not a double-entry accounting ledger
- No bank feed integration
- English only (Sinhala/Tamil not production validated)
- Speech accuracy varies with audio quality
- AI depends on OpenAI API availability
- Scheduled features depend on Redis/worker availability
- No native mobile applications

See [Known Limitations](docs/release/known-limitations.md) for full details.

## License

Private — Dulan Progiciel
