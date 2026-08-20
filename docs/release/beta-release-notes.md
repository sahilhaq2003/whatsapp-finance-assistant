# Beta Release Notes

**Project:** Dulan Progiciel - WhatsApp-First Business Finance Assistant
**Release Name:** Dulan Progiciel MVP — Controlled Beta
**Release Date:** August 2026
**Target Audience:** 10–30 controlled Sri Lankan small business owners

---

## Core Features (MVP)

| Feature | Description |
|---------|-------------|
| Registration & Onboarding | Register an account and set up your business profile with currency, timezone, and business type |
| WhatsApp Expense/Income Recording | Send a text message describing a transaction and the AI creates a structured proposal for your confirmation |
| AI Financial Extraction | GPT-4o-mini extracts amount, type, category, date, and description from natural language |
| Proposal Confirmation | Review AI proposals before they become transactions. Reject or correct if needed |
| Manual Transaction Entry | Enter income and expenses directly via the dashboard |
| Transaction Management | Edit or void transactions with audit trail |
| Categories | Income and expense categories, with system defaults and custom categories per business |
| Customer Management | Create, edit, archive/restore customers with full transaction history |
| Simple Invoicing | Create invoices with line items, issue them, and track payment status |
| Invoice PDFs | Download invoices as PDF documents |
| Payment Tracking | Record payments against invoices, track partial and full payment status |
| Outstanding Balances | See who owes you money and how much is outstanding |
| Dashboard | Period-based totals for income, expenses, and net cash flow with recent activity |
| Reports | 8 report types: overview, income vs expenses, categories, outstanding, income, expense, customer, payment |
| Export | Download reports as CSV or PDF |
| Audit Logging | All financial mutations and critical actions are logged with actor, timestamp, and business scope |

---

## Beyond-MVP Beta Features

Features not required by the original brief but included to validate additional value.

| Feature | Description |
|---------|-------------|
| Voice Note Input | Record a WhatsApp voice note describing a transaction. Transcribed via Whisper-1 and processed as a text message |
| Automated Invoice Reminders | Configure reminder rules to send WhatsApp messages before invoice due dates |
| Scheduled Financial Summaries | Receive daily or weekly financial summaries via WhatsApp |
| AI Business Questions | Ask questions like "How much did I earn this month?" or "Who has not paid me?" via WhatsApp. Answers are grounded in your actual database records |
| Data Export & Deletion | Request a data export or account deletion via the dashboard |

---

## Security Controls

| Control | Implementation |
|---------|----------------|
| Authentication | JWT tokens stored in HTTP-only cookies |
| Business Isolation | All financial data scoped to business via tenant middleware |
| Webhook Verification | HMAC-SHA256 signature verification on WhatsApp webhooks |
| Rate Limiting | Global throttler guard on all API endpoints |
| Audit Logging | Financial mutations, auth events, and config changes logged |
| Security Headers | Helmet middleware for HTTP security headers |
| CORS | Explicit allowed origins configuration |
| Secret Management | `.env` files excluded from version control, `.env.example` provided |

---

## Responsible AI Controls

| Control | Description |
|---------|-------------|
| User Confirmation Required | All AI-generated financial records require explicit CONFIRM action before becoming transactions |
| No Direct Financial Writes | AI cannot directly create, modify, or delete financial records |
| Database-Grounded Queries | Business questions answered from actual database records, not AI inference |
| Low-Confidence Clarification | AI proposals with low confidence trigger a clarification question instead of a proposal |
| Prompt Injection Testing | Boundary tested in `ai-safety.spec.ts` to prevent data exfiltration via crafted inputs |
| Original Text Preserved | Every AI proposal retains the original user message for audit and correction |
| Correction Workflow | Users can correct proposals; revision history is maintained |

---

## Known Limitations

- **English only** — Sinhala and Tamil are not production-validated
- **Not a full accounting ledger** — No double-entry, no general ledger, no tax filing
- **No bank integration** — All data entry is manual or WhatsApp-based
- **Speech accuracy varies** — Depends on audio quality, accent, and background noise
- **AI accuracy requires validation** — Real-world business terminology may differ from training data
- **WhatsApp depends on Meta Cloud API** — External provider dependency
- **Scheduled features depend on Redis** — Worker process must be running for reminders and summaries
- **Basic PDF templates** — Invoice PDFs are functional but not custom-branded
- **No real-time notifications** — Dashboard uses polling, not WebSocket

---

## Support & Feedback

| Channel | Details |
|---------|---------|
| In-App Feedback | Submit feedback directly from the dashboard feedback form |
| Weekly Check-In | Beta coordinator conducts weekly calls with each participant |
| WhatsApp Support | Dedicated WhatsApp channel for beta support questions |

---

## Rollback Information

If a critical issue is discovered, the system can be rolled back:

| Component | Rollback Method |
|-----------|-----------------|
| Backend | Revert to previous Docker image tag |
| Frontend | Revert to previous Docker image tag |
| Database | MongoDB Atlas point-in-time recovery |

---

## How to Get Started

1. Receive beta invite link from coordinator
2. Register at `/register` with your invite code
3. Complete business onboarding (name, type, currency, timezone)
4. Connect your WhatsApp number (coordinator will assist)
5. Start recording transactions via WhatsApp or the dashboard
6. Explore reports and invoice features
7. Provide feedback weekly
