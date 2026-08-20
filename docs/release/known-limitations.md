# Known Limitations

**Project:** Dulan Progiciel - WhatsApp-First Business Finance Assistant
**Document Version:** 1.0
**Date:** August 2026

---

This document describes known limitations of the Dulan Progiciel MVP. These are not bugs or defects — they are explicit design boundaries, architectural decisions, and external dependencies that beta users and stakeholders should understand.

---

## 1. Not a Double-Entry Accounting Ledger

The system tracks income and expense transactions using a simplified model. It does **not** implement double-entry bookkeeping with debits and credits. There is no general ledger, no chart of accounts, and no trial balance.

**Impact:** The system is suitable for basic cash-flow tracking but is not a replacement for formal accounting software. Net cash flow is not the same as accounting profit.

---

## 2. No Bank Feed Integration

All financial data entry is manual or WhatsApp-based. There is no automated bank feed, bank statement import, or bank reconciliation feature.

**Impact:** Users must manually enter all transactions. There is no way to automatically match or verify transactions against bank records.

---

## 3. No Inventory Management

The system does not track products, stock levels, cost of goods sold, or inventory movements. Services and products can be listed as line items on invoices, but there is no inventory tracking.

**Impact:** Businesses with physical inventory will need a separate system for stock management.

---

## 4. No Tax Filing Engine

The system does not perform automated tax calculation, VAT tracking, or tax filing. There is no integration with the Sri Lanka Inland Revenue Department.

**Impact:** Users are responsible for their own tax calculations and filings. The system provides financial data but not tax compliance.

---

## 5. No Accounting Profit Statement

Net cash flow (income minus expenses) is displayed on the dashboard and reports. This is **not** a formal accounting profit statement. It does not account for accruals, depreciation, prepaid expenses, or other accrual-basis accounting concepts.

**Impact:** Cash flow figures should not be interpreted as formal profit or loss without appropriate accounting adjustments.

---

## 6. No Advanced Multi-Currency Accounting

Currency is tracked per-transaction using the business's base currency (default LKR). There is no foreign exchange conversion, no multi-currency ledger, and no currency gain/loss tracking.

**Impact:** Businesses dealing in multiple currencies must manually convert amounts. Exchange rate fluctuations are not tracked.

---

## 7. No Native Mobile Application

The system is accessed via mobile web browser. There is no native iOS or Android application. The dashboard and forms are responsive but do not provide native mobile features such as push notifications or offline mode.

**Impact:** Users must have an internet connection. No offline capability. No app store distribution.

---

## 8. No Fully Autonomous Financial Writes

By design, all AI-generated financial records (transactions, proposals) require explicit user confirmation. The AI cannot directly create, modify, or delete financial records without user approval.

**Impact:** This is a deliberate safety control, not a limitation. It ensures users maintain full control over their financial data. The tradeoff is an additional confirmation step for every AI-captured transaction.

---

## 9. Sinhala / Tamil Accuracy Not Production Validated

The system architecture supports multiple languages via the `preferredLanguage` field. However, for the MVP, only English is production-validated. Sinhala and Tamil language models have not been tested with real-world Sri Lankan business terminology.

**Impact:** Beta users should use English for reliable AI extraction accuracy. Sinhala/Tamil support may produce incorrect financial extractions.

---

## 10. Speech Accuracy Varies

Voice note transcription uses OpenAI's Whisper-1 model. Accuracy depends on audio quality, speaker accent, background noise, and recording duration.

**Impact:** Transcription errors may lead to incorrect financial proposals. Users should review the transcription and proposed amounts before confirming. Accuracy is highest for clear, quiet recordings in standard English.

---

## 11. WhatsApp Availability Depends on Meta Cloud API

All WhatsApp messaging depends on the Meta Cloud API. Service outages, rate limits, or policy changes by Meta directly impact the system.

**Impact:** If Meta Cloud API is unavailable, WhatsApp-based transaction capture is unavailable. Manual entry via the dashboard remains functional.

---

## 12. AI Depends on OpenAI API

Financial extraction and business Q&A depend on the OpenAI API (GPT-4o-mini). API outages, rate limits, or model changes affect AI features.

**Impact:** If OpenAI is unavailable, a fallback extraction method is available with lower accuracy. Business Q&A returns an error message. Manual transaction entry is unaffected.

---

## 13. Scheduled Automation Depends on Redis / Worker Availability

Automated features — invoice payment reminders, scheduled financial summaries, and cleanup jobs — depend on a running BullMQ worker process backed by Redis.

**Impact:** If Redis or the worker process is down, scheduled features stop executing. They resume automatically when the worker recovers. No data is lost, but reminders and summaries may be delayed.

---

## 14. PDF Generation Is Basic

Invoice PDFs use simple server-side templates. They are functional and contain all required information but are not pixel-perfect or designed for brand customization.

**Impact:** PDFs are suitable for sending to customers but do not offer custom branding, logos, or advanced layout options.

---

## 15. No Real-Time Notifications

The dashboard uses polling-based updates. There are no WebSocket connections or push notifications for real-time updates.

**Impact:** Users must refresh the page to see the latest data. New transactions, payments, or AI proposals are not displayed in real-time.

---

## 16. Single-Tenant Per Request

All financial API operations require an `X-Business-Id` header for tenant isolation. The system enforces strict business-scoped data access.

**Impact:** Users belonging to multiple businesses must switch between business contexts. There is no cross-business aggregated view.
