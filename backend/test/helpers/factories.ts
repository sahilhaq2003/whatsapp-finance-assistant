import { Connection, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export function createObjectId(): Types.ObjectId {
  return new Types.ObjectId();
}

export function createTestData() {
  const userId = createObjectId();
  const businessId = createObjectId();
  const categoryId = createObjectId();
  const customerId = createObjectId();
  const invoiceId = createObjectId();

  return { userId, businessId, categoryId, customerId, invoiceId };
}

export async function createUser(conn: Connection, overrides: Record<string, unknown> = {}) {
  const hash = await bcrypt.hash('TestPassword123!', 4);
  const user = {
    _id: createObjectId(),
    email: `test-${Date.now()}@example.com`,
    phone: `+9477${Math.floor(1000000 + Math.random() * 9000000)}`,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: hash,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.users.insertOne(user);
  return user;
}

export async function createBusiness(conn: Connection, overrides: Record<string, unknown> = {}) {
  const business = {
    _id: createObjectId(),
    name: `Test Business ${Date.now()}`,
    slug: `test-biz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    country: 'LK',
    baseCurrency: 'LKR',
    timezone: 'Asia/Colombo',
    status: 'active',
    planCode: 'free',
    features: {},
    usageLimits: {},
    createdByUserId: createObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.businesses.insertOne(business);
  return business;
}

export async function createBusinessMember(conn: Connection, userId: Types.ObjectId, businessId: Types.ObjectId, role = 'owner') {
  const member = {
    _id: createObjectId(),
    userId,
    businessId,
    role,
    status: 'active',
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await conn.collections.business_members.insertOne(member);
  return member;
}

export async function createCategory(conn: Connection, businessId: Types.ObjectId, type = 'expense', name?: string) {
  const category = {
    _id: createObjectId(),
    businessId,
    name: name || `Test ${type} category ${Date.now()}`,
    type,
    isSystem: false,
    isActive: true,
    createdByUserId: createObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await conn.collections.categories.insertOne(category);
  return category;
}

export async function createTransaction(conn: Connection, overrides: Record<string, unknown> = {}) {
  const tx = {
    _id: createObjectId(),
    type: 'expense',
    amountMinor: 50000,
    currency: 'LKR',
    date: new Date(),
    status: 'confirmed',
    source: 'manual',
    description: 'Test transaction',
    createdByUserId: createObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.transactions.insertOne(tx);
  return tx;
}

export async function createCustomer(conn: Connection, businessId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  const customer = {
    _id: createObjectId(),
    businessId,
    name: `Customer ${Date.now()}`,
    status: 'active',
    createdByUserId: createObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.customers.insertOne(customer);
  return customer;
}

export async function createInvoice(conn: Connection, businessId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  const invoice = {
    _id: createObjectId(),
    businessId,
    customerId: createObjectId(),
    invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    currency: 'LKR',
    status: 'draft',
    paymentStatus: 'unpaid',
    subtotalMinor: 0,
    totalMinor: 0,
    customerSnapshot: { name: 'Test Customer' },
    createdByUserId: createObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.invoices.insertOne(invoice);
  return invoice;
}

export async function createPayment(conn: Connection, overrides: Record<string, unknown> = {}) {
  const payment = {
    _id: createObjectId(),
    amountMinor: 10000,
    currency: 'LKR',
    date: new Date(),
    method: 'cash',
    status: 'confirmed',
    createdByUserId: createObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.payments.insertOne(payment);
  return payment;
}

export async function createAIProposal(conn: Connection, overrides: Record<string, unknown> = {}) {
  const proposal = {
    _id: createObjectId(),
    status: 'pending',
    extractedData: {
      type: 'expense',
      amount: 5000,
      currency: 'LKR',
      description: 'Test proposal',
      confidence: 0.85,
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  await conn.collections.aiproposals.insertOne(proposal);
  return proposal;
}
