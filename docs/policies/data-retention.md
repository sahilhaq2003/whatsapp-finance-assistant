# Data Retention Policy

This document defines how long each category of data is retained in the WhatsApp-First Business Finance Assistant system and how it is handled upon expiry.

---

## Retention Periods

| Data Category | Retention | Deletion Behaviour | Notes |
|---|---|---|---|
| **Transactions** | Indefinite | No automated deletion | Required for business and legal (tax/accounting) compliance. Manual deletion only by account owner. |
| **Invoices** | Indefinite | No automated deletion | Same legal basis as transactions. Invoice PDFs are retained as long as their parent invoice exists. |
| **Payments** | Indefinite | No automated deletion | Tied to transaction lifecycle. |
| **Customers** | Indefinite | No automated deletion | Referenced by transactions and invoices; cannot be removed without cascading. |
| **Audit Logs** | 7 years | Automated archival, then deletion after retention period | Required for regulatory and compliance purposes. Stored in append-only log. |
| **MessageEvents** | 90 days | Automated archival after 90 days; raw data deleted | Webhook-sourced WhatsApp message records. Archived copies may be retained in cold storage for dispute resolution. |
| **AI Proposals** | 30 days | Automated deletion of unconfirmed proposals | Confirmed proposals that were linked to a transaction or invoice are retained with the linked record. Unlinked, unconfirmed proposals are purged after 30 days. |
| **Temporary Voice Media** | Until processed | Deleted immediately after transcription completes | Voice messages are transcribed and the original media file is removed. No persistent store of raw audio. |
| **Invoice PDFs** | Lifetime of related invoice | Deleted when parent invoice is deleted | Generated on-demand or on confirmation. Stored alongside invoice metadata. |
| **Application Logs** | 30 days | Rotated and deleted | Operational logs (error, info, warn). Structured JSON logs shipped to log aggregation if configured. |
| **Backups** | Per backup policy | Rotated per schedule (typically 30-day window) | Encrypted at rest. Backup retention is managed by the infrastructure layer, not the application. |

---

## Design Principles

1. **Financial data is never automatically destroyed.** Transactions, invoices, payments, and their associated audit trails are retained indefinitely. Any deletion of financial data requires explicit action by the data owner and is logged.

2. **Audit logs are append-only and retained for 7 years.** They cannot be modified or soft-deleted by application users. Retention is enforced at the storage layer.

3. **Transient data has the shortest lifespan.** Voice media files are deleted as soon as transcription is complete. AI proposals that were never confirmed are removed after 30 days.

4. **MessageEvents are retained for operational use only.** Raw webhook payloads are kept for 90 days to support debugging and dispute resolution, then archived to cold storage.

5. **No automated destructive deletion of financial or audit data.** Scheduled jobs handle cleanup of transient and operational data only. Financial records and audit logs are exempt from automated purge routines.

---

## Data Export and Deletion Readiness

The system architecture supports data export and deletion operations:

- **Export**: User data can be exported in structured formats (JSON/CSV) for portability. Endpoints and tooling exist but are gated behind admin access and require controlled implementation for production use.
- **Deletion**: The data model supports soft-delete and hard-delete workflows. However, deletion of financial records is intentionally restricted and requires manual review to preserve referential integrity and legal compliance.
- **Implementation note**: While the schema and APIs are designed to support GDPR-style data subject requests (export, erasure), the actual execution of these operations is not yet fully automated in production. Each request should be handled through a controlled, audited process.

---

## Policy Review

This policy should be reviewed quarterly or whenever regulatory requirements change. Last reviewed: August 2026.
