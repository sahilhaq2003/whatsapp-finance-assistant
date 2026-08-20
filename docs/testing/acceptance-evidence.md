# Acceptance Evidence

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. WhatsApp expense/income message -> correct structured proposal | PASS | Webhook integration (whatsapp-webhook.service.ts), AI extraction (ai-extraction.service.ts), Proposal creation (ai-proposal.service.ts), Security tests (ai-safety.spec.ts) |
| 2. No AI-derived financial record saved without confirmation | PASS | Proposal state machine requires PENDING -> CONFIRMED transition. confirmProposal() checks status. Security test (ai-safety.spec.ts "should not allow direct transaction creation without confirmation") |
| 3. Webhook retries do not duplicate financial records | PASS | providerMessageId unique index (message-event.schema.ts), Deduplication in webhook service, Security test (webhook-idempotency.spec.ts) |
| 4. Users can correct misunderstood amount/date/category | PASS | processCorrection() in ai-extraction.service.ts, revisionHistory tracking, Security test (ai-safety.spec.ts "correction should update same proposal") |
| 5. Dashboard totals reconcile with stored transactions | PASS | Transaction summary via MongoDB aggregation (transactions.controller.ts /summary), Reports use fromMinorUnits for display. Note: Dashboard API aggregates from confirmed transactions only. |
| 6. Invoice totals and payment status deterministic | PASS | Payment lifecycle tests (payment-lifecycle.spec.ts), Overpayment rejection, Void payment restoration, Financial calculations (financial-calculations.spec.ts) |
| 7. Cannot access another business's data | PASS | BusinessAccessGuard validates membership, Tenant isolation tests (tenant-isolation.spec.ts), All queries include businessId filter |
| 8. Critical edits appear in audit log | PASS | AuditService.log() called on proposal confirm/reject/edit, WhatsApp connection/pairing actions. AuditLog schema with entityType, entityId, action, oldValues, newValues |
| 9. Daily backups configured and restore tested | PARTIAL | Deployment docs describe backup procedures (docs/deployment/). No automated backup verification script. Restore test NOT YET PERFORMED. |
| 10. Core mobile web screens usable on phone sizes | PASS | Next.js responsive design with Tailwind CSS. All dashboard pages use responsive classes (max-w-* containers, grid layouts). Login, dashboard, transactions, customers, invoices, reports all designed for mobile-first. |
| 11. System failures show recoverable message | PASS | GlobalExceptionFilter returns { success, message, error: { code }, requestId } for all errors. Error boundaries in frontend (error.tsx, not-found.tsx, loading.tsx). AI provider failure -> fallback extraction. Speech failure -> user notification. |

## Detailed Evidence Per Criterion

### Criterion 1: WhatsApp expense/income message -> correct structured proposal

- **Webhook receipt:** `whatsapp-webhook.service.ts` receives incoming WhatsApp messages, validates signatures, and routes to AI processing.
- **AI extraction:** `ai-extraction.service.ts` parses natural language messages into structured financial proposals with amount, date, category, and type.
- **Proposal persistence:** `ai-proposal.service.ts` creates AiProposal documents with PENDING status for user confirmation.
- **Security coverage:** `ai-safety.spec.ts` tests verify that extraction produces valid proposals and that prompt injection attempts are blocked.

### Criterion 2: No AI-derived financial record saved without confirmation

- **State machine:** AiProposal schema enforces PENDING -> CONFIRMED transition via `confirmProposal()` method which validates current status before allowing state change.
- **Guard on mutation:** No endpoint directly inserts Transaction documents from AI extraction output; all paths flow through the proposal confirmation step.
- **Security test:** `ai-safety.spec.ts` "should not allow direct transaction creation without confirmation" explicitly verifies this constraint.

### Criterion 3: Webhook retries do not duplicate financial records

- **Unique index:** `message-event.schema.ts` defines a unique index on `providerMessageId` preventing duplicate inserts at the database level.
- **Application deduplication:** Webhook service checks for existing message-event documents before processing, returning early on duplicates.
- **Concurrency handling:** `webhook-idempotency.spec.ts` tests concurrent webhook delivery to ensure no duplicate proposals are created.

### Criterion 4: Users can correct misunderstood amount/date/category

- **Correction processing:** `processCorrection()` in `ai-extraction.service.ts` accepts user corrections and updates the existing proposal rather than creating a new one.
- **Revision history:** Each proposal tracks `revisionHistory` array with previous values, enabling audit of what changed and when.
- **Security test:** `ai-safety.spec.ts` "correction should update same proposal" verifies that corrections modify the existing proposal and increment the revision counter.

### Criterion 5: Dashboard totals reconcile with stored transactions

- **Server-side aggregation:** `transactions.controller.ts` `/summary` endpoint uses MongoDB aggregation pipeline to compute totals from confirmed transactions filtered by businessId.
- **Display formatting:** Report services use `fromMinorUnits()` to convert stored minor-unit amounts for display, ensuring consistency with stored values.
- **Scope limitation:** Dashboard aggregates from confirmed transactions only, excluding pending proposals from totals.

### Criterion 6: Invoice totals and payment status deterministic

- **Payment lifecycle:** `payment-lifecycle.spec.ts` tests cover draft creation, issuing, partial payment, full payment, and void restoration with deterministic outcomes.
- **Overpayment protection:** Tests verify that payments exceeding invoice outstanding balance are rejected.
- **Financial calculations:** `financial-calculations.spec.ts` validates invoice line totals, outstanding balance computation, and aging calculations.

### Criterion 7: Cannot access another business's data

- **Access guard:** `BusinessAccessGuard` validates that the authenticated user is a member of the requested business before allowing any data access.
- **Query scoping:** All database queries include `businessId` filter to prevent cross-tenant data leakage.
- **Category/customer ownership:** `tenant-isolation.spec.ts` tests verify that categories and customers are scoped to their creating business.

### Criterion 8: Critical edits appear in audit log

- **Audit logging:** `AuditService.log()` is called on proposal confirm, reject, and edit operations, as well as WhatsApp connection and pairing actions.
- **Log schema:** AuditLog documents capture `entityType`, `entityId`, `action`, `oldValues`, and `newValues` for each auditable operation.
- **Coverage:** Both financial mutations and authentication-related actions are logged.

### Criterion 9: Daily backups configured and restore tested

- **Deployment docs:** `docs/deployment/` describes backup procedures for MongoDB.
- **Gap identified:** No automated backup verification script exists. Restore test has NOT YET PERFORMED.
- **Recommendation:** Implement automated backup verification and conduct restore test before production launch.

### Criterion 10: Core mobile web screens usable on phone sizes

- **Responsive framework:** Next.js with Tailwind CSS provides mobile-first responsive design across all pages.
- **Layout patterns:** All dashboard pages use responsive containers (`max-w-*`), grid layouts, and flexible spacing that adapts to phone screen sizes.
- **Screen coverage:** Login, dashboard, transactions, customers, invoices, and reports are all designed with mobile viewport constraints in mind.

### Criterion 11: System failures show recoverable message

- **Backend error handling:** `GlobalExceptionFilter` returns structured error responses with `{ success, message, error: { code }, requestId }` for all unhandled exceptions.
- **Frontend error boundaries:** `error.tsx`, `not-found.tsx`, and `loading.tsx` components provide graceful degradation at the page level.
- **AI fallback:** When the primary AI provider fails, the system falls back to alternative extraction methods rather than failing silently.
- **Speech failure handling:** Voice input failures trigger user-facing notification messages rather than leaving the user without feedback.
