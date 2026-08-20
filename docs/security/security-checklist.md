# Security Checklist

Audited: August 2026

## Authentication

| Requirement | Status | Evidence |
|---|---|---|
| JWT in HTTP-only cookies (dp_access_token, dp_refresh_token) | PASS | `auth.controller.ts` cookie options |
| bcrypt password hashing | PASS | `auth.service.ts` bcrypt.hash/bcrypt.compare |
| Session management with TTL auto-expiry | PASS | `auth-session.schema.ts` expireAfterSeconds: 0 TTL index |

## Authorization

| Requirement | Status | Evidence |
|---|---|---|
| JwtAuthGuard on all protected routes | PASS | 4 guards in `guards/` directories |
| BusinessAccessGuard validates X-Business-Id membership | PASS | `business-access.guard.ts` |
| PlatformRoleGuard for admin/support endpoints | PASS | 4 guards in `guards/` directories |

## Business Isolation

| Requirement | Status | Evidence |
|---|---|---|
| BusinessAccessGuard checks BusinessMember record | PASS | `business-access.guard.ts` |
| Every financial collection scoped by businessId | PASS | 18 tenant-scoped schemas |
| Compound unique indexes prevent cross-business duplicates | PASS | 18 tenant-scoped schemas |

## TLS

| Requirement | Status | Evidence |
|---|---|---|
| TLS termination at infrastructure level | PARTIAL | CloudFlare/ALB handles TLS. Application does not enforce TLS directly. Requires production deployment with TLS-terminating proxy. |

## Secure Cookies

| Requirement | Status | Evidence |
|---|---|---|
| HttpOnly, SameSite=lax, Secure in production | PASS | `auth.controller.ts` cookie options, COOKIE_SECURE env |

## Secret Storage

| Requirement | Status | Evidence |
|---|---|---|
| Environment variables, .env in .gitignore | PASS | `.env.example`, `.gitignore` |
| No secrets in repository | PASS | `.env.example` with placeholders only |

## Password Hashing

| Requirement | Status | Evidence |
|---|---|---|
| bcrypt with configurable rounds | PASS | 12 in production, 4 in test. `auth.service.ts` bcrypt.hash/bcrypt.compare |

## Refresh Token Handling

| Requirement | Status | Evidence |
|---|---|---|
| HTTP-only cookie, session tokenHash validation | PASS | `auth.controller.ts` refresh endpoint |
| Rotation on refresh | PASS | `auth.controller.ts` refresh endpoint |
| Revocation on logout | PASS | `auth.controller.ts` refresh endpoint |

## CORS

| Requirement | Status | Evidence |
|---|---|---|
| Explicit allowed origins from CORS_ALLOWED_ORIGINS env | PASS | `cors.config.ts` |
| Credentials allowed, no wildcard | PASS | `cors.config.ts` |

## Security Headers

| Requirement | Status | Evidence |
|---|---|---|
| Helmet middleware enabled | PASS | `main.ts` helmet() call |
| CSP and cross-origin embedder disabled for compatibility | PASS | `main.ts` helmet() call |

## Rate Limiting

| Requirement | Status | Evidence |
|---|---|---|
| ThrottlerGuard registered as global APP_GUARD | PASS | `app.module.ts` |
| Configurable via THROTTLE_TTL/THROTTLE_LIMIT | PASS | `app.module.ts` |

## Request Validation

| Requirement | Status | Evidence |
|---|---|---|
| ValidationPipe with whitelist, transform, forbidNonWhitelisted | PASS | `main.ts` |
| DTOs with class-validator decorators | PASS | DTO files |

## ObjectId Validation

| Requirement | Status | Evidence |
|---|---|---|
| BusinessAccessGuard validates ObjectId format for X-Business-Id | PASS | `business-access.guard.ts` |

## File Authorization

| Requirement | Status | Evidence |
|---|---|---|
| Invoice PDFs served through authenticated endpoint with business context | PASS | `invoices.controller.ts` pdf endpoint |

## Webhook Signatures

| Requirement | Status | Evidence |
|---|---|---|
| HMAC-SHA256 verification via x-hub-signature-256 | PASS | `whatsapp-webhook.service.ts` verifySignature() |
| Raw body middleware for signature computation | PASS | `whatsapp-webhook.service.ts` verifySignature() |

## Idempotency

| Requirement | Status | Evidence |
|---|---|---|
| providerMessageId unique compound index | PASS | `message-event.schema.ts` unique index |
| Proposal TTL expiry | PASS | `proposal.schema.ts` TTL index |
| Invoice counter atomic increment | PASS | `invoice-counter.schema.ts` |

## Auditability

| Requirement | Status | Evidence |
|---|---|---|
| AuditLog collection with businessId, userId, entityType, entityId, action, oldValues, newValues | PASS | `audit-log.schema.ts`, `audit.service.ts` |

## Backup/Restore

| Requirement | Status | Evidence |
|---|---|---|
| Backup procedures documented | PARTIAL | Deployment docs describe backup procedures. No automated backup verification found. Restore test not yet performed. |
| Backup scripts | PARTIAL | No backup scripts found. |

## Logging

| Requirement | Status | Evidence |
|---|---|---|
| GlobalExceptionFilter logs 5xx as errors, 4xx as warnings | PASS | `global-exception.filter.ts` |
| RequestIdMiddleware for request tracing | PASS | RequestIdMiddleware |
| No secrets in logs | PASS | Passwords excluded from responses |

## Monitoring

| Requirement | Status | Evidence |
|---|---|---|
| Health endpoints (live, ready) | PASS | `health.controller.ts` |
| APM or external monitoring | PARTIAL | No APM or external monitoring configured. |

## Summary

| Status | Count |
|---|---|
| PASS | 22 |
| PARTIAL | 4 |
| FAIL | 0 |
