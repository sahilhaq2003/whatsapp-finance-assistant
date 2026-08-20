# CI/CD Pipeline Documentation

Automated build, test, and deployment pipeline using GitHub Actions.

---

## Pipeline Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push to  │───▶│  Lint &  │───▶│   Unit   │───▶│ Build &  │───▶│  Deploy  │
│  branch   │    │  Format  │    │  Tests   │    │  Docker  │    │  to env  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                       │                             │
                                       ▼                             ▼
                                ┌──────────┐                  ┌──────────┐
                                │   E2E    │                  │  Smoke   │
                                │  Tests   │                  │  Tests   │
                                └──────────┘                  └──────────┘
```

---

## GitHub Actions Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"

jobs:
  # ── Lint & Format ──────────────────────────────────────
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: |
          npm ci --workspace=backend --workspace=worker --workspace=frontend

      - name: Lint backend
        run: npm run lint --workspace=backend

      - name: Lint worker
        run: npm run lint --workspace=worker

      - name: Lint frontend
        run: npm run lint --workspace=frontend

      - name: Check formatting
        run: npm run format:check

      - name: Type check backend
        run: npm run typecheck --workspace=backend

      - name: Type check worker
        run: npm run typecheck --workspace=worker

      - name: Type check frontend
        run: npm run typecheck --workspace=frontend

  # ── Unit Tests ─────────────────────────────────────────
  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      MONGODB_URI: mongodb://localhost:27017/finance_test
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      JWT_SECRET: test-secret-for-ci-only
      JWT_REFRESH_SECRET: test-refresh-secret-for-ci
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - run: npm ci

      - name: Run backend unit tests
        run: npm run test --workspace=backend

      - name: Run worker unit tests
        run: npm run test --workspace=worker

      - name: Run frontend unit tests
        run: npm run test --workspace=frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1

  # ── Integration Tests ──────────────────────────────────
  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      MONGODB_URI: mongodb://localhost:27017/finance_test
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      JWT_SECRET: test-secret-for-ci-only
      JWT_REFRESH_SECRET: test-refresh-secret-for-ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci

      - name: Run backend integration tests
        run: npm run test:integration --workspace=backend

  # ── Build Docker Images ────────────────────────────────
  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          target: production
          push: ${{ github.event_name != 'pull_request' }}
          tags: |
            ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push worker
        uses: docker/build-push-action@v5
        with:
          context: ./worker
          file: ./worker/Dockerfile
          target: production
          push: ${{ github.event_name != 'pull_request' }}
          tags: |
            ghcr.io/${{ github.repository }}/worker:${{ github.sha }}
            ghcr.io/${{ github.repository }}/worker:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          target: production
          push: ${{ github.event_name != 'pull_request' }}
          tags: |
            ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Deploy to Staging ─────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Install Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy backend
        run: |
          flyctl deploy --config backend/fly.toml \
            --app finance-api-staging \
            --image ghcr.io/${{ github.repository }}/backend:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_STAGING_TOKEN }}

      - name: Deploy worker
        run: |
          flyctl deploy --config worker/fly.toml \
            --app finance-worker-staging \
            --image ghcr.io/${{ github.repository }}/worker:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_STAGING_TOKEN }}

      - name: Deploy frontend
        run: |
          flyctl deploy --config frontend/fly.toml \
            --app finance-web-staging \
            --image ghcr.io/${{ github.repository }}/frontend:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_STAGING_TOKEN }}

      - name: Smoke test
        run: |
          sleep 30
          curl -sf https://finance-api-staging.fly.dev/health || exit 1
          curl -sf https://finance-web-staging.fly.dev/ | grep -q "<!DOCTYPE" || exit 1

  # ── Deploy to Production ──────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://app.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Install Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy worker (first)
        run: |
          flyctl deploy --config worker/fly.toml \
            --app finance-worker \
            --image ghcr.io/${{ github.repository }}/worker:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_PRODUCTION_TOKEN }}

      - name: Deploy backend
        run: |
          flyctl deploy --config backend/fly.toml \
            --app finance-api \
            --image ghcr.io/${{ github.repository }}/backend:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_PRODUCTION_TOKEN }}

      - name: Deploy frontend
        run: |
          flyctl deploy --config frontend/fly.toml \
            --app finance-web \
            --image ghcr.io/${{ github.repository }}/frontend:${{ github.sha }} \
            --strategy rolling
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_PRODUCTION_TOKEN }}

      - name: Production smoke test
        run: |
          sleep 30
          curl -sf https://api.example.com/health || exit 1
          curl -sf https://app.example.com/ | grep -q "<!DOCTYPE" || exit 1

      - name: Notify deployment
        if: success()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-type: application/json' \
            -d '{"text":"✅ Production deploy successful: ${{ github.sha }}"}'
```

---

### 2. E2E Test Workflow (`.github/workflows/e2e.yml`)

```yaml
name: E2E Tests

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [develop]

jobs:
  e2e:
    name: E2E Tests (Staging)
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e --workspace=frontend
        env:
          BASE_URL: https://staging.example.com
          API_URL: https://finance-api-staging.fly.dev/api/v1

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

---

### 3. Database Migration Workflow (`.github/workflows/migrate.yml`)

```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]

jobs:
  migrate:
    name: Run Migrations
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci --workspace=backend

      - name: Run migrations
        run: npm run migration:run --workspace=backend
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          NODE_ENV: ${{ github.event.inputs.environment }}

      - name: Verify migration status
        run: npm run migration:status --workspace=backend
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          NODE_ENV: ${{ github.event.inputs.environment }}
```

---

## Required GitHub Secrets

| Secret | Environment | Description |
|---|---|---|
| `FLY_STAGING_TOKEN` | Staging | Fly.io API token for staging |
| `FLY_PRODUCTION_TOKEN` | Production | Fly.io API token for production |
| `SLACK_WEBHOOK` | Production | Slack notification webhook |
| `MONGODB_URI` | Staging, Production | MongoDB connection string |
| `REDIS_HOST` | Staging, Production | Redis hostname |
| `REDIS_PASSWORD` | Staging, Production | Redis password |
| `JWT_SECRET` | Staging, Production | JWT signing key |
| `JWT_REFRESH_SECRET` | Staging, Production | Refresh token key |
| `WHATSAPP_ACCESS_TOKEN` | Staging, Production | WhatsApp API token |
| `WHATSAPP_APP_SECRET` | Staging, Production | WhatsApp app secret |
| `OPENAI_API_KEY` | Staging, Production | OpenAI API key |

---

## Branch Strategy

```
main ───────────────────────────────────────────▶ Production
  │
  └── develop ──────────────────────────────────▶ Staging
        │
        ├── feature/xxx ────────────────────────▶ PR → develop
        ├── bugfix/xxx ─────────────────────────▶ PR → develop
        └── hotfix/xxx ─────────────────────────▶ PR → main + develop
```

| Branch | Deploys To | When |
|---|---|---|
| `main` | Production | Merge from develop or hotfix |
| `develop` | Staging | Push or merge from feature branches |
| `feature/*` | None (tests only) | PR builds |
| `hotfix/*` | Production | Emergency fix |

---

## Reusable Workflow — Docker Build

```yaml
# .github/workflows/docker-build.yml
name: Build Docker Image

on:
  workflow_call:
    inputs:
      service:
        required: true
        type: string
      target:
        required: false
        type: string
        default: production
    secrets:
      REGISTRY_TOKEN:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.REGISTRY_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./${{ inputs.service }}
          target: ${{ inputs.target }}
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/${{ inputs.service }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Local Development (No Docker)

```bash
# Terminal 1: Backend
cd backend
cp .env.example .env
npm install
npm run start:dev

# Terminal 2: Worker
cd worker
cp .env.example .env
npm install
npm run start:dev

# Terminal 3: Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```
