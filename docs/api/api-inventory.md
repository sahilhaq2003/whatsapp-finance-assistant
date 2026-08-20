# Dulan Progiciel — API Endpoint Inventory

> **Generated from NestJS controllers.** All paths are prefixed with `/api` via the global `globalPrefix` configuration.

---

## Summary

| Module | Endpoints |
|---|---|
| Authentication | 6 |
| Users | 2 |
| Businesses | 4 |
| Categories | 5 |
| Transactions | 7 |
| Customers | 10 |
| Invoices | 9 |
| Payments | 3 |
| WhatsApp | 7 |
| AI Proposals & Queries | 6 |
| Reports | 12 |
| Reminders | 8 |
| Summaries | 7 |
| Beta | 8 |
| Entitlements | 3 |
| Usage | 1 |
| Product Analytics | 1 |
| Feedback | 4 |
| Data Requests | 5 |
| Operations | 3 |
| Health | 3 |
| **Total** | **111** |

---

## Legend

| Column | Meaning |
|---|---|
| **Method** | HTTP method |
| **Path** | Full API path |
| **Purpose** | Short description of what the endpoint does |
| **Auth** | `None` / `JWT` — whether a Bearer token is required |
| **Business** | Whether the request must be scoped to a business (`x-business-id` header or equivalent) |
| **Role** | Platform role required beyond the default authenticated user (`OWNER`, `ADMIN`, `SUPPORT`, `ADMIN/SUPPORT`) |

---

## Authentication

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/auth/register` | Register a new user account | None | No | — |
| 2 | POST | `/api/auth/login` | Authenticate and receive JWT tokens | None | No | — |
| 3 | POST | `/api/auth/refresh` | Refresh an expired access token | None | No | — |
| 4 | POST | `/api/auth/logout` | Invalidate current session token | JWT | No | — |
| 5 | POST | `/api/auth/logout-all` | Invalidate all active sessions | JWT | No | — |
| 6 | GET | `/api/auth/me` | Return the current authenticated user | JWT | No | — |

---

## Users

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/users` | Create a new user (admin/seed operation) | JWT | No | — |
| 2 | GET | `/api/users/:id` | Find a user by ID | JWT | No | — |

---

## Businesses

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/businesses` | Create a new business | JWT | No | — |
| 2 | GET | `/api/businesses/my` | List all businesses the user belongs to | JWT | No | — |
| 3 | GET | `/api/businesses/:id` | Get a specific business by ID | JWT | Yes | — |
| 4 | GET | `/api/businesses/:id/members` | List members of a business | JWT | Yes | — |

---

## Categories

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/categories` | List all categories for the business | JWT | Yes | — |
| 2 | POST | `/api/categories` | Create a new category | JWT | Yes | — |
| 3 | GET | `/api/categories/:id` | Get a category by ID | JWT | Yes | — |
| 4 | PATCH | `/api/categories/:id` | Update a category | JWT | Yes | — |
| 5 | DELETE | `/api/categories/:id` | Delete a category | JWT | Yes | — |

---

## Transactions

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/transactions` | Create a new transaction | JWT | Yes | — |
| 2 | GET | `/api/transactions` | List transactions (with filters/pagination) | JWT | Yes | — |
| 3 | GET | `/api/transactions/summary` | Get transaction summary totals | JWT | Yes | — |
| 4 | GET | `/api/transactions/summary/categories` | Get summary broken down by category | JWT | Yes | — |
| 5 | GET | `/api/transactions/:id` | Get a transaction by ID | JWT | Yes | — |
| 6 | PATCH | `/api/transactions/:id` | Update a transaction | JWT | Yes | — |
| 7 | DELETE | `/api/transactions/:id` | Delete a transaction | JWT | Yes | — |

---

## Customers

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/customers` | Create a new customer | JWT | Yes | — |
| 2 | GET | `/api/customers` | List customers (with filters/pagination) | JWT | Yes | — |
| 3 | GET | `/api/customers/:id` | Get a customer by ID | JWT | Yes | — |
| 4 | PATCH | `/api/customers/:id` | Update a customer | JWT | Yes | — |
| 5 | DELETE | `/api/customers/:id` | Soft-delete a customer | JWT | Yes | — |
| 6 | PATCH | `/api/customers/:id/restore` | Restore a soft-deleted customer | JWT | Yes | — |
| 7 | GET | `/api/customers/:id/transactions` | List transactions for a customer | JWT | Yes | — |
| 8 | GET | `/api/customers/:id/summary` | Get financial summary for a customer | JWT | Yes | — |
| 9 | GET | `/api/customers/:id/invoices` | List invoices for a customer | JWT | Yes | — |
| 10 | GET | `/api/customers/:id/payments` | List payments for a customer | JWT | Yes | — |

---

## Invoices

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/invoices` | Create a new invoice | JWT | Yes | — |
| 2 | GET | `/api/invoices/summary/outstanding` | Get outstanding invoices summary | JWT | Yes | — |
| 3 | GET | `/api/invoices` | List invoices (with filters/pagination) | JWT | Yes | — |
| 4 | GET | `/api/invoices/:id` | Get an invoice by ID | JWT | Yes | — |
| 5 | PATCH | `/api/invoices/:id` | Update an invoice (draft only) | JWT | Yes | — |
| 6 | POST | `/api/invoices/:id/issue` | Issue a draft invoice | JWT | Yes | — |
| 7 | POST | `/api/invoices/:id/void` | Void an issued invoice | JWT | Yes | — |
| 8 | GET | `/api/invoices/:id/pdf` | Generate/download invoice PDF | JWT | Yes | — |
| 9 | GET | `/api/invoices/:id/payments` | List payments applied to an invoice | JWT | Yes | — |

---

## Payments

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/payments` | Record a new payment | JWT | Yes | — |
| 2 | GET | `/api/payments` | List payments (with filters/pagination) | JWT | Yes | — |
| 3 | POST | `/api/payments/:id/void` | Void a payment | JWT | Yes | — |

---

## WhatsApp

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/whatsapp/webhook` | Meta webhook verification (hub.challenge) | None | No | — |
| 2 | POST | `/api/whatsapp/webhook` | Receive inbound Meta webhook events | None | No | — |
| 3 | GET | `/api/whatsapp/connection` | Get WhatsApp connection status | JWT | Yes | — |
| 4 | POST | `/api/whatsapp/connection` | Create or update WhatsApp connection | JWT | Yes | OWNER/ADMIN |
| 5 | DELETE | `/api/whatsapp/connection` | Disconnect and remove WhatsApp connection | JWT | Yes | OWNER/ADMIN |
| 6 | POST | `/api/whatsapp/pairing-code` | Generate a phone pairing code | JWT | Yes | OWNER/ADMIN |
| 7 | POST | `/api/whatsapp/test-message` | Send a test message via WhatsApp | JWT | Yes | OWNER/ADMIN |

---

## AI Proposals & Queries

> **Note:** The AI controller is decorated with `@Controller('api/ai')`. Combined with the global prefix `/api`, the resulting paths contain a double prefix: `/api/api/ai/...`. This is a known quirk of the current codebase.

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/api/ai/business-query` | Submit a natural-language business query | JWT | Yes | — |
| 2 | GET | `/api/api/ai/proposals` | List AI-generated proposals | JWT | Yes | — |
| 3 | GET | `/api/api/ai/proposals/:proposalId` | Get a specific proposal by ID | JWT | Yes | — |
| 4 | POST | `/api/api/ai/proposals/:proposalId/confirm` | Confirm and apply a proposal | JWT | Yes | — |
| 5 | POST | `/api/api/ai/proposals/:proposalId/reject` | Reject a proposal | JWT | Yes | — |
| 6 | PATCH | `/api/api/ai/proposals/:proposalId` | Update a proposal (e.g. edit amount) | JWT | Yes | — |

---

## Reports

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/reports/overview` | Get high-level business overview | JWT | Yes | — |
| 2 | GET | `/api/reports/income` | Get income report | JWT | Yes | — |
| 3 | GET | `/api/reports/expenses` | Get expenses report | JWT | Yes | — |
| 4 | GET | `/api/reports/income-vs-expenses` | Get income vs expenses comparison | JWT | Yes | — |
| 5 | GET | `/api/reports/categories` | Get report by category | JWT | Yes | — |
| 6 | GET | `/api/reports/transactions` | Get detailed transaction report | JWT | Yes | — |
| 7 | GET | `/api/reports/customers` | Get customer report (all customers) | JWT | Yes | — |
| 8 | GET | `/api/reports/customers/:customerId` | Get report for a specific customer | JWT | Yes | — |
| 9 | GET | `/api/reports/invoices/outstanding` | Get outstanding invoices report | JWT | Yes | — |
| 10 | GET | `/api/reports/invoices/overdue` | Get overdue invoices report | JWT | Yes | — |
| 11 | GET | `/api/reports/payments` | Get payments report | JWT | Yes | — |
| 12 | POST | `/api/reports/export` | Export report data (CSV/PDF) | JWT | Yes | — |

---

## Reminders

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/reminders` | List reminders for the business | JWT | Yes | — |
| 2 | GET | `/api/reminders/stats` | Get reminder statistics | JWT | Yes | — |
| 3 | GET | `/api/reminders/rules` | List reminder rules | JWT | Yes | — |
| 4 | PATCH | `/api/reminders/rules/:ruleId` | Update a reminder rule | JWT | Yes | — |
| 5 | POST | `/api/reminders/scan` | Trigger a scan for reminders to send | JWT | Yes | — |
| 6 | POST | `/api/reminders/invoice/:invoiceId/send` | Manually send a reminder for an invoice | JWT | Yes | — |
| 7 | POST | `/api/reminders/invoice/:invoiceId/cancel` | Cancel a pending reminder | JWT | Yes | — |
| 8 | GET | `/api/reminders/invoice/:invoiceId` | Get reminders for a specific invoice | JWT | Yes | — |

---

## Summaries

All endpoints require **JWT + Business** scope.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/summaries/preferences` | Get summary preferences for the business | JWT | Yes | — |
| 2 | PUT | `/api/summaries/preferences` | Update summary preferences | JWT | Yes | — |
| 3 | GET | `/api/summaries` | List generated summaries | JWT | Yes | — |
| 4 | GET | `/api/summaries/:id` | Get a specific summary | JWT | Yes | — |
| 5 | POST | `/api/summaries/preview` | Preview a summary before generating | JWT | Yes | — |
| 6 | POST | `/api/summaries/generate` | Generate a new summary | JWT | Yes | — |
| 7 | POST | `/api/summaries/:id/send` | Send a summary (e.g. via WhatsApp) | JWT | Yes | — |

---

## Beta

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/beta/invites` | Create a beta invite | JWT | Yes | — |
| 2 | GET | `/api/beta/invites` | List beta invites | JWT | Yes | — |
| 3 | PATCH | `/api/beta/invites/:id/revoke` | Revoke a beta invite | JWT | Yes | — |
| 4 | POST | `/api/beta/enrollments` | Enroll a business in beta | JWT | Yes | — |
| 5 | GET | `/api/beta/enrollments` | List beta enrollments | JWT | Yes | — |
| 6 | GET | `/api/beta/enrollments/:businessId` | Get enrollment for a specific business | JWT | Yes | — |
| 7 | PATCH | `/api/beta/enrollments/:businessId` | Update enrollment status | JWT | Yes | — |
| 8 | POST | `/api/beta/check` | Check current user's beta status | JWT | No | — |

---

## Entitlements

All endpoints require **JWT** authentication.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/entitlements` | Get current user's entitlements | JWT | No | — |
| 2 | POST | `/api/entitlements/plans` | Create a new entitlement plan | JWT | No | — |
| 3 | GET | `/api/entitlements/plans` | List available entitlement plans | JWT | No | — |

---

## Usage

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/usage` | Get usage metrics for the current business | JWT | Yes | — |

---

## Product Analytics

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/product-analytics/beta-metrics` | Get beta program metrics dashboard | JWT | No | ADMIN/SUPPORT |

---

## Feedback

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/feedback` | Submit user feedback | JWT | Yes | — |
| 2 | GET | `/api/ops/feedback` | List all feedback entries (ops) | JWT | No | ADMIN/SUPPORT |
| 3 | GET | `/api/ops/feedback/stats` | Get feedback statistics | JWT | No | ADMIN/SUPPORT |
| 4 | PATCH | `/api/ops/feedback/:id` | Update feedback status/note | JWT | No | ADMIN/SUPPORT |

---

## Data Requests

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | POST | `/api/data-requests/export` | Request a data export | JWT | Yes | — |
| 2 | POST | `/api/data-requests/deletion` | Request data deletion (GDPR) | JWT | Yes | — |
| 3 | GET | `/api/data-requests` | List own data requests | JWT | Yes | — |
| 4 | GET | `/api/ops/data-requests` | List all data requests (ops) | JWT | No | ADMIN/SUPPORT |
| 5 | PATCH | `/api/ops/data-requests/:id` | Process a data request | JWT | No | ADMIN/SUPPORT |

---

## Operations

All endpoints require **JWT + ADMIN/SUPPORT** role.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/ops/dashboard` | Get ops dashboard overview | JWT | No | ADMIN/SUPPORT |
| 2 | GET | `/api/ops/beta/businesses` | List all beta businesses | JWT | No | ADMIN/SUPPORT |
| 3 | GET | `/api/ops/beta/businesses/:businessId/health` | Get health metrics for a beta business | JWT | No | ADMIN/SUPPORT |

---

## Health

All endpoints are **public** — no authentication required.

| # | Method | Path | Purpose | Auth | Business | Role |
|---|--------|------|---------|------|----------|------|
| 1 | GET | `/api/health` | General health check | None | No | — |
| 2 | GET | `/api/health/live` | Liveness probe (is the process alive) | None | No | — |
| 3 | GET | `/api/health/ready` | Readiness probe (are dependencies reachable) | None | No | — |
