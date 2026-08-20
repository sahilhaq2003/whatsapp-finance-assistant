# Implemented vs Postponed Features

**Project:** Dulan Progiciel - WhatsApp-First Business Finance Assistant
**Document Version:** 1.0
**Date:** August 2026

---

## MVP Implemented

Features built and validated for the controlled beta release.

| # | Feature | Evidence |
|---|---------|----------|
| 1 | User registration / authentication | `POST /api/auth/register`, JWT cookies, login form, `auth.service.ts` |
| 2 | Business onboarding and profile | `POST /api/businesses`, `OnboardingPage.tsx`, LKR default, Asia/Colombo timezone |
| 3 | WhatsApp text message processing | Meta Cloud API v21.0 adapter, webhook GET/POST, HMAC-SHA256 signature verification |
| 4 | AI financial extraction | `ai-extraction.service.ts` using GPT-4o-mini structured output |
| 5 | AI proposal confirmation workflow | `ai-proposal.service.ts`, PENDING -> CONFIRMED/REJECTED state machine |
| 6 | Manual transaction entry | `transactions.controller.ts`, dashboard transaction form |
| 7 | Transaction edit / void | PATCH update, DELETE with void reason (soft delete via `TransactionStatus.VOIDED`) |
| 8 | Categories (income/expense, system/custom) | `categories.controller.ts`, `CategorySchema`, system seed data, business-scoped |
| 9 | Customers (CRUD, archive/restore, transaction history) | `customers.controller.ts` (10 endpoints), archive/restore workflow |
| 10 | Simple invoicing (draft/issue/void) | `invoices.controller.ts` (9 endpoints), DRAFT -> ISSUED state machine |
| 11 | Invoice PDF generation | PDF generation endpoint with authenticated download |
| 12 | Payments (record, void) | Payment recording against invoices, void capability |
| 13 | Payment status tracking | UNPAID / PARTIAL / PAID status enum on invoices |
| 14 | Outstanding balances | Cross-invoice outstanding calculation and display |
| 15 | Dashboard with period totals | `/dashboard/page.tsx`, transaction summary endpoint, period-based totals |
| 16 | Basic reports (8 report types) | Overview, income-vs-expenses, categories, outstanding, income, expense, customer, payment |
| 17 | CSV / PDF export | Export endpoints for all report types |
| 18 | Audit logging | `audit_logs` collection, `audit.service.ts`, financial mutation and security event logging |
| 19 | Feature entitlements (plans, quotas) | `plan_definitions` collection, `PlanDefinition.features`, `PlanDefinition.limits` |
| 20 | Usage metering | `usage_counters` collection, quota enforcement |
| 21 | Beta invite / enrollment system | Beta invite codes, enrollment workflow |
| 22 | Data export / deletion requests | `data_requests` collection, pending_review workflow |
| 23 | Operations dashboard | `ops.controller.ts`, business list, feedback management |

---

## Beyond-MVP Implemented

Features built that were not required by the original MVP brief but add significant value.

| # | Feature | Evidence |
|---|---------|----------|
| 1 | Voice note processing | Whisper-1 transcription, `speech.service.ts`, audio message handler |
| 2 | Automated invoice reminders | BullMQ scheduled jobs, `reminder.service.ts`, configurable reminder rules |
| 3 | Scheduled financial summaries | Daily and weekly summary messages via WhatsApp |
| 4 | Advanced business questions (13 query types) | `BusinessQueryService`, database-grounded queries with confirmed data only |
| 5 | WhatsApp sender authorization / pairing | `WhatsAppAuthorizedSender` model, pairing flow |
| 6 | Product analytics | WhatsApp analytics, retention metrics, AI quality tracking |
| 7 | Feedback system | In-app feedback collection, ops dashboard feedback view |
| 8 | Platform role-based access | `PlatformRoleGuard` for ADMIN / SUPPORT roles |

---

## Partially Implemented

Features with partial coverage; functional but with known gaps.

| # | Feature | What's Done | What's Missing |
|---|---------|-------------|----------------|
| 1 | Backup / Restore | Documented backup procedures in runbooks, MongoDB Atlas configuration | Restore procedure not tested end-to-end |
| 2 | Monitoring | Health endpoints (`/live`, `/ready`), basic health service | No APM, no distributed tracing, no metrics dashboard, no alerting |
| 3 | Multilingual support | Architecture ready (`preferredLanguage` field, i18n structure) | English only; Sinhala/Tamil not production validated |

---

## Intentionally Postponed

Features explicitly excluded from MVP scope. These will be evaluated for future phases.

| # | Feature | Rationale for Postponement |
|---|---------|---------------------------|
| 1 | Bank account integration | Requires banking API partnerships and regulatory compliance |
| 2 | Full double-entry accounting / general ledger | MVP uses simplified income/expense tracking model |
| 3 | Inventory management | Not in MVP brief; product/service tracking deferred |
| 4 | Tax filing engine | Sri Lankan tax regulatory complexity; requires legal review |
| 5 | Advanced multi-currency accounting | FX conversion, multi-currency reporting deferred to post-MVP |
| 6 | Native iOS application | Mobile web sufficient for controlled beta |
| 7 | Native Android application | Mobile web sufficient for controlled beta |
| 8 | Fully autonomous AI actions | By design: all financial writes require explicit user confirmation |
| 9 | Large enterprise permissions (RBAC beyond OWNER/ADMIN/MEMBER) | Target market is small businesses; simple roles sufficient |
| 10 | Order management | Phase 2 feature, not in MVP brief |
| 11 | Team / accountant workflow | Deferred to post-MVP; single-user beta model |
| 12 | Full Sinhala / Tamil language support | Architecture ready but language models not production validated |
| 13 | Global country configuration | MVP defaults to Sri Lanka; multi-country deferred |
| 14 | Advanced AI insights / forecasting | Predictive analytics deferred to post-MVP |
