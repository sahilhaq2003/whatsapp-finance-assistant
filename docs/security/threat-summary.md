# Threat Summary

Audited: August 2026

## 1. Cross-tenant ID manipulation

**Mitigation:** BusinessAccessGuard validates X-Business-Id membership against BusinessMember collection. All queries include businessId filter.

**Residual Risk:** Low (guard is mandatory for all financial routes).

## 2. Credential theft

**Mitigation:** bcrypt password hashing, HTTP-only cookies, no password in API responses, session TTL auto-expiry.

**Residual Risk:** Medium (depends on server security).

## 3. Webhook spoofing

**Mitigation:** HMAC-SHA256 signature verification on all incoming webhooks. Raw body preserved for signature computation.

**Residual Risk:** Low (if secret is properly managed).

## 4. Webhook replay

**Mitigation:** providerMessageId unique index prevents duplicate processing. Idempotent by design.

**Residual Risk:** Very Low.

## 5. AI prompt injection

**Mitigation:** AI cannot choose businessId/userId, cannot execute arbitrary queries, only 13 allow-listed query types. No database credentials in prompts.

**Residual Risk:** Medium (LLM behavior is probabilistic).

## 6. Financial hallucination

**Mitigation:** AI outputs are proposals requiring explicit user confirmation. Deterministic validation (amount>0, valid date, valid category). Database-grounded business queries.

**Residual Risk:** Low (confirmation gate prevents bad data).

## 7. Duplicate confirmation

**Mitigation:** Proposal status machine (PENDING -> CONFIRMED only once). findActiveProposal() prevents multiple active proposals.

**Residual Risk:** Very Low.

## 8. Duplicate webhook delivery

**Mitigation:** providerMessageId unique index + upsert pattern. Concurrent duplicate handling tested.

**Residual Risk:** Very Low.

## 9. CSV formula injection

**Mitigation:** Neutralizes =, +, -, @ prefixed values in CSV export. Filename sanitization.

**Residual Risk:** Low.

## 10. Unauthorized PDF access

**Mitigation:** Invoice PDF endpoint requires JWT + BusinessAccessGuard. PDF files stored locally.

**Residual Risk:** Low.

## 11. Voice/media abuse

**Mitigation:** Voice feature is opt-in per business. File size limit (10MB). Duration limit (120s). Temp files cleaned up.

**Residual Risk:** Medium (depends on OpenAI usage).

## 12. Rate-limit abuse

**Mitigation:** Global ThrottlerGuard (60 req/60s). Configurable.

**Residual Risk:** Low.

## 13. Secret leakage

**Mitigation:** .env in .gitignore, .env.example with placeholders, no secrets in logs or error responses.

**Residual Risk:** Low.

## 14. MongoDB outage

**Mitigation:** Health checks (ready endpoint checks DB connectivity). Graceful shutdown.

**Residual Risk:** Medium (single database dependency).

## 15. Redis outage

**Mitigation:** Redis failure does not block core finance. Reminders and summaries depend on Redis but transactions/invoices work without it.

**Residual Risk:** Low for core finance, Medium for automation.

## Summary

| Risk Level | Count |
|---|---|
| Very Low | 3 |
| Low | 8 |
| Medium | 4 |
| High | 0 |
| Critical | 0 |
