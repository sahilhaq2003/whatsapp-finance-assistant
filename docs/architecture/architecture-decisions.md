# Architecture Decisions

Key architectural decisions made during Dulan Progiciel development, with context, rationale, and trade-offs.

---

## 1. MongoDB over PostgreSQL

### Context

Dulan Progiciel is a multi-tenant SaaS for Sri Lankan SMEs. Data access patterns are predominantly document-oriented: WhatsApp message events with nested metadata, AI proposals with embedded parsed data, invoices with customer snapshots, and financial summaries with embedded category breakdowns. Most queries are business-scoped lookups, aggregations, and time-range scans rather than complex joins.

### Decision

Use MongoDB as the primary database via NestJS Mongoose ODM.

### Rationale

- **Document model fits domain**: Financial records naturally embed related data (invoice → customer snapshot, proposal → parsed data, summary → category breakdowns). MongoDB's embedded documents avoid expensive joins for read-heavy paths.
- **Rapid iteration**: Schema flexibility accelerates development during the early product phase. Adding fields to `message_events.metadata` or `ai_proposals.parsedData` doesn't require migrations.
- **Aggregation pipeline**: MongoDB's `$group`, `$match`, `$lookup` pipeline handles business query analytics (expense totals, category breakdowns, outstanding amounts) effectively.
- **Compound indexes**: Unique compound indexes like `{businessId, invoiceNumber}`, `{businessId, name, type}` for categories, and `{businessId, trigger}` for reminder rules provide the same data integrity as SQL unique constraints.
- **TTL indexes**: `auth_sessions.expiresAt`, `ai_proposals.expiresAt`, and `whatsapp_pairing_codes.expiresAt` use MongoDB's native TTL for automatic expiry — simpler than cron-based cleanup.

### Trade-offs

- **No JOINs**: Relationships (e.g., transaction → category → business) require multiple queries or `$lookup`. Mitigated by consistent `businessId` scoping and targeted indexes.
- **No ACID transactions across documents**: Multi-document updates (e.g., invoice issue + audit log) are not atomic. Mitigated by idempotent operations and audit logging.
- **Data consistency**: Application-level enforcement of referential integrity (e.g., `BusinessAccessGuard` validates membership exists). No foreign key constraints at the database level.

---

## 2. HTTP-only Cookies for Auth (over localStorage Tokens)

### Context

The frontend is a Next.js SPA that communicates with the NestJS API. Authentication uses JWT tokens. The team needed to decide where to store tokens: HTTP-only cookies or localStorage.

### Decision

Store JWT access and refresh tokens in HTTP-only cookies (`dp_access_token` and `dp_refresh_token`).

### Rationale

- **XSS protection**: HTTP-only cookies cannot be accessed by JavaScript, preventing token theft via XSS attacks. This is critical for a financial application handling business data.
- **Automatic cookie handling**: The browser automatically sends cookies with requests — no need for manual `Authorization` header management on the client.
- **Secure flag**: Cookies are set with `Secure` flag in production, ensuring they're only sent over HTTPS.
- **SameSite=Lax**: Prevents CSRF attacks while allowing normal navigation flows.
- **Refresh rotation**: The refresh token is rotated on every `/api/auth/refresh` call, limiting the window of token reuse.

### Trade-offs

- **No JavaScript access**: The frontend cannot read the token to inspect claims or expiry. Mitigated by the `/api/auth/me` endpoint that returns the current user profile.
- **Cookie size limits**: JWT tokens must fit within cookie size limits (~4KB). Current tokens are well within this limit.
- **CSRF consideration**: HTTP-only cookies are vulnerable to CSRF. Mitigated by `SameSite=Lax` and requiring `X-Business-Id` header for business-scoped requests (custom headers can't be sent cross-origin via simple forms).
- **Mobile/browser nuance**: Some mobile browsers handle cookies differently. Testing needed for WhatsApp in-app browser.

---

## 3. Soft Void over Hard Delete for Financial Records

### Context

Financial records (transactions, invoices, payments) must maintain a complete audit trail for accounting and compliance. The system needed to handle user mistakes (wrong amount, duplicate entry) without losing historical data.

### Decision

Use soft void: financial records are never hard-deleted. Instead, they receive a `VOIDED` status with `voidedAt`, `voidedByUserId`, and `voidReason` fields.

### Rationale

- **Audit trail**: All financial mutations are logged in `audit_logs` with `oldValues`/`newValues`. Soft-voiding preserves the original record while marking it as inactive.
- **Reporting accuracy**: Reports filter by `status: CONFIRMED` to exclude voided records, but voided records remain queryable for reconciliation.
- **Reversibility**: Voided records can be unvoided if needed (status change back to CONFIRMED) without data reconstruction.
- **Compliance**: Financial regulations typically require retention of all records, including corrections. Hard deletion would violate this.
- **Consistent pattern**: Applied uniformly across `transactions`, `invoices`, and `payments` — all three use the same void pattern.

### Trade-offs

- **Storage growth**: Voided records consume storage. Mitigated by filtering voided records from default queries and dashboards.
- **Query complexity**: All queries must include `status: { $ne: 'VOIDED' }` or explicitly handle voided records. Mitigated by default `CONFIRMED` status on creation.
- **No true deletion**: Users cannot permanently remove erroneous data. This is by design for financial integrity.

---

## 4. Embedded Snapshots in Invoices (customerSnapshot)

### Context

Invoices reference a `customer` but customer data can change over time (name change, address update, phone change). An invoice issued to "ABC Trading" should always show "ABC Trading" even if the customer later renames to "ABC Trading LLC".

### Decision

Embed a `customerSnapshot` (InvoiceCustomerSnapshot) in the invoice document at issue time, containing `name`, `phone`, `email`, and `address`.

### Rationale

- **Point-in-time accuracy**: The invoice reflects the customer data as it was when issued, not the current state. This is standard accounting practice.
- **Invoice immutability**: Once issued, the invoice's visual representation (PDF) should never change. The embedded snapshot ensures the PDF always matches the stored data.
- **No JOIN dependency**: Reports and queries can display customer information directly from the invoice without looking up the customer record.
- **PDF generation**: The PDF generator reads from the invoice document alone, avoiding async customer lookups during generation.

### Trade-offs

- **Data duplication**: Customer data is stored twice (in `customers` and in `invoices.customerSnapshot`). Changes to the customer record don't retroactively update issued invoices.
- **Update burden**: If a customer's name is corrected, all historical invoices retain the old name. This is intentional for financial records but may confuse users.
- **Schema complexity**: The `InvoiceCustomerSnapshot` sub-schema must be maintained alongside the `Customer` schema.

---

## 5. AI Proposal Pattern (Propose-then-Confirm) over Direct Extraction

### Context

When a user sends a WhatsApp message like "Spent 2500 on delivery yesterday", the AI extracts structured data. The question was: should the system create the transaction directly, or present a proposal for user confirmation?

### Decision

Use a propose-then-confirm pattern: the AI creates an `AiProposal` document with extracted data and a confirmation prompt. The user must reply CONFIRM/EDIT/CANCEL before a transaction is created.

### Rationale

- **User trust**: Financial data must be accurate. Allowing AI to create transactions without confirmation would erode trust if the AI makes mistakes (e.g., misclassifying "15000 for rent" as expense instead of income).
- **Correction flow**: The EDIT flow allows users to correct specific fields (amount, category, date) without re-sending the entire message. Corrections are tracked in `revisionHistory`.
- **Confidence gating**: Low-confidence extractions trigger `NEEDS_CLARIFICATION` status with a specific question, rather than creating a potentially wrong transaction.
- **Expiry**: Proposals auto-expire via TTL index (`expiresAt`), preventing stale pending proposals from accumulating.
- **Audit trail**: Each proposal is linked to the original `messageEvent` and tracks the full extraction → confirmation → transaction lifecycle.

### Trade-offs

- **Extra step**: Users must confirm every transaction, adding friction for routine entries. Mitigated by quick CONFIRM replies and high-confidence proposals.
- **State management**: The system must track active proposals per user and handle concurrent flows. Mitigated by `findActiveProposal()` check before new extractions.
- **Voice note limitation**: Users cannot confirm proposals via voice (must send text correction while proposal is active). This is explicitly handled with a "send correction as text" reply.

---

## 6. OpenAI as External AI Provider (over Self-Hosted)

### Context

The AI pipeline requires: (1) financial intent extraction from natural language, (2) business query classification, (3) business query answering via MongoDB aggregation, and (4) voice-to-text transcription. The team needed to decide between self-hosted models and external API providers.

### Decision

Use OpenAI APIs (GPT-4o-mini for text, Whisper-1 for voice) as the external AI provider.

### Rationale

- **Time to market**: OpenAI APIs require zero infrastructure. No GPU servers, no model deployment, no fine-tuning pipeline. Critical for MVP.
- **Quality**: GPT-4o-mini provides strong structured extraction with JSON output format, which is essential for the `FinancialExtractionResult` schema. Self-hosted alternatives would require fine-tuning to match this quality.
- **Structured output**: OpenAI's `response_format: { type: 'json_object' }` ensures reliable JSON extraction, reducing parsing errors in the extraction pipeline.
- **Whisper-1**: Industry-leading speech-to-text for multiple languages (Sinhala, Tamil, English — relevant for Sri Lankan users).
- **Fallback pattern**: The system has a rule-based fallback extraction (`llm-provider.service.ts:201-280`) when `AI_API_KEY` is not configured, providing basic functionality without OpenAI.

### Trade-offs

- **Cost**: Per-token pricing scales with message volume. Mitigated by GPT-4o-mini (cheapest OpenAI model) and timeout limits (15s default).
- **Latency**: API calls add 1-5s latency to message processing. Mitigated by async processing and "Processing..." status messages.
- **Dependency**: OpenAI API downtime affects AI features. Mitigated by fallback extraction and graceful degradation.
- **Data privacy**: Business financial data is sent to OpenAI's API. Mitigated by system prompts that restrict the model to extraction only (no data storage, no training on inputs).
- **Rate limits**: OpenAI has per-API-key rate limits. Mitigated by `ThrottlerModule` on the NestJS side.

---

## 7. Separate Worker Process for Scheduled Tasks

### Context

The system needs to: (1) scan for due invoices and create reminders, (2) process pending reminders and send WhatsApp messages, (3) generate and send financial summaries on schedule. These tasks need cron-like scheduling and must not block the API server.

### Decision

Run a separate NestJS application context (`worker.ts`) as an independent process, using `ScheduleModule` for cron scheduling and BullMQ for job queuing.

### Rationale

- **Process isolation**: Scheduled tasks and job processing don't consume API server resources or block request handling. A slow reminder batch doesn't affect dashboard response times.
- **Independent scaling**: The worker can be scaled independently (e.g., multiple workers for high reminder volumes) without scaling the API.
- **Graceful degradation**: If the worker crashes, the API continues serving requests. The worker can be restarted independently.
- **BullMQ durability**: Jobs persisted in Redis survive worker restarts. Failed jobs can be retried with configurable backoff.
- **Shared modules**: The worker imports the same Mongoose models and business logic as the API, ensuring consistency without code duplication.

### Trade-offs

- **Operational complexity**: Two processes to deploy, monitor, and manage instead of one. Mitigated by Docker Compose and shared configuration.
- **Redis dependency**: BullMQ requires Redis, adding infrastructure. Redis is also needed for rate limiting and session caching, so this is not additional overhead.
- **Cross-process communication**: The API and worker share the same MongoDB and Redis, but don't communicate directly. State changes (e.g., creating a reminder) are visible to the worker via database polling.
- **Startup latency**: The worker has a cold-start period where it initializes NestJS context. Mitigated by lazy initialization in BullMQ processors (`invoice-reminder.worker.ts:16-41`).

---

## 8. Local File Storage (over S3 for MVP)

### Context

The system generates invoice PDFs, exports report files, and temporarily stores voice recordings. The team needed to decide between cloud object storage (S3) and local filesystem for the MVP.

### Decision

Use local filesystem storage, with a `FilesModule` managing file I/O operations and a `pdfKey` reference in invoice documents.

### Rationale

- **Simplicity**: No S3 credentials, bucket policies, or CDN configuration needed. Files are written with `fs.writeFileSync()` and read with `fs.readFileSync()`.
- **Development speed**: Local storage works immediately in development without cloud setup. `npm run dev` is sufficient.
- **Voice temp files**: Audio downloads for transcription are temporary (deleted after processing). Local storage avoids unnecessary S3 uploads for ephemeral data.
- **MVP scope**: Invoice PDFs and report exports are low-volume. A single server's disk is sufficient for early-stage usage.
- **Invoice PDFs**: Generated on-demand and stored with a `pdfKey` path. The PDF is only served to the business that owns it.

### Trade-offs

- **No CDN**: Files are served directly from the API server, which doesn't scale for high-concurrency file downloads. Acceptable for MVP; S3 + CloudFront can be added later.
- **No redundancy**: Local disk has no replication. Server failure loses all generated files. Invoice PDFs can be regenerated from invoice data.
- **Backup complexity**: Filesystem backups must be managed separately from MongoDB backups.
- **Scaling bottleneck**: A single server limits concurrent file operations. The `FilesModule` abstraction allows swapping to S3 without changing business logic.
- **Migration path**: The `pdfKey` field stores a path string. Migrating to S3 would change the path format but not the interface. The `FilesModule` can be updated to use S3 SDK transparently.
