### ADR-001: MongoDB as Primary Database

**Status:** Accepted

**Context:**
The original Dulan Progiciel brief recommends PostgreSQL as the primary relational system of record for financial data. The project uses MongoDB (via Mongoose ODM) instead.

**Original Brief Recommendation:**
PostgreSQL for ACID transactions, relational integrity, and financial data consistency.

**Project Decision:**
MongoDB as the primary database with Mongoose ODM for schema validation and middleware.

**Reason for Decision:**
1. Rapid prototyping: MongoDB's flexible schema allowed faster iteration during MVP development
2. Document model: Natural fit for embedded snapshots (customerSnapshot in invoices, parsedData in proposals)
3. Aggregation pipeline: Powerful enough for the 13 business query types without JOIN operations
4. MongoDB Atlas: Managed service with built-in replication, backup, and monitoring
5. Team familiarity: Faster development with document model for this team

**Benefits:**
- Schema flexibility for evolving data models during MVP
- Embedded documents reduce need for JOINs (e.g., invoice line items, customer snapshots)
- TTL indexes for automatic cleanup (auth sessions, pairing codes, proposals)
- Compound unique indexes for multi-tenant constraints
- MongoDB Atlas provides managed infrastructure

**Risks:**
1. No native ACID transactions across collections (single-document atomicity only)
2. No foreign key constraints (enforced at application level)
3. No JOIN operations (requires application-level lookups or aggregation pipeline)
4. Financial audit concerns (auditors may expect relational guarantees)
5. Potential data integrity issues without database-level constraints

**Mitigations Implemented:**
1. **businessId on tenant records**: 18 of 27 collections are tenant-scoped via businessId field
2. **Compound unique indexes**: Prevent cross-business duplicates (e.g., {businessId, invoiceNumber}, {businessId, name, type} for categories)
3. **ObjectId/business ownership validation**: BusinessAccessGuard validates membership before any financial operation
4. **Integer amountMinor storage**: All monetary values stored as integers (no floating-point precision issues)
5. **Atomic invoice counter**: InvoiceCounter uses findOneAndUpdate with $inc for sequential invoice numbers
6. **Webhook idempotency**: providerMessageId unique compound index prevents duplicate message processing
7. **Proposal idempotency**: findActiveProposal() prevents multiple active proposals per user
8. **Payment validation**: Overpayment rejection, balance recalculation on void
9. **Atomic usage counters**: UsageCounter uses $inc with upsert for concurrent-safe quota tracking
10. **Soft void**: Financial records use void workflow (status change + audit trail) instead of physical deletion
11. **Audit logging**: All financial mutations logged to append-only audit_logs collection
12. **Status-based state machines**: Transaction, Invoice, Payment, Proposal all use status enums with validated transitions

**Concurrency Controls:**
- Single-document atomic operations (MongoDB guarantee)
- findOneAndUpdate with $inc for counters (atomic increment)
- Unique compound indexes prevent concurrent duplicate creation
- No cross-collection transactions (mitigated by application-level consistency)

**Known Trade-offs:**
- Cannot guarantee atomicity across multiple collections (e.g., payment + invoice update)
- No database-level foreign key constraints (application must validate relationships)
- Aggregation pipeline is less efficient than SQL JOINs for complex queries
- Schema migrations require application-level handling (no ALTER TABLE)
- Financial auditors may require additional documentation for MongoDB compliance

**Future Re-evaluation Conditions:**
- If regulatory requirements mandate ACID across collections
- If financial audit requires relational guarantees
- If query complexity exceeds MongoDB aggregation pipeline capabilities
- If team size grows and SQL expertise becomes available

**Conclusion:**
This is an intentional architectural deviation with compensating controls. MongoDB does not provide identical relational guarantees to PostgreSQL. The mitigations implemented (tenant isolation, atomic counters, audit logging, soft void) provide sufficient integrity for the MVP scope. The decision should be re-evaluated if regulatory or audit requirements change.
