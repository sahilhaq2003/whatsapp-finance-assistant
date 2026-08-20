# Test Inventory

## Test Infrastructure

- **Test framework:** Jest with ts-jest
- **Database:** mongodb-memory-server
- **Config:** `backend/jest.config.ts` and `backend/package.json` jest key
- **Helpers:** `backend/test/helpers/test-db.ts` (connectTestDb, closeTestDb, clearCollections), `backend/test/helpers/factories.ts` (test data factories)

## Test Results Summary

| Category | Status |
|----------|--------|
| Backend build | PASS (nest build, 0 errors) |
| Backend tests | 279 passed, 0 failed, 16 test suites |
| Frontend build | PASS (next build, 35 routes compiled) |

## Unit Tests (11 files, 213 tests)

| Test File | Tests | What It Proves | Result |
|-----------|:-----:|---------------|--------|
| beta-invites.spec.ts | 31 | Code hashing, invite expiry, status transitions, max uses, cohort, enrollment lifecycle | PASS |
| data-requests.spec.ts | 29 | Export creation, deletion confirmation, status transitions, data gathering, expiry | PASS |
| entitlements.spec.ts | 25 | Plan feature toggles, business overrides, free plan defaults, limit enforcement | PASS |
| financial-calculations.spec.ts | 24 | Income/expense totals, net cash flow, invoice line calculations, payment status, void restoration, outstanding, overdue, aging | PASS |
| financial-utils.spec.ts | 14 | toMinorUnits/fromMinorUnits, formatCurrency, round-trip fidelity, edge cases | PASS |
| ops-auth.spec.ts | 23 | PlatformRole guard, decorator metadata, guard composition, admin bypass | PASS |
| payment-lifecycle.spec.ts | 7 | Draft creation, issuing, partial payment, full payment, overpayment rejection, void restoration | PASS |
| product-metrics.spec.ts | 37 | Weekly active business, D7/D30 retention, WhatsApp success rate, AI correction rate, voice quality, reminder outcomes | PASS |
| reminder-safety.spec.ts | 6 | Skip paid, allow unpaid, deduplication, fresh state reload, frequency limits | PASS |
| report-period.service.spec.ts | 11 | Period presets, custom ranges, date validation, trend granularity | PASS |
| usage-quota.spec.ts | 26 | Atomic increment, period keys, quota checks, unlimited limit, independent metrics, monthly reset | PASS |

## Security Tests (5 files, 46 tests)

| Test File | Tests | What It Proves | Result |
|-----------|:-----:|---------------|--------|
| ai-safety.spec.ts | 10 | No direct financial saves, confirmation required, duplicate/expired protection, prompt injection defense, cross-business isolation | PASS |
| auth-security.spec.ts | 10 | Password hashing, token sanitization, input validation, secret exposure prevention | PASS |
| csv-injection.spec.ts | 10 | CSV formula injection protection, filename sanitization | PASS |
| tenant-isolation.spec.ts | 9 | Business ID validation, data filtering, no cross-business leakage, category/customer ownership | PASS |
| webhook-idempotency.spec.ts | 7 | Duplicate detection, concurrent handling, business resolution, signature verification | PASS |

## E2E Tests (1 file, 1 test)

| Test File | Tests | What It Proves | Result |
|-----------|:-----:|---------------|--------|
| app.e2e-spec.ts | 1 | Basic application startup | PASS |
