# Privacy & Data Handling

Audited: August 2026

## Customer Personal Data

| Attribute | Detail |
|---|---|
| Stored | name, phone, email, address (customers collection) |
| Scoped | businessId (tenant isolation) |
| Access | only authenticated business members |
| Deletion | archive workflow (soft-delete), not physical deletion |

## Financial Data

| Attribute | Detail |
|---|---|
| Stored | transactions, invoices, payments in minor units (cents/cents equivalent) |
| Scoped | businessId |
| Access | only authenticated business members |
| Deletion | void workflow (soft-void), not physical deletion |

## Voice Media

| Attribute | Detail |
|---|---|
| Storage | downloaded temporarily from Meta API, stored in temp directory with random suffix |
| Transcription | OpenAI Whisper-1 |
| Lifecycle | original audio deleted after transcription |
| Cleanup | cleanupStaleFiles removes files > 1 hour |
| Transcript | stored on MessageEvent (text field) |

## AI Provider Data Flow

### Data sent to OpenAI

- Message text (or voice transcript)
- Business categories
- Business timezone and currency
- Current date

### Data NOT sent to OpenAI

- Password hashes
- JWTs or refresh tokens
- WhatsApp access tokens
- MongoDB credentials
- Unrelated customer history
- Audit logs

### AI Response

Structured JSON containing: intent, confidence, transactions, clarificationQuestion.

## WhatsApp Data

| Attribute | Detail |
|---|---|
| Stored | providerMessageId, direction, text, delivery status |
| Business resolution | via phoneNumberId |
| Raw payloads | not stored (parsed and relevant fields extracted) |

## Logs

| Attribute | Detail |
|---|---|
| Exception logs | error message and code, no financial data |
| Request logs | requestId, no business data |
| PII in logs | none |

## Exports

| Attribute | Detail |
|---|---|
| Creation | POST request creates export file with configurable expiry |
| Scope | data across multiple collections for the requesting business |
| Storage | local files with expiry-based cleanup |

## Backups

| Attribute | Detail |
|---|---|
| Method | MongoDB Atlas automated backups (recommended) |
| Scope | all collections including PII |
| Restore | requires isolated environment |

## Data Deletion Requests

| Attribute | Detail |
|---|---|
| Endpoint | POST /api/data-requests/deletion |
| Confirmation | requires CONFIRM_DELETION confirmation string |
| Workflow | admin review (pending_review status) |
| Financial data | intentionally not auto-destructive |
| Audit data | intentionally not auto-destructive |
