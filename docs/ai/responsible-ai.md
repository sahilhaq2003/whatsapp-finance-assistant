# Responsible AI

## Core Principle

> AI is an interpretation and assistance layer. AI is not the financial source of truth.

---

## Human-In-The-Loop

The financial data flow ensures human oversight at every step:

1. **AI Financial Extraction** — User sends a message (text or voice) describing a financial event.
2. **Proposal Created** — AI interprets the message and creates an `AiProposal` with extracted fields: type, amount, category, date, description, customer.
3. **User Reviews** — The user sees the interpreted proposal with all extracted fields displayed.
4. **User Acts** — The user can **confirm**, **edit**, or **reject** the proposal.
5. **Commit** — Only a confirmed proposal results in a `Transaction` record being committed to the database.

**Reference:** `ai-proposal.service.ts` — `confirmProposal()`

AI never bypasses this loop. There is no path from user message to financial record that does not pass through explicit user confirmation.

---

## Grounding

For financial questions (e.g., "How much did I earn this month?"):

1. AI classifies the question into one of **13 defined question types**.
2. The backend retrieves or calculates the financial result via MongoDB aggregation pipelines.
3. AI synthesizes the retrieved data into a natural language response.

AI does not invent business totals, balances, or figures. Every number in a financial response originates from database aggregation, not from the language model.

**References:**
- `business-query.service.ts` — Query classification and execution
- `business-query-response.service.ts` — Response synthesis

---

## Validation

Deterministic validation is applied to every AI-extracted financial record in `ai-validation.service.ts`:

| Field | Validation Rule |
|-------|----------------|
| `type` | Must be `income` or `expense` |
| `amount` | Must be a positive finite number (`> 0`, `isFinite`) |
| `date` | Must be a valid `Date` object |
| `paymentMethod` | Validated against the allowed enum values |
| `category` | Resolved via regex match against business categories; falls back to `"Other {type}"` |
| `customer` | Resolved via regex against known customers; returns `null` if ambiguous |

Validation is deterministic — it does not depend on the LLM and is not subject to model variance.

---

## Low Confidence

When the AI's confidence in its extraction falls below the **minimum threshold of 0.75**:

- The proposal receives a status of `NEEDS_CLARIFICATION`.
- The user is asked a clarification question to resolve ambiguity.
- No financial record is created until confidence is sufficient and the user confirms.

Low confidence is not overridden or silently accepted. The system errs on the side of asking rather than guessing.

---

## Corrections

When a user corrects a previous extraction (e.g., "No, it was 2000 not 20000"):

1. `processCorrection()` in `ai-extraction.service.ts` is invoked.
2. A correction prompt is built combining the **original message text**, the **existing extraction**, and the **correction text**.
3. The LLM is re-called with this combined context.
4. The same proposal is updated with the revised extraction (revision history is maintained).
5. No duplicate transaction is created.

The correction flow modifies the existing proposal in place rather than creating a new one.

---

## Prompt Injection Boundary

The AI operates within strict boundaries. It cannot:

| Boundary | Enforcement |
|----------|------------|
| Choose `businessId` | Set by business context middleware, not by the prompt |
| Choose `userId` | Set by JWT authentication |
| Execute arbitrary MongoDB queries | Only 13 allow-listed query types via `BusinessQueryType` enum |
| Receive database credentials | Never included in prompt context |
| Receive auth tokens | Never included in prompt context |
| Write financial records directly | Requires explicit user confirmation via proposal flow |

These boundaries are enforced at the application layer, not by prompt instructions. Even a fully compromised prompt cannot bypass them.

---

## Proposal State Machine

```
                    ┌──────────────┐
                    │    PENDING    │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────────────┐
      │ CONFIRMED │  │ REJECTED │  │ NEEDS_CLARIFICATION │
      └──────────┘  └──────────┘  └────────┬─────────┘
                                           │
                                    user provides
                                    clarification
                                           │
                                           ▼
                                     ┌──────────┐
                                     │  PENDING  │
                                     └──────────┘

  Any state ──user edits──▶ PENDING
  PENDING ──30 min TTL──▶ EXPIRED
```

| Transition | Trigger |
|-----------|---------|
| `PENDING` → `CONFIRMED` | User confirms the proposal |
| `PENDING` → `REJECTED` | User rejects the proposal |
| `PENDING` → `NEEDS_CLARIFICATION` | Low confidence or missing required fields |
| `NEEDS_CLARIFICATION` → `PENDING` | User provides the requested clarification |
| `PENDING` → `EXPIRED` | 30-minute TTL index expires the proposal |
| `Any state` → `PENDING` | User edits the proposal (resets to pending for re-review) |
