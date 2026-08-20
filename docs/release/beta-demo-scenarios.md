# Beta Demo Scenarios

**Project:** Dulan Progiciel - WhatsApp-First Business Finance Assistant
**Document Version:** 1.0
**Date:** August 2026

---

These are step-by-step demo scripts for demonstrating the Dulan Progiciel MVP to beta users, stakeholders, and investors. Each scenario is self-contained and can be run independently.

---

## Demo 1 — Manual Expense Entry

**Objective:** Demonstrate manual transaction entry via the dashboard.

### Steps

1. Navigate to `http://localhost:3000/login`
2. Enter credentials and log in
3. Select a business from the business dropdown (if multiple)
4. Navigate to `/dashboard/transactions/new`
5. Fill in the form:
   - **Type:** Expense
   - **Amount:** 2500
   - **Category:** Delivery
   - **Date:** Today's date
   - **Description:** "Delivery to customer"
6. Click Submit
7. Verify the transaction appears in the transactions list
8. Navigate to `/dashboard`
9. Verify the dashboard totals have updated (expenses increased by LKR 2,500)
10. Navigate to `/dashboard/reports/expenses`
11. Verify the LKR 2,500 expense appears in the expense report

### Expected Result
Transaction is created, dashboard totals reflect the new expense, and the expense report includes the entry.

---

## Demo 2 — WhatsApp Expense Capture

**Objective:** Demonstrate AI-powered expense capture from a WhatsApp text message.

### Prerequisites
- WhatsApp connection configured for the business
- At least one authorized sender paired

### Steps

1. Open WhatsApp on your phone or WhatsApp Web
2. Send a message to the business WhatsApp number:
   ```
   Spent 2500 on delivery today
   ```
3. Wait for the bot to respond with a confirmation request
4. Verify the proposal shows:
   - **Type:** Expense
   - **Amount:** LKR 2,500
   - **Category:** Delivery
   - **Date:** Today's date
5. Open the dashboard at `/dashboard/ai-proposals`
6. Locate the proposal in the list
7. Click **CONFIRM**
8. Verify exactly one transaction was created
9. Verify no duplicate transactions exist (check transactions list)

### Expected Result
One expense transaction of LKR 2,500 is created from the WhatsApp message with no duplicates.

---

## Demo 3 — AI Correction Workflow

**Objective:** Demonstrate correcting an AI-extracted amount before confirmation.

### Steps

1. Open WhatsApp
2. Send a message:
   ```
   Spent 20000 on transport
   ```
3. Wait for the proposal response
4. Verify the proposal shows **LKR 20,000** (twenty thousand)
5. Send a correction message:
   ```
   No, it was 2000 not 20000
   ```
6. Verify the same proposal is updated (not a new proposal created)
7. Verify the amount changed to **LKR 2,000**
8. Reply to confirm the proposal
9. Navigate to `/dashboard/transactions`
10. Verify exactly one transaction exists at **LKR 2,000**
11. Verify no transaction exists at LKR 20,000

### Expected Result
The original proposal is updated in place. Only one transaction is created at the corrected amount.

---

## Demo 4 — Voice Note Transaction

**Objective:** Demonstrate voice-based transaction capture.

### Prerequisites
- Voice feature enabled for the business
- WhatsApp connection active

### Steps

1. Open WhatsApp
2. Record and send a voice note saying:
   ```
   Spent 2500 on delivery today
   ```
3. Wait for the processing message ("Processing your voice note...")
4. Verify a transcription message is returned showing the transcribed text
5. Verify an AI proposal is created from the transcription
6. Review the proposal details (type, amount, category, date)
7. Confirm the proposal
8. Navigate to `/dashboard/transactions`
9. Verify the transaction was created from the voice note

### Expected Result
Voice note is transcribed, a proposal is generated, and upon confirmation a transaction is created.

---

## Demo 5 — Customer and Invoice Creation

**Objective:** Demonstrate creating a customer and issuing an invoice with PDF download.

### Steps

1. Navigate to `/dashboard/customers/new`
2. Fill in the form:
   - **Name:** Nimal Perera
   - **Phone:** +94771234567
3. Click Save
4. Verify the customer appears in the customers list
5. Navigate to `/dashboard/invoices/new`
6. Select **Nimal Perera** from the customer dropdown
7. Add line items:
   - **Item 1:** Consultation — Quantity: 1, Unit Price: 15,000
   - **Item 2:** Travel — Quantity: 1, Unit Price: 5,000
8. Verify the total shows LKR 20,000
9. Click **Issue Invoice**
10. Verify the invoice status changes to **ISSUED**
11. Click **Download PDF**
12. Verify the PDF opens and contains:
    - Customer name: Nimal Perera
    - Line items with correct amounts
    - Total: LKR 20,000

### Expected Result
Customer is created, invoice is issued with correct details, and PDF is downloadable with all information accurate.

---

## Demo 6 — Payment Recording and Status Tracking

**Objective:** Demonstrate partial and full payment recording against an invoice.

### Prerequisites
- An issued invoice with total LKR 35,000

### Steps

1. Navigate to the invoice detail page
2. Verify the invoice shows status **UNPAID** and outstanding balance **LKR 35,000**
3. Click **Record Payment**
4. Enter payment amount: **10,000**
5. Submit the payment
6. Verify the invoice status changes to **PARTIAL**
7. Verify the outstanding balance shows **LKR 25,000**
8. Click **Record Payment** again
9. Enter payment amount: **25,000**
10. Submit the payment
11. Verify the invoice status changes to **PAID**
12. Verify the outstanding balance shows **LKR 0**

### Expected Result
Payment status transitions correctly: UNPAID -> PARTIAL -> PAID. Outstanding balance updates accurately.

---

## Demo 7 — Database-Grounded Business Query

**Objective:** Demonstrate AI business questions answered from actual database records.

### Prerequisites
- Sufficient transaction and invoice data exists in the system
- At least one unpaid invoice

### Steps

1. Open WhatsApp
2. Send a message:
   ```
   Who has not paid me?
   ```
3. Wait for the AI response
4. Verify the response lists unpaid invoices with:
   - Customer names
   - Invoice numbers
   - Outstanding amounts
5. Navigate to `/dashboard/reports/outstanding` (or invoices list)
6. Cross-reference the amounts mentioned in the AI response with actual invoice data
7. Verify the amounts match exactly

### Expected Result
The AI response accurately reflects the actual unpaid invoices in the database with correct customer names and amounts.

---

## Demo 8 — Tenant Isolation (Security)

**Objective:** Demonstrate that business data is properly isolated between tenants.

### Steps

1. Login as **Business A** user
2. Navigate to the invoices list and copy an invoice ID from Business A
3. Now, login as **Business B** user (or use an API client with Business B's session)
4. Attempt to access Business A's invoice via API:
   ```
   GET /api/invoices/{BUSINESS_A_INVOICE_ID}
   ```
5. Verify the response is **404 Not Found** or **403 Access Denied**
6. Verify that Business B's dashboard shows no data from Business A
7. Verify that searching for Business A's customer names returns no results in Business B's context

### Expected Result
Business A's invoice is inaccessible from Business B's context. No cross-tenant data leakage occurs.

---

## Demo 9 — Reminder Safety (Paid Invoice Not Reminded)

**Objective:** Demonstrate that paid invoices do not receive payment reminders.

### Prerequisites
- Invoice with due date 3 days from today
- Reminder rule configured for 3 days before due date

### Steps

1. Create an invoice for LKR 35,000 with due date 3 days from today
2. Configure a reminder rule: "Send reminder 3 days before due date"
3. Record a full payment of LKR 35,000 against the invoice immediately
4. Verify invoice status is **PAID**
5. Trigger the reminder scan (or wait for the scheduled job to run)
6. Verify no reminder message was sent for the paid invoice
7. Check the WhatsApp conversation — no reminder should appear
8. Check the audit log — no reminder action should be recorded for this invoice

### Expected Result
The paid invoice is excluded from the reminder scan. No reminder is sent and no reminder action is logged.
