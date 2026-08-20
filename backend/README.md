# Dulan Progiciel — Backend

NestJS REST API for the Dulan Progiciel business finance assistant.

## Getting Started

```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm run start:dev
```

Runs at `http://localhost:5000/api`.

## Environment Variables

See `.env.example` for required variables. Never commit `.env`.

## Structure

- `src/config/` — Database and environment validation
- `src/common/` — Shared decorators, DTOs, enums, filters, guards, utils
- `src/modules/` — Feature modules (auth, users, businesses, transactions, etc.)
