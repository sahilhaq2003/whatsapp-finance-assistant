# Request Flows

End-to-end request flow documentation for all major operations in Dulan Progiciel. Each flow references exact source file locations.

---

## 1. WhatsApp Expense Flow

**Entry point**: `POST /api/whatsapp/webhook`

```mermaid
sequenceDiagram
    participant Meta as Meta WhatsApp API
    participant WH as WhatsAppWebhookService
    participant BR as WhatsAppBusinessResolver
    participant MS as WhatsAppMessageService
    participant AI as AiExtractionService
    participant LLM as LlmProviderService
    participant PS as AiProposalService
    participant TX as Transaction Service
    participant AUD as AuditService
    participant DB as MongoDB

    Meta->>WH: Webhook POST (raw body)
    WH->>WH: verifySignature(body, signature)
    WH->>WH: processWebhookEvent(body)
    WH->>BR: resolveByPhoneNumberId(phoneNumberId)
    BR-->>WH: { connection, business }
    WH->>DB: findOne({ provider, providerMessageId }) — dedup check
    alt Duplicate
        WH-->>Meta: 200 OK (skip)
    else New message
        WH->>DB: create(MessageEvent) — status: PROCESSING
        WH->>MS: handleInboundMessage(messageEvent, connection, business)
        MS->>BR: findAuthorizedSender(businessId, senderPhone)
        alt Unauthorized sender
            MS->>WH: sendReply(UNAUTHORIZED)
        else Authorized sender
            alt TEXT message
                MS->>MS: handleAuthorizedTextMessage()
                MS->>PS: findActiveProposal(businessId, userId)
                alt Active proposal exists
                    MS->>MS: handleProposalFlow(text) — confirm/cancel/edit
                else No active proposal
                    MS->>AI: processFinancialMessage(messageEvent, businessId, userId)
                    AI->>AI: promptService.buildExtractionContext()
                    AI->>LLM: extractFinancialIntent(input)
                    LLM-->>AI: { intent, confidence, transactions, missingFields }
                    alt business_query intent
                        AI->>AI: businessQueryHandler.handleQuestion()
                    else create_expense/create_income
                        AI->>DB: create(AiProposal) — status: PENDING/NEEDS_CLARIFICATION
                    end
                    AI-->>MS: { proposal, reply }
                    MS->>WH: sendReply(proposal confirmation text)
                end
            else AUDIO message
                MS->>MS: handleVoiceMessage() — see Voice Note Flow
            else Unsupported type
                MS->>WH: sendReply(UNSUPPORTED_TYPE)
            end
        end
        MS->>DB: update(messageEvent, { processingStatus: PROCESSED })
    end
```

### Code References

| Step | File | Line(s) |
|------|------|---------|
| Webhook entry | `whatsapp.controller.ts` | POST `/whatsapp/webhook` |
| Signature verification | `whatsapp-webhook.service.ts:64-70` | `verifySignature()` |
| Event processing | `whatsapp-webhook.service.ts:72-96` | `processWebhookEvent()` |
| Business resolution | `whatsapp-business-resolver.service.ts` | `resolveByPhoneNumberId()` |
| Deduplication | `whatsapp-webhook.service.ts:115-123` | `findOne({ providerMessageId })` + unique index |
| Message event creation | `whatsapp-webhook.service.ts:127-144` | `messageEventModel.create()` |
| Inbound handling | `whatsapp-message.service.ts:40-86` | `handleInboundMessage()` |
| Sender authorization | `whatsapp-business-resolver.service.ts` | `findAuthorizedSender()` |
| Proposal flow | `whatsapp-message.service.ts:176-282` | `handleProposalFlow()` |
| AI extraction | `ai-extraction.service.ts:35-108` | `processFinancialMessage()` |
| LLM call | `llm-provider.service.ts:19-75` | `extractFinancialIntent()` |
| Proposal creation | `ai-extraction.service.ts:287-332` | `createProposal()` |
| Confirmation keywords | `ai.constants.ts` | `CONFIRMATION_KEYWORDS`, `REJECTION_KEYWORDS`, `EDIT_KEYWORDS` |

---

## 2. Voice Note Flow

**Entry point**: Same as text — `POST /api/whatsapp/webhook` with `message.type === 'audio'`

```mermaid
sequenceDiagram
    participant MS as WhatsAppMessageService
    participant VP as WhatsAppVoiceProcessorService
    participant PP as MetaWhatsAppProvider
    participant SP as SpeechService (Whisper-1)
    participant AI as AiExtractionService
    participant DB as MongoDB

    MS->>MS: handleInboundMessage() — detects MessageType.AUDIO
    MS->>MS: handleVoiceMessage(messageEvent, connection, business, userId)
    MS->>MS: Check business.features.voiceInput === true
    alt Voice feature disabled
        MS->>MS: sendReply(FEATURE_DISABLED)
    else Voice feature enabled
        MS->>MS: sendReply(PROCESSING)
        MS->>DB: findActiveProposal(businessId, userId)
        alt Active proposal exists
            MS->>MS: sendReply("Send correction as text")
        else No active proposal
            MS->>VP: processVoiceMessage(messageEvent, businessId, userId)
            VP->>PP: getMediaMetadata({ mediaId })
            PP-->>VP: { url, mimeType, fileSize }
            VP->>PP: downloadMedia({ mediaUrl })
            VP->>VP: Write buffer to temp file (voice_{id}_{random}.ogg)
            VP->>DB: update(messageEvent, { metadata.mediaMimeType, mediaFileSize })
            VP->>VP: updateTranscriptionStatus(id, 'processing')
            VP->>SP: transcribe(tempFilePath, mimeType)
            SP-->>VP: { transcript, confidence, success }
            VP->>DB: update(messageEvent, { text: transcript, metadata.transcriptionStatus: 'completed' })
            VP->>AI: processFinancialMessage(messageEvent, businessId, userId, { inputSource: 'whatsapp_voice', transcript, speechConfidence })
            AI-->>VP: { proposal, reply }
            VP->>VP: safeDeleteFile(tempFilePath) — always in finally block
            VP-->>MS: { reply, success }
        end
        MS->>MS: sendReply(result.reply)
    end
```

### Code References

| Step | File | Line(s) |
|------|------|---------|
| Voice routing | `whatsapp-message.service.ts:62-65` | `if (messageEvent.messageType === MessageType.AUDIO)` |
| Feature check | `whatsapp-message.service.ts:340` | `business.features?.voiceInput === true` |
| Processing message | `whatsapp-voice-processor.service.ts:43-110` | `processVoiceMessage()` |
| Audio download | `whatsapp-voice-processor.service.ts:112-147` | `downloadAudio()` |
| Media metadata | `whatsapp-provider.service.ts` | `getMediaMetadata()` |
| Media download | `whatsapp-provider.service.ts` | `downloadMedia()` |
| Temp file write | `whatsapp-voice-processor.service.ts:135` | `fs.writeFileSync(filePath, buffer)` |
| Transcription | `whatsapp-voice-processor.service.ts:58` | `speechService.transcribe(tempFilePath, mimeType)` |
| AI with voice context | `whatsapp-voice-processor.service.ts:75-84` | `extractionService.processFinancialMessage()` with `inputSource: 'whatsapp_voice'` |
| Temp cleanup | `whatsapp-voice-processor.service.ts:106-108` | `safeDeleteFile()` in `finally` block |
| Stale cleanup | `whatsapp-voice-processor.service.ts:197-224` | `cleanupStaleFiles()` — removes files > 1 hour old |

---

## 3. Invoice Flow

**Entry points**: `POST /api/invoices` (create), `POST /api/invoices/:id/issue`, `POST /api/invoices/:id/payments`

```mermaid
sequenceDiagram
    participant Client as Dashboard Client
    participant IC as InvoicesController
    participant IS as InvoicesService
    participant CS as CustomersService
    participant PS as PaymentsService
    participant PDF as PDF Generation
    participant AUD as AuditService
    participant DB as MongoDB

    Note over Client,DB: Create Draft
    Client->>IC: POST /api/invoices (CreateInvoiceDto)
    IC->>IS: create(businessId, dto)
    IS->>IS: Increment invoice_counters for {businessId, year}
    IS->>IS: Generate invoiceNumber (INV-YYYY-NNNNNN)
    IS->>DB: create(Invoice { status: DRAFT, paymentStatus: UNPAID })
    IS->>DB: create(InvoiceItem[]) for each line item
    IS->>AUD: log(businessId, userId, 'invoice', invoiceId, 'created', newValues)
    IS-->>Client: Invoice (DRAFT)

    Note over Client,DB: Issue Invoice
    Client->>IC: POST /api/invoices/:id/issue
    IC->>IS: issue(businessId, invoiceId, userId)
    IS->>DB: findOne({ businessId, _id }) — validate DRAFT status
    IS->>IS: Generate PDF (invoice data → PDF buffer)
    IS->>IS: Store PDF → get pdfKey
    IS->>DB: update(invoice, { status: ISSUED, issuedAt, issuedByUserId, pdfKey })
    IS->>AUD: log(businessId, userId, 'invoice', invoiceId, 'issued', { oldStatus: DRAFT, newStatus: ISSUED })
    IS-->>Client: Invoice (ISSUED)

    Note over Client,DB: Record Payment
    Client->>IC: POST /api/invoices/:id/payments (RecordPaymentDto)
    IC->>PS: create(businessId, invoiceId, dto)
    PS->>DB: create(Payment { status: CONFIRMED })
    PS->>DB: Aggregate confirmed payments for this invoice
    PS->>PS: Calculate totalPaid, remaining
    PS->>DB: update(Invoice, { paymentStatus: PAID/PARTIALLY_PAID/UNPAID })
    PS->>AUD: log(businessId, userId, 'payment', paymentId, 'created')
    PS-->>Client: Payment
```

### Code References

| Step | File | Line(s) |
|------|------|---------|
| Create invoice | `invoices.controller.ts` | `POST /invoices` |
| Invoice number generation | `invoices.service.ts` | `invoice_counters` increment via `findOneAndUpdate` with upsert |
| Invoice schema | `invoice.schema.ts` | `invoiceNumber` unique on `{businessId, invoiceNumber}` (line 102) |
| Issue invoice | `invoices.controller.ts` | `POST /invoices/:id/issue` |
| PDF generation | `invoices.service.ts` | `generatePdf()` or similar |
| Record payment | `payments.controller.ts` | `POST /invoices/:id/payments` |
| Payment schema | `payment.schema.ts` | `amountMinor`, `method`, `status` |
| Outstanding recalculation | `invoices.service.ts` | Aggregate `payments` where `invoiceId` matches, compare sum to `totalMinor` |
| Audit logging | `audit.service.ts` | `log()` creates `audit_logs` entry |

---

## 4. Reminder Flow

**Entry point**: BullMQ job queue (triggered by `InvoiceReminderWorker`)

```mermaid
sequenceDiagram
    participant CRON as ScheduleModule / BullMQ
    participant IW as InvoiceReminderWorker
    participant RS as RemindersService
    participant RSC as ReminderSchedulerService
    participant RD as ReminderDeliveryService
    participant WMS as WhatsAppMessageService
    participant Meta as Meta WhatsApp API
    participant DB as MongoDB

    CRON->>IW: BullMQ Job (checkDueInvoices)
    IW->>RS: scanDueInvoices()
    RS->>DB: find(ReminderRule where isEnabled=true)
    loop For each active rule
        RS->>DB: find(Invoices where status=ISSUED AND paymentStatus in [UNPAID, PARTIALLY_PAID])
        loop For each outstanding invoice
            RS->>RS: Check deduplicationKey uniqueness
            RS->>RS: Check snapshotRemainingMinor > 0 (fresh check)
            alt Still outstanding
                RS->>DB: create(Reminder { status: PENDING, scheduledAt })
            else Fully paid
                RS->>RS: Skip
            end
        end
    end

    CRON->>IW: BullMQ Job (processReminders)
    IW->>RS: processScheduledReminders()
    RS->>DB: find(Reminder where status=PENDING AND scheduledAt <= now)
    loop For each pending reminder
        RS->>RS: Check sendAttempts < maxRemindsPerInvoice
        RS->>RD: sendReminder(reminder)
        RD->>DB: find(Invoice) — fresh snapshot data
        RD->>RD: Update snapshot fields (invoiceNumber, totalMinor, remainingMinor, dueDate, customerPhone, customerName)
        RD->>WMS: sendTextMessage(businessId, customerPhone, templateText)
        WMS->>Meta: Send WhatsApp template message
        Meta-->>WMS: { providerMessageId }
        RD->>DB: update(Reminder, { status: SENT, sentAt, providerMessageId, sendAttempts++ })
    end

    Note over Meta,DB: Status Update via Webhook
    Meta->>IW: Webhook status update (delivered/read/failed)
    IW->>DB: update(Reminder, { status: DELIVERED/READ/FAILED, deliveredAt/readAt/failedAt })
```

### Code References

| Step | File | Line(s) |
|------|------|---------|
| Worker entry | `invoice-reminder.worker.ts:43-62` | `reminderProcessor()` |
| Due invoice scan | `invoice-reminder.worker.ts:64-82` | `checkDueInvoicesProcessor()` |
| Reminder rules | `reminder-rule.schema.ts` | `{businessId, trigger}` unique index (line 51) |
| Reminder creation | `reminders.service.ts` | `scanDueInvoices()` |
| Deduplication | `reminder.schema.ts:88` | `{deduplicationKey: 1}` unique index |
| Fresh outstanding check | `reminders.service.ts` | Re-query invoice + payments to verify still outstanding |
| Delivery | `reminder-delivery.service.ts` | `sendReminder()` — template message via WhatsApp |
| Status tracking | `reminder.schema.ts` | `status` enum: PENDING → SENT → DELIVERED → READ (or FAILED) |
| Status webhook | `whatsapp-webhook.service.ts:205-226` | `processStatusUpdate()` updates `reminderModel` |

---

## 5. Business Question Flow

**Entry point**: WhatsApp text message classified as `business_query` by LLM

```mermaid
sequenceDiagram
    participant User as WhatsApp User
    participant MS as WhatsAppMessageService
    participant AI as AiExtractionService
    participant LLM as LlmProviderService
    participant BQH as BusinessQueryHandler
    participant CLS as BusinessQueryClassifierService
    participant BQD as BusinessQueryDateService
    participant BQS as BusinessQueryService
    participant RSP as BusinessQueryResponseService
    participant DB as MongoDB

    User->>MS: "How much did I spend this month?"
    MS->>AI: processFinancialMessage(messageEvent, businessId, userId)
    AI->>LLM: extractFinancialIntent({ messageText })
    LLM->>LLM: System prompt with intent classification rules
    LLM-->>AI: { intent: BUSINESS_QUERY, confidence: 0.85 }

    AI->>BQH: handleQuestion(businessId, originalText)
    BQH->>CLS: classify(question)
    CLS->>LLM: OpenAI chat completion (classifier prompt)
    LLM-->>CLS: { queryType: expense_total, dateRange: { preset: this_month }, confidence: 0.9 }
    CLS-->>BQH: BusinessQueryClassification

    BQH->>BQD: resolveDateRange(classification.dateRange, businessTimezone)
    BQD-->>BQH: { startDate, endDate, periodLabel }

    BQH->>BQS: executeQuery(expense_total, businessId, currency, dateRange, period)
    BQS->>DB: aggregate([{ $match: { businessId, type: EXPENSE, status: CONFIRMED, date: range } }, { $group: { totalAmountMinor: { $sum } } }])
    DB-->>BQS: [{ totalAmountMinor: 125000, count: 23 }]
    BQS-->>BQH: BusinessQueryResult

    BQH->>RSP: formatResponse(queryType, result, period)
    RSP-->>BQH: "Your total expenses this month are LKR 125,000 across 23 transactions."
    BQH-->>AI: { answer }
    AI-->>MS: { proposal: null, reply: "Your total expenses..." }
    MS->>MS: sendReply(connection, senderPhone, reply)
    MS->>User: WhatsApp message with answer
```

### Code References

| Step | File | Line(s) |
|------|------|---------|
| Intent detection | `ai-extraction.service.ts:81-89` | `if (extractionResult.intent === AiIntent.BUSINESS_QUERY)` |
| Question handler | `business-query.handler.ts` | `handleQuestion()` |
| LLM classifier | `business-query-classifier.service.ts:19-73` | `classify()` — calls OpenAI with structured classifier prompt |
| Fallback classifier | `business-query-classifier.service.ts:172-210` | `fallbackClassification()` — keyword-based when API unavailable |
| Date resolution | `business-query-date.service.ts` | `resolveDateRange()` — preset → concrete startDate/endDate |
| Query execution | `business-query.service.ts:35-77` | `executeQuery()` — switch on `BusinessQueryType` |
| MongoDB aggregations | `business-query.service.ts:79-681` | Individual methods: `getExpenseTotal`, `getIncomeTotal`, `getNetCashFlow`, etc. |
| Response formatting | `business-query-response.service.ts` | `formatResponse()` — natural language response |
| Query types enum | `business-query.enums.ts` | 12 query types: expense_total, income_total, net_cash_flow, transaction_count, expense_category_breakdown, income_category_breakdown, outstanding_amount, outstanding_invoices, overdue_invoices, unpaid_customers, invoice_status, recent_transactions |

---

## 6. Manual Transaction Flow

**Entry point**: `POST /api/transactions` (Dashboard form submission)

```mermaid
sequenceDiagram
    participant Client as Dashboard Client
    participant TC as TransactionsController
    participant TS as TransactionsService
    participant VAL as ValidationPipe
    participant AUD as AuditService
    participant DB as MongoDB

    Client->>TC: POST /api/transactions (CreateTransactionDto)
    TC->>VAL: ValidationPipe.validate(CreateTransactionDto)
    Note over VAL: whitelist, transform, forbidNonWhitelisted
    VAL-->>TC: Validated DTO

    TC->>TS: create(businessId, userId, dto)
    TS->>DB: create(Transaction {
        businessId,
        type: INCOME/EXPENSE,
        amountMinor,
        currency,
        categoryId,
        customerId?,
        date,
        description?,
        notes?,
        paymentMethod?,
        source: MANUAL,
        status: CONFIRMED,
        createdByUserId: userId,
        confirmedByUserId: userId,
        confirmedAt: now
    })

    TS->>AUD: log({
        businessId,
        userId,
        entityType: 'transaction',
        entityId: transaction._id,
        action: 'created',
        newValues: { type, amountMinor, currency, categoryId, date, ... }
    })

    TS-->>Client: Transaction (CONFIRMED)

    Note over Client,DB: Dashboard/Reports Update
    Client->>Client: Refetch transactions list
    Client->>Client: Update dashboard summary (income/expense totals)
    Client->>Client: Update reports (category breakdown, cash flow)
```

### Code References

| Step | File | Line(s) |
|------|------|---------|
| Controller | `transactions.controller.ts` | `POST /transactions` |
| DTO validation | `transactions/dto/create-transaction.dto.ts` | class-validator decorators |
| Global ValidationPipe | `main.ts:67-74` | `whitelist`, `transform`, `forbidNonWhitelisted` |
| Transaction schema | `transaction.schema.ts` | `amountMinor` (min: 1), `type` enum, `source` enum, `status` enum |
| Source enum | `transaction-source.enum.ts` | `MANUAL`, `WHATSAPP` |
| Status enum | `transaction-status.enum.ts` | `CONFIRMED`, `VOIDED` |
| Audit logging | `audit.service.ts` | Creates `audit_logs` entry with `oldValues`/`newValues` |
| Soft void | `transaction.schema.ts:64-70` | `voidedAt`, `voidedByUserId`, `voidReason` — never hard delete |
