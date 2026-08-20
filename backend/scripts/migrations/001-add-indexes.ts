import type { Db } from "mongodb";

interface IndexSpec {
  collection: string;
  index: Record<string, 1 | -1>;
  options?: Record<string, unknown>;
}

const INDEXES: IndexSpec[] = [
  // users
  {
    collection: "users",
    index: { email: 1 },
    options: { unique: true, name: "email_unique" },
  },

  // businesses
  {
    collection: "businesses",
    index: { slug: 1 },
    options: { unique: true, name: "slug_unique" },
  },

  // business_members
  {
    collection: "business_members",
    index: { userId: 1, businessId: 1 },
    options: { unique: true, name: "userId_businessId_unique" },
  },
  {
    collection: "business_members",
    index: { businessId: 1, role: 1 },
    options: { name: "businessId_role" },
  },

  // transactions
  {
    collection: "transactions",
    index: { businessId: 1, date: -1 },
    options: { name: "businessId_date" },
  },
  {
    collection: "transactions",
    index: { businessId: 1, type: 1, status: 1 },
    options: { name: "businessId_type_status" },
  },
  {
    collection: "transactions",
    index: { businessId: 1, createdAt: -1 },
    options: { name: "businessId_createdAt" },
  },

  // categories
  {
    collection: "categories",
    index: { businessId: 1, type: 1 },
    options: { name: "businessId_type" },
  },

  // customers
  {
    collection: "customers",
    index: { businessId: 1, email: 1 },
    options: { name: "businessId_email" },
  },
  {
    collection: "customers",
    index: { businessId: 1, name: 1 },
    options: { name: "businessId_name" },
  },

  // invoices
  {
    collection: "invoices",
    index: { businessId: 1, status: 1 },
    options: { name: "businessId_status" },
  },
  {
    collection: "invoices",
    index: { businessId: 1, customerId: 1 },
    options: { name: "businessId_customerId" },
  },
  {
    collection: "invoices",
    index: { businessId: 1, invoiceNumber: 1 },
    options: { unique: true, name: "businessId_invoiceNumber_unique" },
  },

  // invoice_items
  {
    collection: "invoice_items",
    index: { invoiceId: 1 },
    options: { name: "invoiceId" },
  },

  // payments
  {
    collection: "payments",
    index: { businessId: 1, date: -1 },
    options: { name: "businessId_date" },
  },
  {
    collection: "payments",
    index: { invoiceId: 1, status: 1 },
    options: { name: "invoiceId_status" },
  },

  // message_events
  {
    collection: "message_events",
    index: { providerMessageId: 1 },
    options: { unique: true, name: "providerMessageId_unique" },
  },
  {
    collection: "message_events",
    index: { businessId: 1, createdAt: -1 },
    options: { name: "businessId_createdAt" },
  },

  // aiproposals
  {
    collection: "aiproposals",
    index: { businessId: 1, status: 1 },
    options: { name: "businessId_status" },
  },
  {
    collection: "aiproposals",
    index: { providerMessageId: 1 },
    options: { name: "providerMessageId" },
  },

  // reminders
  {
    collection: "reminders",
    index: { invoiceId: 1, trigger: 1, status: 1 },
    options: { unique: true, name: "invoiceId_trigger_status_unique" },
  },
  {
    collection: "reminders",
    index: { businessId: 1, status: 1 },
    options: { name: "businessId_status" },
  },

  // financial_summaries
  {
    collection: "financial_summaries",
    index: { businessId: 1, periodStart: -1, frequency: 1 },
    options: { name: "businessId_periodStart_frequency" },
  },

  // audit_logs
  {
    collection: "audit_logs",
    index: { businessId: 1, createdAt: -1 },
    options: { name: "businessId_createdAt" },
  },

  // auth_sessions
  {
    collection: "auth_sessions",
    index: { userId: 1 },
    options: { name: "userId" },
  },
  {
    collection: "auth_sessions",
    index: { expiresAt: 1 },
    options: { name: "expiresAt_ttl", expireAfterSeconds: 0 },
  },
];

export async function up(db: Db): Promise<void> {
  for (const spec of INDEXES) {
    await db.collection(spec.collection).createIndex(spec.index, {
      background: true,
      ...spec.options,
    });
    console.log(`  Created index "${spec.options?.name ?? "unknown"}" on ${spec.collection}`);
  }
  console.log(`\nEnsured ${INDEXES.length} indexes.`);
}

export async function down(db: Db): Promise<void> {
  for (const spec of INDEXES) {
    const name = spec.options?.name as string | undefined;
    if (name) {
      await db.collection(spec.collection).dropIndex(name).catch(() => {
        console.log(`  Index "${name}" on ${spec.collection} does not exist, skipping`);
      });
    }
  }
  console.log(`Dropped ${INDEXES.length} indexes.`);
}
