import "dotenv/config";
import mongoose from "mongoose";

type Severity = "critical" | "important" | "minor";

interface RequiredIndex {
  collection: string;
  keys: Record<string, 1 | -1>;
  unique?: boolean;
  name: string;
  severity: Severity;
}

const REQUIRED_INDEXES: RequiredIndex[] = [
  // users
  {
    collection: "users",
    keys: { email: 1 },
    unique: true,
    name: "email_unique",
    severity: "critical",
  },

  // businesses
  {
    collection: "businesses",
    keys: { slug: 1 },
    unique: true,
    name: "slug_unique",
    severity: "critical",
  },

  // business_members
  {
    collection: "business_members",
    keys: { userId: 1, businessId: 1 },
    unique: true,
    name: "userId_businessId_unique",
    severity: "critical",
  },
  {
    collection: "business_members",
    keys: { businessId: 1, role: 1 },
    name: "businessId_role",
    severity: "important",
  },

  // transactions
  {
    collection: "transactions",
    keys: { businessId: 1, date: -1 },
    name: "businessId_date",
    severity: "critical",
  },
  {
    collection: "transactions",
    keys: { businessId: 1, type: 1, status: 1 },
    name: "businessId_type_status",
    severity: "important",
  },
  {
    collection: "transactions",
    keys: { businessId: 1, createdAt: -1 },
    name: "businessId_createdAt",
    severity: "important",
  },

  // categories
  {
    collection: "categories",
    keys: { businessId: 1, type: 1 },
    name: "businessId_type",
    severity: "important",
  },

  // customers
  {
    collection: "customers",
    keys: { businessId: 1, email: 1 },
    name: "businessId_email",
    severity: "important",
  },
  {
    collection: "customers",
    keys: { businessId: 1, name: 1 },
    name: "businessId_name",
    severity: "minor",
  },

  // invoices
  {
    collection: "invoices",
    keys: { businessId: 1, status: 1 },
    name: "businessId_status",
    severity: "important",
  },
  {
    collection: "invoices",
    keys: { businessId: 1, customerId: 1 },
    name: "businessId_customerId",
    severity: "important",
  },
  {
    collection: "invoices",
    keys: { businessId: 1, invoiceNumber: 1 },
    unique: true,
    name: "businessId_invoiceNumber_unique",
    severity: "critical",
  },

  // invoice_items
  {
    collection: "invoice_items",
    keys: { invoiceId: 1 },
    name: "invoiceId",
    severity: "critical",
  },

  // payments
  {
    collection: "payments",
    keys: { businessId: 1, date: -1 },
    name: "businessId_date",
    severity: "important",
  },
  {
    collection: "payments",
    keys: { invoiceId: 1, status: 1 },
    name: "invoiceId_status",
    severity: "important",
  },

  // message_events
  {
    collection: "message_events",
    keys: { providerMessageId: 1 },
    unique: true,
    name: "providerMessageId_unique",
    severity: "critical",
  },
  {
    collection: "message_events",
    keys: { businessId: 1, createdAt: -1 },
    name: "businessId_createdAt",
    severity: "important",
  },

  // aiproposals
  {
    collection: "aiproposals",
    keys: { businessId: 1, status: 1 },
    name: "businessId_status",
    severity: "important",
  },
  {
    collection: "aiproposals",
    keys: { providerMessageId: 1 },
    name: "providerMessageId",
    severity: "minor",
  },

  // reminders
  {
    collection: "reminders",
    keys: { invoiceId: 1, trigger: 1, status: 1 },
    unique: true,
    name: "invoiceId_trigger_status_unique",
    severity: "critical",
  },
  {
    collection: "reminders",
    keys: { businessId: 1, status: 1 },
    name: "businessId_status",
    severity: "important",
  },

  // financial_summaries
  {
    collection: "financial_summaries",
    keys: { businessId: 1, periodStart: -1, frequency: 1 },
    name: "businessId_periodStart_frequency",
    severity: "important",
  },

  // audit_logs
  {
    collection: "audit_logs",
    keys: { businessId: 1, createdAt: -1 },
    name: "businessId_createdAt",
    severity: "important",
  },

  // auth_sessions
  {
    collection: "auth_sessions",
    keys: { userId: 1 },
    name: "userId",
    severity: "important",
  },
  {
    collection: "auth_sessions",
    keys: { expiresAt: 1 },
    name: "expiresAt_ttl",
    severity: "minor",
  },
];

interface IndexInfo {
  name: string;
  key: Record<string, unknown>;
  unique?: boolean;
}

function indexKeyMatch(
  existing: Record<string, unknown>,
  required: Record<string, 1 | -1>,
): boolean {
  const reqKeys = Object.keys(required);
  const exKeys = Object.keys(existing);
  if (reqKeys.length !== exKeys.length) return false;
  return reqKeys.every((k) => existing[k] === required[k]);
}

function indexesOverlap(
  existing: IndexInfo[],
  required: RequiredIndex,
): boolean {
  return existing.some((idx) => {
    if (!indexKeyMatch(idx.key, required.keys)) return false;
    if (required.unique && !idx.unique) return false;
    return true;
  });
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected.\n");

  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();

  console.log("=== Collections Found ===");
  for (const col of collections) {
    const indexes = await db.collection(col.name).listIndexes().toArray();
    console.log(`\n  ${col.name} (${indexes.length} indexes)`);
    for (const idx of indexes) {
      const flags: string[] = [];
      if (idx.unique) flags.push("unique");
      if (idx.expireAfterSeconds != null)
        flags.push(`TTL=${idx.expireAfterSeconds}s`);
      console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}${flags.length ? ` [${flags.join(", ")}]` : ""}`);
    }
  }

  console.log("\n\n=== Index Verification ===\n");

  const missingBySeverity: Record<Severity, RequiredIndex[]> = {
    critical: [],
    important: [],
    minor: [],
  };
  const existingCollections = new Set(collections.map((c) => c.name));

  for (const req of REQUIRED_INDEXES) {
    if (!existingCollections.has(req.collection)) {
      missingBySeverity[req.severity].push(req);
      console.log(
        `  [${req.severity.toUpperCase()}] Collection "${req.collection}" does not exist — index "${req.name}" cannot be verified`,
      );
      continue;
    }

    const indexes = await db
      .collection(req.collection)
      .listIndexes()
      .toArray();

    if (indexesOverlap(indexes, req)) {
      console.log(
        `  [OK] ${req.collection}.${req.name} — ${JSON.stringify(req.keys)}${req.unique ? " (unique)" : ""}`,
      );
    } else {
      missingBySeverity[req.severity].push(req);
      console.log(
        `  [MISSING] ${req.collection}.${req.name} — ${JSON.stringify(req.keys)}${req.unique ? " (unique)" : ""}`,
      );
    }
  }

  console.log("\n\n=== Summary ===\n");
  const total =
    missingBySeverity.critical.length +
    missingBySeverity.important.length +
    missingBySeverity.minor.length;

  if (total === 0) {
    console.log("All required indexes are present.");
  } else {
    console.log(
      `Missing ${total} index(es): ${missingBySeverity.critical.length} critical, ${missingBySeverity.important.length} important, ${missingBySeverity.minor.length} minor`,
    );
    if (missingBySeverity.critical.length > 0) {
      console.log("\nCritical missing indexes:");
      for (const idx of missingBySeverity.critical) {
        console.log(
          `  - ${idx.collection}.${idx.name}: ${JSON.stringify(idx.keys)}${idx.unique ? " (unique)" : ""}`,
        );
      }
    }
    if (missingBySeverity.important.length > 0) {
      console.log("\nImportant missing indexes:");
      for (const idx of missingBySeverity.important) {
        console.log(
          `  - ${idx.collection}.${idx.name}: ${JSON.stringify(idx.keys)}${idx.unique ? " (unique)" : ""}`,
        );
      }
    }
    if (missingBySeverity.minor.length > 0) {
      console.log("\nMinor missing indexes:");
      for (const idx of missingBySeverity.minor) {
        console.log(
          `  - ${idx.collection}.${idx.name}: ${JSON.stringify(idx.keys)}${idx.unique ? " (unique)" : ""}`,
        );
      }
    }
  }

  await mongoose.disconnect();
  process.exit(total > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
