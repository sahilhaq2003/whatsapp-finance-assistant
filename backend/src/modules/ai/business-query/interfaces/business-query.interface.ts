import { BusinessQueryType, DateRangePreset } from '../../enums/business-query.enums';

export interface BusinessQueryClassification {
  intent: 'business_query';
  queryType: BusinessQueryType;
  confidence: number;
  dateRange?: {
    preset?: DateRangePreset | string;
    startDate?: string | null;
    endDate?: string | null;
  };
  customerName?: string | null;
  invoiceNumber?: string | null;
  limit?: number | null;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ResolvedDateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface BusinessQueryResult<T = unknown> {
  queryType: BusinessQueryType;
  currency: string;
  period?: ResolvedDateRange;
  data: T;
}

export interface IncomeExpenseTotalResult {
  amountMinor: number;
  amountDisplay: number;
  currency: string;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryName: string;
  categoryId: string;
  amountMinor: number;
  amountDisplay: number;
}

export interface CategoryBreakdownResult {
  categories: CategoryBreakdownItem[];
  totalMinor: number;
}

export interface OutstandingCustomerItem {
  customerId: string;
  customerName: string;
  outstandingAmountMinor: number;
  outstandingAmountDisplay: number;
  invoiceCount: number;
}

export interface OutstandingInvoiceItem {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  totalMinor: number;
  remainingMinor: number;
  dueDate?: string;
  isOverdue: boolean;
}

export interface InvoiceStatusResult {
  invoiceNumber: string;
  customerName: string;
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  paymentStatus: string;
  dueDate?: string;
  isOverdue: boolean;
  currency: string;
}

export interface RecentTransactionItem {
  id: string;
  type: string;
  amountMinor: number;
  amountDisplay: number;
  currency: string;
  description?: string;
  categoryName: string;
  date: string;
}

export interface NetCashFlowResult {
  incomeAmountMinor: number;
  incomeAmountDisplay: number;
  expenseAmountMinor: number;
  expenseAmountDisplay: number;
  netCashFlowMinor: number;
  netCashFlowDisplay: number;
  currency: string;
}

export interface TransactionCountResult {
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
}
