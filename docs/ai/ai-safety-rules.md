# AI Safety Rules

These rules enforce safety invariants across the AI financial assistant. They are implemented at the application layer and cannot be overridden by prompt content.

---

## 1. No Direct Financial Writes

AI never creates a `Transaction` record directly. It creates an `AiProposal` first. A `Transaction` is only created upon explicit user confirmation through the proposal review flow.

**Why:** Prevents unverified AI output from affecting the financial ledger.

---

## 2. Schema Validation

Every AI output is validated against the `ProposalParsedData` schema before persistence. If the LLM returns data that does not conform to the expected structure, it is rejected.

**Why:** Catches malformed LLM output (wrong types, missing fields, unexpected values).

---

## 3. Confidence Threshold

Below **0.75** confidence triggers `NEEDS_CLARIFICATION` status. The system does not guess when uncertain.

**Why:** Prevents low-confidence extractions from appearing as confirmed records.

---

## 4. Duplicate Protection

- `findActiveProposal()` checks for an existing active proposal before creating a new one.
- Confirmation checks that proposal status is `PENDING` before allowing the state transition.

**Why:** Prevents duplicate transactions from repeated user messages or race conditions.

---

## 5. Expiry

Proposals expire after **30 minutes** via a MongoDB TTL index. Stale proposals do not linger in the system.

**Why:** Prevents accumulation of unconfirmed proposals and reduces the window for confusion.

---

## 6. Category / Customer Resolution

- **Category:** Falls back to `"Other {type}"` if no business category matches the extracted description.
- **Customer:** Returns `null` if the customer name is ambiguous or does not match any known customer.

**Why:** Ensures every record has a valid category. Avoids false customer attribution.

---

## 7. Business Query Isolation

Only **13 allow-listed query types** are permitted (defined in `BusinessQueryType` enum). Each type maps to a fixed MongoDB aggregation pipeline. No free-form queries are executed.

**Why:** Prevents prompt injection from reading arbitrary data or executing unintended database operations.

---

## 8. Voice Quality Gate

The voice feature is **opt-in per business** via the `business.features.voiceInput` flag. Businesses that have not enabled voice input cannot use voice-based extraction.

**Why:** Ensures voice processing is only active for businesses that have validated it works for their use case.

---

## 9. Amount Safety

- Amount must be **> 0** (positive).
- Amount must be **finite** (not `Infinity`, not `NaN`).
- Currency is validated against the business's `baseCurrency`.

**Why:** Prevents zero-value, negative-value, or infinite-value transactions.

---

## 10. Date Safety

- Date must be a **valid `Date`** object.
- Defaults to the **current date** if the AI cannot parse a date from the user message.

**Why:** Ensures every transaction has a valid timestamp. Prevents epoch zero or garbage dates.

---

## 11. Offline Fallback

When the OpenAI API is unavailable:

- **Regex-based extraction** handles basic expense/income patterns.
- Proposals are still created and still require user confirmation.
- Accuracy is lower, but functionality is preserved.

**Why:** Ensures the system degrades gracefully rather than failing completely.
