# Data Model

All 27 MongoDB collections in Dulan Progiciel, organized by domain. Every business-scoped collection uses a `businessId` (ObjectId ref to `Business`) field for multi-tenant isolation.

---

## 1. Core Business

### `users`

- **Purpose**: Registered platform users (business owners, team members)
- **Tenant scoped**: No (global collection; users belong to businesses via `business_members`)
- **Primary relationships**: Referenced by `business_members`, `auth_sessions`, `audit_logs`, all entity `createdByUserId` fields
- **Important fields**:
  - `phone` (string, unique, required) — primary identifier
  - `email` (string, unique, sparse)
  - `passwordHash` (string, select: false — excluded from default queries)
  - `status` (UserStatus enum: ACTIVE, INACTIVE, SUSPENDED)
  - `platformRole` (PlatformRole enum: USER, ADMIN)
  - `preferredLanguage` (default: 'en')
  - `timezone` (default: 'Asia/Colombo')
- **Important indexes**:
  - `{ phone: 1 }` — unique
  - `{ email: 1 }` — unique, sparse
  - `{ status: 1 }`
- **Soft-delete/status behavior**: `status` field; never hard-deleted

### `auth_sessions`

- **Purpose**: JWT session tracking for token validation and revocation
- **Tenant scoped**: No (global; linked to user via `userId`)
- **Primary relationships**: References `User` via `userId`
- **Important fields**:
  - `userId` (ObjectId, ref: User, required)
  - `tokenHash` (string, required) — hashed refresh token
  - `expiresAt` (Date, required) — TTL index auto-deletes expired sessions
  - `revokedAt` (Date) — set on logout
  - `userAgent`, `ipAddress` — device tracking
- **Important indexes**:
  - `{ userId: 1 }`
  - `{ expiresAt: 1 }` — **TTL index** (`expireAfterSeconds: 0`)
- **Soft-delete/status behavior**: TTL auto-expiry; `revokedAt` for explicit revocation

### `businesses`

- **Purpose**: Business entities (tenants); each business is an isolated data boundary
- **Tenant scoped**: No (this IS the tenant definition)
- **Primary relationships**: Referenced by all business-scoped collections; linked to users via `business_members`
- **Important fields**:
  - `name` (string, required)
  - `slug` (string, unique, required, lowercase)
  - `country` (default: 'LK'), `baseCurrency` (default: 'LKR'), `timezone` (default: 'Asia/Colombo')
  - `status` (BusinessStatus enum: ACTIVE, INACTIVE, SUSPENDED)
  - `planCode` (default: 'free') — entitlement plan reference
  - `features` (embedded: `voiceInput`, `automatedReminders`, `advancedReports`, `teamAccess` — all boolean)
  - `usageLimits` (embedded: `monthlyAiMessages` default 100, `customers` default 20, `invoices` default 20, `monthlyVoiceMinutes` default 30, `monthlyVoiceMessages` default 50)
- **Important indexes**:
  - `{ slug: 1 }` — unique
  - `{ status: 1 }`
  - `{ country: 1 }`
  - `{ planCode: 1 }`
- **Soft-delete/status behavior**: `status` field; never hard-deleted

### `business_members`

- **Purpose**: Many-to-many join between users and businesses with role assignment
- **Tenant scoped**: Yes (via `businessId`)
- **Primary relationships**: References `User` (userId) and `Business` (businessId)
- **Important fields**:
  - `userId` (ObjectId, ref: User, required)
  - `businessId` (ObjectId, ref: Business, required)
  - `role` (BusinessRole enum: OWNER, ADMIN, MEMBER — default: MEMBER)
  - `isActive` (boolean, default: true)
  - `joinedAt` (Date, default: Date.now)
- **Important indexes**:
  - `{ userId: 1, businessId: 1 }` — **unique** (one membership per user per business)
  - `{ businessId: 1 }`
  - `{ userId: 1 }`
  - `{ role: 1 }`
- **Soft-delete/status behavior**: `isActive` flag for soft removal

---

## 2. Financial Domain

### `categories`

- **Purpose**: Transaction categories (income/expense classification)
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: Referenced by `transactions.categoryId`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `name` (string, required, maxlength: 100)
  - `type` (CategoryType enum: INCOME, EXPENSE)
  - `isSystem` (boolean, default: false) — system-created categories can't be deleted
  - `isActive` (boolean, default: true)
- **Important indexes**:
  - `{ businessId: 1, name: 1, type: 1 }` — **unique** (partial: `{ isActive: true }`)
  - `{ businessId: 1 }`
  - `{ businessId: 1, type: 1 }`
  - `{ businessId: 1, isActive: 1 }`
- **Soft-delete/status behavior**: `isActive` soft-delete; partial unique index only considers active categories

### `transactions`

- **Purpose**: Core financial records — income and expense entries
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `Category`, `Customer` (optional), `User` (createdByUserId, confirmedByUserId, voidedByUserId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `type` (TransactionType: INCOME, EXPENSE)
  - `amountMinor` (number, min: 1) — amount in smallest currency unit (cents)
  - `currency` (string, uppercase, required)
  - `categoryId` (ObjectId, ref: Category, required)
  - `customerId` (ObjectId, ref: Customer, optional)
  - `date` (Date, required) — transaction date (not creation date)
  - `description` (string, maxlength: 500), `notes` (string, maxlength: 2000)
  - `paymentMethod` (PaymentMethod: CASH, BANK_TRANSFER, CARD, MOBILE_PAYMENT, OTHER)
  - `source` (TransactionSource: MANUAL, WHATSAPP)
  - `status` (TransactionStatus: CONFIRMED, VOIDED)
  - `voidedAt`, `voidedByUserId`, `voidReason` — soft void fields
- **Important indexes**:
  - `{ businessId: 1, date: -1 }`
  - `{ businessId: 1, type: 1, date: -1 }`
  - `{ businessId: 1, status: 1, date: -1 }`
  - `{ businessId: 1, categoryId: 1, date: -1 }`
  - `{ businessId: 1, createdAt: -1 }`
  - `{ businessId: 1, customerId: 1, date: -1 }`
- **Soft-delete/status behavior**: `VOIDED` status with `voidedAt`/`voidReason`; never hard-deleted

### `customers`

- **Purpose**: Business customer records for invoicing and tracking
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: Referenced by `invoices`, `payments`, `transactions` (optional)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `name` (string, required, maxlength: 150)
  - `phone` (string, maxlength: 30)
  - `email` (string, lowercase, maxlength: 254)
  - `address` (embedded: line1, line2, city, district, postalCode, country — country default 'LK')
  - `notes` (string, maxlength: 1000)
  - `status` (CustomerStatus: ACTIVE, ARCHIVED)
  - `archivedAt`, `archivedByUserId` — archive tracking
- **Important indexes**:
  - `{ businessId: 1, status: 1 }`
  - `{ businessId: 1, name: 1 }`
  - `{ businessId: 1, phone: 1 }`
  - `{ businessId: 1, email: 1 }`
  - `{ businessId: 1, createdAt: -1 }`
- **Soft-delete/status behavior**: `ARCHIVED` status with `archivedAt`; never hard-deleted

### `invoices`

- **Purpose**: Invoice records with embedded customer snapshots and payment tracking
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `Customer`, `User` (createdByUserId, issuedByUserId, voidedByUserId); linked to `invoice_items` and `payments`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `customerId` (ObjectId, ref: Customer, required)
  - `invoiceNumber` (string, required) — format `INV-YYYY-NNNNNN`, unique per business per year
  - `issueDate` (Date, required), `dueDate` (Date, optional)
  - `currency` (string, uppercase, required)
  - `status` (InvoiceStatus: DRAFT, ISSUED, VOIDED)
  - `paymentStatus` (InvoicePaymentStatus: UNPAID, PARTIALLY_PAID, PAID)
  - `subtotalMinor`, `totalMinor` (number, min: 0) — amounts in smallest currency unit
  - `customerSnapshot` (embedded: `InvoiceCustomerSnapshot` — name, phone, email, address — snapshot at issue time)
  - `pdfKey` (string) — local file path for generated PDF
  - `issuedAt`, `issuedByUserId` — issue tracking
  - `voidedAt`, `voidedByUserId`, `voidReason` — void tracking
- **Important indexes**:
  - `{ businessId: 1, invoiceNumber: 1 }` — **unique**
  - `{ businessId: 1, customerId: 1, issueDate: -1 }`
  - `{ businessId: 1, status: 1, issueDate: -1 }`
  - `{ businessId: 1, paymentStatus: 1, dueDate: 1 }`
  - `{ businessId: 1, createdAt: -1 }`
- **Soft-delete/status behavior**: `VOIDED` status; never hard-deleted

### `invoice_items`

- **Purpose**: Line items belonging to an invoice
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `Invoice` (invoiceId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `invoiceId` (ObjectId, ref: Invoice, required)
  - `description` (string, required, maxlength: 500)
  - `quantity` (string, required) — stored as string for flexible quantity representation (e.g., "1.5 hrs", "10 units")
  - `rateMinor` (number, min: 0) — rate in smallest currency unit
  - `amountMinor` (number, min: 0) — line total in smallest currency unit
  - `sortOrder` (number, default: 0)
- **Important indexes**:
  - `{ businessId: 1, invoiceId: 1 }`
- **Soft-delete/status behavior**: Hard-deleted when parent invoice is deleted (cascade)

### `invoice_counters`

- **Purpose**: Auto-incrementing invoice number sequence per business per year
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `year` (number, required)
  - `sequence` (number, default: 0) — incremented atomically via `findOneAndUpdate`
- **Important indexes**:
  - `{ businessId: 1, year: 1 }` — **unique**
- **Soft-delete/status behavior**: N/A (counter document)

### `payments`

- **Purpose**: Payment records against invoices
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `Invoice`, `Customer`, `User` (createdByUserId, voidedByUserId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `invoiceId` (ObjectId, ref: Invoice, required)
  - `customerId` (ObjectId, ref: Customer, required)
  - `amountMinor` (number, min: 1) — payment amount in smallest currency unit
  - `currency` (string, uppercase, required)
  - `date` (Date, required)
  - `method` (PaymentMethod: CASH, BANK_TRANSFER, CARD, MOBILE_PAYMENT, OTHER)
  - `reference` (string, maxlength: 200), `notes` (string, maxlength: 2000)
  - `status` (PaymentStatus: CONFIRMED, VOIDED)
  - `voidedAt`, `voidedByUserId`, `voidReason` — void tracking
- **Important indexes**:
  - `{ businessId: 1, invoiceId: 1, date: -1 }`
  - `{ businessId: 1, customerId: 1, date: -1 }`
  - `{ businessId: 1, status: 1, date: -1 }`
- **Soft-delete/status behavior**: `VOIDED` status; never hard-deleted

---

## 3. WhatsApp

### `whatsapp_connections`

- **Purpose**: Active WhatsApp Business API connections (one per phone number)
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User` (connectedByUserId); linked to `whatsapp_authorized_senders` and `message_events`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `provider` (WhatsAppProvider: META_CLOUD)
  - `wabaId` (string, required) — WhatsApp Business Account ID
  - `phoneNumberId` (string, unique, required) — Meta phone number identifier
  - `displayPhoneNumber`, `businessPhoneE164` (strings, required)
  - `status` (WhatsAppConnectionStatus: PENDING, CONNECTED, DISCONNECTED)
  - `isActive` (boolean, default: true)
  - `connectedAt`, `connectedByUserId`
- **Important indexes**:
  - `{ phoneNumberId: 1 }` — **unique**
  - `{ businessId: 1 }`
  - `{ wabaId: 1 }`
  - `{ status: 1 }`
  - `{ businessId: 1, isActive: 1 }`
- **Soft-delete/status behavior**: `isActive` flag; `status` tracks connection state

### `whatsapp_authorized_senders`

- **Purpose**: Authorized phone numbers that can send messages to a business's WhatsApp
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User`, `WhatsAppConnection`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `userId` (ObjectId, ref: User, required)
  - `whatsappConnectionId` (ObjectId, ref: WhatsAppConnection, required)
  - `phoneE164` (string, required) — sender's phone in E.164 format
  - `status` (SenderStatus: PENDING, VERIFIED, REVOKED)
  - `verifiedAt`, `revokedAt`
- **Important indexes**:
  - `{ businessId: 1 }`
  - `{ businessId: 1, userId: 1 }`
  - `{ whatsappConnectionId: 1, phoneE164: 1 }`
  - `{ businessId: 1, phoneE164: 1 }`
  - `{ status: 1 }`
- **Soft-delete/status behavior**: `REVOKED` status; never hard-deleted

### `whatsapp_pairing_codes`

- **Purpose**: Temporary codes for sender phone number verification
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User`, `WhatsAppAuthorizedSender` (usedBySenderId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `userId` (ObjectId, ref: User, required)
  - `codeHash` (string, required) — hashed pairing code
  - `expiresAt` (Date, required) — TTL index
  - `usedAt` (Date), `usedBySenderId` (ObjectId)
- **Important indexes**:
  - `{ businessId: 1 }`
  - `{ businessId: 1, userId: 1 }`
  - `{ expiresAt: 1 }` — **TTL index** (`expireAfterSeconds: 0`)
  - `{ usedAt: 1 }`
- **Soft-delete/status behavior**: TTL auto-expiry; `usedAt` tracks consumption

### `message_events`

- **Purpose**: Complete log of all WhatsApp messages (inbound and outbound) with processing status
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `WhatsAppConnection`; linked to `ai_proposals`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `whatsappConnectionId` (ObjectId, ref: WhatsAppConnection, required)
  - `provider` (WhatsAppProvider)
  - `providerMessageId` (string, required) — Meta's message ID (unique per provider)
  - `direction` (MessageDirection: INBOUND, OUTBOUND)
  - `senderPhone`, `recipientPhone` (strings, required)
  - `messageType` (MessageType: TEXT, IMAGE, AUDIO, DOCUMENT, INTERACTIVE, UNKNOWN)
  - `text` (string), `mediaId` (string)
  - `processingStatus` (MessageProcessingStatus: RECEIVED, PROCESSING, PROCESSED, FAILED)
  - `deliveryStatus` (DeliveryStatus: SENT, DELIVERED, READ, FAILED)
  - `sentAt`, `deliveredAt`, `readAt`, `failedAt`
  - `metadata` (embedded `MessageEventMetadata`: rawEventType, rawEventId, mediaMimeType, mediaFileSize, voiceDurationSeconds, transcriptionStatus)
- **Important indexes**:
  - `{ provider: 1, providerMessageId: 1 }` — **unique**
  - `{ businessId: 1 }`
  - `{ whatsappConnectionId: 1 }`
  - `{ businessId: 1, providerMessageId: 1 }`
  - `{ businessId: 1, direction: 1, createdAt: -1 }`
  - `{ processingStatus: 1 }`
  - `{ senderPhone: 1 }`
- **Soft-delete/status behavior**: `processingStatus` tracks pipeline progress; never deleted

---

## 4. AI

### `ai_proposals`

- **Purpose**: AI-extracted financial proposals awaiting user confirmation before creating transactions
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User`, `MessageEvent`, `Transaction` (confirmedTransactionId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `userId` (ObjectId, ref: User, required)
  - `messageEventId` (ObjectId, ref: MessageEvent, required)
  - `intent` (AiIntent: CREATE_EXPENSE, CREATE_INCOME, BUSINESS_QUERY, UNKNOWN)
  - `originalText` (string, required) — original user message
  - `inputSource` (string: 'whatsapp_text', 'whatsapp_voice', 'dashboard')
  - `transcript` (string), `speechConfidence` (number) — voice-specific
  - `parsedData` (embedded `ProposalParsedData`: type, amount, currency, category, categoryId, date, description, customer, customerId, paymentMethod)
  - `confidence` (number, 0-1)
  - `status` (AiProposalStatus: PENDING, NEEDS_CLARIFICATION, CONFIRMED, REJECTED, EXPIRED)
  - `validationErrors` (string array)
  - `clarificationQuestion` (string)
  - `confirmedTransactionId` (ObjectId), `confirmedAt`, `rejectedAt`
  - `expiresAt` (Date) — TTL index for auto-expiry
  - `revisionHistory` (array of `ProposalRevision`: timestamp, previousData, updatedData, sourceText)
- **Important indexes**:
  - `{ businessId: 1, status: 1 }`
  - `{ businessId: 1, userId: 1, status: 1 }`
  - `{ messageEventId: 1 }`
  - `{ expiresAt: 1 }` — **TTL index** (`expireAfterSeconds: 0`)
  - `{ businessId: 1, createdAt: -1 }`
  - `{ businessId: 1, intent: 1, messageEventId: 1 }`
- **Soft-delete/status behavior**: `EXPIRED` status via TTL; lifecycle: PENDING → CONFIRMED/REJECTED/EXPIRED

---

## 5. Audit

### `audit_logs`

- **Purpose**: Immutable audit trail of all data mutations for compliance and debugging
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `userId` (ObjectId, ref: User, required)
  - `entityType` (string, required) — e.g., 'transaction', 'invoice', 'payment', 'customer'
  - `entityId` (ObjectId, optional) — ID of the affected document
  - `action` (string, required) — e.g., 'created', 'updated', 'voided', 'issued'
  - `oldValues` (object) — previous field values (for updates)
  - `newValues` (object) — new field values
- **Important indexes**:
  - `{ businessId: 1, createdAt: -1 }`
  - `{ businessId: 1, entityType: 1, entityId: 1 }`
- **Soft-delete/status behavior**: Immutable; never updated or deleted (`timestamps: { createdAt: true, updatedAt: false }`)

---

## 6. Automation

### `reminders`

- **Purpose**: Individual reminder instances (one per invoice per trigger)
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `Invoice`, `Customer`, `User` (triggeredByUserId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `invoiceId` (ObjectId, ref: Invoice, required)
  - `customerId` (ObjectId, ref: Customer, required)
  - `trigger` (ReminderTrigger: DUE_DATE, OVERDUE, MANUAL)
  - `channel` (ReminderChannel: WHATSAPP)
  - `status` (ReminderStatus: PENDING, SENT, DELIVERED, READ, FAILED)
  - `scheduledAt` (Date, required) — when to send
  - `sentAt`, `deliveredAt`, `readAt`
  - `providerMessageId` (string) — Meta message ID after send
  - `deduplicationKey` (string, required, unique) — prevents duplicate reminders
  - `sendAttempts` (number, default: 0)
  - Snapshot fields: `snapshotInvoiceNumber`, `snapshotTotalMinor`, `snapshotRemainingMinor`, `snapshotDueDate`, `snapshotCustomerPhone`, `snapshotCustomerName`
  - `failureReason`, `errorMessage`, `errorCode`
- **Important indexes**:
  - `{ deduplicationKey: 1 }` — **unique**
  - `{ businessId: 1, invoiceId: 1, scheduledAt: 1 }`
  - `{ businessId: 1, status: 1, scheduledAt: 1 }`
  - `{ businessId: 1, createdAt: -1 }`
- **Soft-delete/status behavior**: `FAILED` status with error details; never deleted

### `reminder_rules`

- **Purpose**: Business-level reminder configuration (one rule per trigger type per business)
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `trigger` (ReminderTrigger: DUE_DATE, OVERDUE, MANUAL)
  - `channel` (ReminderChannel: WHATSAPP)
  - `isEnabled` (boolean, default: false)
  - `offsetDays` (number, default: 3) — days before/after due date
  - `dayOfMonth` (number, default: 0)
  - `hourOfDay` (number, default: 1), `minuteOfHour` (number, default: 9)
  - `maxRemindsPerInvoice` (number, default: 5)
  - `manualCooldownMinutes` (number, default: 60)
  - `templateName`, `templateLanguage` (strings)
- **Important indexes**:
  - `{ businessId: 1, trigger: 1 }` — **unique** (one rule per trigger per business)
- **Soft-delete/status behavior**: `isEnabled` toggle; never deleted

### `summary_preferences`

- **Purpose**: Business-level financial summary delivery preferences
- **Tenant scoped**: Yes (`businessId`, unique)
- **Primary relationships**: References `Business`, `User` (createdByUserId, updatedByUserId)
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required, unique)
  - `dailyEnabled` (boolean), `dailySendHour`, `dailySendMinute`
  - `weeklyEnabled` (boolean), `weeklyDay` (WeeklyDay enum), `weeklySendHour`, `weeklySendMinute`
  - `timezone` (default: 'Asia/Colombo')
  - `channel` (SummaryChannel: WHATSAPP)
  - Content toggles: `includeIncome`, `includeExpenses`, `includeNetCashFlow`, `includeTransactionCount`, `includeOutstandingInvoices`, `includeTopCategories`, `includeOverdueInvoices`
- **Important indexes**:
  - `{ businessId: 1 }` — **unique**
- **Soft-delete/status behavior**: N/A (singleton per business)

### `financial_summaries`

- **Purpose**: Generated summary reports (daily/weekly) with delivery tracking
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `frequency` (SummaryFrequency: DAILY, WEEKLY)
  - `periodStart`, `periodEnd` (Dates, required)
  - `timezone`, `currency`
  - Financial metrics: `incomeMinor`, `expenseMinor`, `netCashFlowMinor`, `transactionCount`
  - Outstanding metrics: `outstandingAmountMinor`, `outstandingInvoiceCount`, `overdueAmountMinor`, `overdueInvoiceCount`
  - `topExpenseCategories`, `topIncomeCategories` (arrays of `SummaryCategoryBreakdown`: categoryId, name, amountMinor, transactionCount)
  - `status` (SummaryStatus: GENERATED, SENT, DELIVERED, READ, FAILED)
  - `providerMessageId`, `deduplicationKey` (unique)
  - `sendAttempts`, `generatedAt`, `sentAt`, `deliveredAt`, `readAt`, `failedAt`, `failureCode`
- **Important indexes**:
  - `{ businessId: 1, frequency: 1, periodStart: 1, periodEnd: 1 }` — **unique** (one summary per period per frequency)
  - `{ deduplicationKey: 1 }` — **unique**
  - `{ businessId: 1, createdAt: -1 }`
  - `{ businessId: 1, status: 1 }`
- **Soft-delete/status behavior**: `FAILED` status with error details; never deleted

---

## 7. Beta / Entitlements

### `beta_enrollments`

- **Purpose**: Tracks business participation in beta program
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User`, `BetaInvite`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `userId` (ObjectId, ref: User, required)
  - `inviteId` (ObjectId, ref: BetaInvite, optional)
  - `cohort` (string)
  - `status` (BetaEnrollmentStatus: INVITED, STARTED, ACTIVATED, PAUSED, EXITED)
  - `startedAt`, `activatedAt`, `pausedAt`, `exitedAt`, `firstMeaningfulActivityAt`
  - `notes` (string)
- **Important indexes**:
  - `{ businessId: 1 }` — **unique** (one enrollment per business)
  - `{ status: 1 }`
  - `{ cohort: 1 }`
- **Soft-delete/status behavior**: `status` lifecycle: INVITED → STARTED → ACTIVATED → PAUSED/EXITED

### `beta_invites`

- **Purpose**: Beta invitation codes with usage limits
- **Tenant scoped**: No (global; tied to inviter, not business)
- **Primary relationships**: Referenced by `beta_enrollments`
- **Important fields**:
  - `codeHash` (string, unique, required) — hashed invite code
  - `email` (string, optional)
  - `status` (BetaInviteStatus: ACTIVE, EXHAUSTED, REVOKED)
  - `expiresAt` (Date, required)
  - `maxUses` (number, default: 1), `usedCount` (number, default: 0)
  - `createdByUserId` (ObjectId, ref: User)
  - `notes`, `cohort` (strings)
- **Important indexes**:
  - `{ codeHash: 1 }` — **unique**
- **Soft-delete/status behavior**: `EXHAUSTED` when `usedCount >= maxUses`; `REVOKED` for explicit revocation

### `plan_definitions`

- **Purpose**: Defines available subscription plans with feature toggles and usage limits
- **Tenant scoped**: No (global configuration)
- **Primary relationships**: Referenced by `businesses.planCode`
- **Important fields**:
  - `code` (string, unique, required) — e.g., 'free', 'starter', 'pro'
  - `name` (string, required)
  - `description` (string)
  - `isActive` (boolean, default: true)
  - `features` (array of `FeatureToggle`: key (FeatureKey enum), enabled (boolean))
  - `limits` (embedded `PlanLimits`: customersPerMonth default 50, invoicesPerMonth default 100, aiRequestsPerMonth default 50, voiceMinutesPerMonth default 10, remindersPerMonth default 20, exportsPerMonth default 5)
- **Important indexes**:
  - `{ code: 1 }` — **unique**
- **Soft-delete/status behavior**: `isActive` flag

### `usage_counters`

- **Purpose**: Tracks per-business monthly usage against plan limits
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `metric` (UsageMetric enum: AI_REQUESTS, VOICE_MINUTES, VOICE_MESSAGES, CUSTOMERS, INVOICES, EXPORTS, REMINDERS)
  - `periodType` (string: 'month')
  - `periodKey` (string, required) — e.g., '2026-08'
  - `quantity` (number, default: 0)
  - `updatedAt` (Date, default: Date.now)
- **Important indexes**:
  - `{ businessId: 1, metric: 1, periodType: 1, periodKey: 1 }` — **unique**
- **Soft-delete/status behavior**: N/A (counter document, updated atomically)

---

## 8. Feedback / Data

### `feedback`

- **Purpose**: User feedback submissions (bug reports, feature requests, general)
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `Business`, `User`
- **Important fields**:
  - `businessId` (ObjectId, ref: Business, required)
  - `userId` (ObjectId, ref: User, required)
  - `type` (FeedbackType: BUG_REPORT, FEATURE_REQUEST, GENERAL)
  - `message` (string, required, maxlength: 5000)
  - `rating` (number, 1-5, optional)
  - `page` (string, maxlength: 500) — where the feedback was submitted from
  - `relatedEntityType`, `relatedEntityId` — optional link to a specific entity
  - `status` (FeedbackStatus: NEW, REVIEWED, RESOLVED, DISMISSED)
  - `adminNotes` (string, maxlength: 2000)
- **Important indexes**:
  - `{ businessId: 1, createdAt: -1 }`
  - `{ userId: 1, createdAt: -1 }`
  - `{ type: 1, status: 1 }`
  - `{ status: 1, createdAt: -1 }`
- **Soft-delete/status behavior**: `status` lifecycle for triage; never deleted

### `data_requests`

- **Purpose**: GDPR/data export and deletion requests
- **Tenant scoped**: Yes (`businessId`)
- **Primary relationships**: References `User`, `Business`
- **Important fields**:
  - `userId` (ObjectId, ref: User, required)
  - `businessId` (ObjectId, ref: Business, required)
  - `type` (DataRequestType: EXPORT, DELETION)
  - `status` (DataRequestStatus: PENDING, PROCESSING, COMPLETED, REJECTED)
  - `requestedAt` (Date, default: Date.now)
  - `processedAt` (Date)
  - `fileKey` (string) — path to exported data file
  - `fileExpiresAt` (Date) — download link expiry
  - `reviewNotes` (string, maxlength: 2000)
  - `reviewedByUserId` (ObjectId, ref: User)
- **Important indexes**:
  - `{ userId: 1, createdAt: -1 }`
  - `{ businessId: 1, type: 1 }`
  - `{ status: 1, createdAt: -1 }`
- **Soft-delete/status behavior**: `status` lifecycle: PENDING → PROCESSING → COMPLETED/REJECTED; never deleted
