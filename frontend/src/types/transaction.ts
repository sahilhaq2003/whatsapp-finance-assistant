export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum TransactionStatus {
  PROPOSED = 'proposed',
  CONFIRMED = 'confirmed',
  VOIDED = 'voided',
}

export enum TransactionSource {
  MANUAL = 'manual',
  WHATSAPP_TEXT = 'whatsapp_text',
  WHATSAPP_VOICE = 'whatsapp_voice',
  IMPORT = 'import',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  MOBILE_PAYMENT = 'mobile_payment',
  OTHER = 'other',
}

export interface TransactionCategory {
  _id: string;
  name: string;
  type: string;
}

export interface TransactionCustomer {
  _id: string;
  name: string;
}

export interface Transaction {
  _id: string;
  businessId: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  categoryId: TransactionCategory | string;
  customerId?: TransactionCustomer | string;
  date: string;
  description?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  source: TransactionSource;
  status: TransactionStatus;
  createdByUserId: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
  voidedAt?: string;
  voidedByUserId?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  income: number;
  expenses: number;
  netCashFlow: number;
  currency: string;
  transactionCount: number;
}

export interface CategorySummaryItem {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  categoryId: string;
  customerId?: string;
  date: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  type?: TransactionType;
  amount?: number;
  categoryId?: string;
  customerId?: string;
  date?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface VoidTransactionRequest {
  reason?: string;
}
