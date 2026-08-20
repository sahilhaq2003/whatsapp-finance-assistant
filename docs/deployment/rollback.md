# Rollback Procedures

Step-by-step rollback procedures for every failure scenario.

---

## Rollback Decision Tree

```
Deployment failed?
  │
  ├─ Services not starting? ──────────▶ Immediate Rollback (Section 1)
  │
  ├─ Health checks failing? ───────────▶ Immediate Rollback (Section 1)
  │
  ├─ Errors in production logs? ───────▶ Assess severity
  │     │
  │     ├─ Critical (data loss, auth broken) ──▶ Immediate Rollback
  │     │
  │     └─ Non-critical (UI bugs, slow queries) ──▶ Fix Forward
  │
  └─ MongoDB migration failed? ─────────▶ Restore from backup (Section 4)
```

---

## Section 1: Immediate Rollback (Fly.io)

### Option A: Revert to Previous Release

```bash
# List recent releases
fly releases list --app finance-api

# Rollback API to specific release
fly releases rollback <release-id> --app finance-api

# Rollback worker
fly releases list --app finance-worker
fly releases rollback <release-id> --app finance-worker

# Rollback frontend
fly releases list --app finance-web
fly releases rollback <release-id> --app finance-web
```

### Option B: Deploy Previous Git Commit

```bash
# Find the last known good commit
git log --oneline -10

# Checkout and deploy
git checkout <good-commit-hash>

# Deploy each service
fly deploy --config backend/fly.toml --app finance-api --strategy rolling
fly deploy --config worker/fly.toml --app finance-worker --strategy rolling
fly deploy --config frontend/fly.toml --app finance-web --strategy rolling

# Return to main
git checkout main
```

### Option C: Rollback via GitHub Actions

```bash
# Trigger rollback workflow manually
gh workflow run rollback.yml \
  -f environment=production \
  -f service=all \
  -f target_release=<release-id>
```

---

## Section 2: Rollback Workflow (`.github/workflows/rollback.yml`)

```yaml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]
      service:
        description: "Service to rollback"
        required: true
        type: choice
        options: [all, backend, worker, frontend]
      target_release:
        description: "Fly.io release ID to rollback to (leave empty for previous)"
        required: false

jobs:
  rollback:
    name: Rollback ${{ inputs.service }} (${{ inputs.environment }})
    runs-on: ubuntu-latest
    environment: ${{ inputs.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Rollback backend
        if: inputs.service == 'all' || inputs.service == 'backend'
        run: |
          APP="finance-api"
          if [ "${{ inputs.environment }}" = "staging" ]; then APP="finance-api-staging"; fi

          if [ -n "${{ inputs.target_release }}" ]; then
            flyctl releases rollback ${{ inputs.target_release }} --app $APP
          else
            flyctl releases rollback --app $APP
          fi
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Rollback worker
        if: inputs.service == 'all' || inputs.service == 'worker'
        run: |
          APP="finance-worker"
          if [ "${{ inputs.environment }}" = "staging" ]; then APP="finance-worker-staging"; fi

          if [ -n "${{ inputs.target_release }}" ]; then
            flyctl releases rollback ${{ inputs.target_release }} --app $APP
          else
            flyctl releases rollback --app $APP
          fi
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Rollback frontend
        if: inputs.service == 'all' || inputs.service == 'frontend'
        run: |
          APP="finance-web"
          if [ "${{ inputs.environment }}" = "staging" ]; then APP="finance-web-staging"; fi

          if [ -n "${{ inputs.target_release }}" ]; then
            flyctl releases rollback ${{ inputs.target_release }} --app $APP
          else
            flyctl releases rollback --app $APP
          fi
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Verify rollback
        run: |
          sleep 30
          if [ "${{ inputs.environment }}" = "production" ]; then
            curl -sf https://api.example.com/health || exit 1
          else
            curl -sf https://finance-api-staging.fly.dev/health || exit 1
          fi

      - name: Notify
        if: always()
        run: |
          STATUS="✅ rolled back"
          if [ "${{ job.status }}" = "failure" ]; then STATUS="❌ rollback failed"; fi
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-type: application/json' \
            -d "{\"text\":\"${STATUS}: ${{ inputs.service }} on ${{ inputs.environment }}\"}"
```

---

## Section 3: Code Rollback (Git)

```bash
# Revert a specific commit (creates new commit)
git revert <commit-hash>
git push origin main

# Revert last N commits
git revert HEAD~3..HEAD
git push origin main

# Reset to specific commit (DANGEROUS — use with caution)
# Only if no one has pulled the bad commits
git reset --hard <good-commit-hash>
git push --force-with-lease origin main
```

---

## Section 4: Database Rollback

### MongoDB — Restore from Atlas Backup

```bash
# Via Atlas UI:
# 1. Go to Database → Backup
# 2. Select snapshot to restore from
# 3. Choose "Download" or "Restore to Point-in-Time"

# Via Atlas CLI:
atlas clusters backups list finance-production

atlas clusters backups restore start \
  --clusterName finance-production \
  --snapshotId <snapshot-id> \
  --targetClusterName finance-production-restore

# After restore is verified, swap connection string
```

### MongoDB — Reverse Migration

```bash
# If a migration needs reversing
cd backend

# List applied migrations
npm run migration:status -- --env production

# Revert last migration
npm run migration:revert -- --env production
```

### MongoDB — Manual Data Fix

```bash
# Connect to production MongoDB
mongosh "mongodb+srv://..."

# Check what changed
db.transactions.find({ createdAt: { $gte: ISODate("2024-01-01T00:00:00Z") } })

# Fix specific records (be careful with updates)
db.transactions.updateOne(
  { _id: ObjectId("...") },
  { $set: { field: correctValue } }
)
```

---

## Section 5: Redis Rollback

```bash
# Flush BullMQ queues (if bad jobs are enqueued)
redis-cli -h <host> -a <password>

# List all queues
KEYS bull:*

# Remove failed jobs from a specific queue
LLEN bull:message-processing:failed
LREM bull:message-processing:failed 0 '{"id":"bad-job-id"}'

# Or flush all queues (NUCLEAR — only if safe)
# This will delete all queued jobs
DEL bull:message-processing:wait
DEL bull:message-processing:active
DEL bull:message-processing:completed
DEL bull:message-processing:failed
DEL bull:ai-inference:wait
DEL bull:ai-inference:active
DEL bull:ai-inference:completed
DEL bull:ai-inference:failed
```

---

## Section 6: WhatsApp Rollback

If the WhatsApp webhook is sending bad messages:

```bash
# 1. Immediately disable webhook in Meta Business Manager
#    → Settings → WhatsApp → Webhook → Remove URL

# 2. Or block webhook at load balancer level

# 3. Rollback backend to previous version

# 4. Re-enable webhook after verification
```

---

## Post-Rollback Checklist

- [ ] Verify all services are healthy (`/health` endpoint)
- [ ] Check Sentry for new errors
- [ ] Monitor logs for 30 minutes
- [ ] Test critical paths (WhatsApp message flow, dashboard)
- [ ] Notify team in Slack
- [ ] Create incident report if production impact
- [ ] Investigate root cause before re-deploying
- [ ] Update deployment runbook with lessons learned

---

## Rollback Time Estimates

| Scenario | Estimated Time |
|---|---|
| Fly.io release rollback | 2-5 minutes |
| Git revert + redeploy | 5-10 minutes |
| MongoDB restore from backup | 15-30 minutes |
| Redis queue flush | < 1 minute |
| Full environment rebuild | 30-60 minutes |

---

## Prevention

- Always use `--strategy rolling` for zero-downtime deploys
- Run database migrations BEFORE deploying new code
- Worker must be backward-compatible with previous API version
- Never skip staging validation
- Keep rollback scripts tested and documented
