export interface BusinessQueryClassification {
  intent: string;
  queryType: string;
  confidence: number;
}

export interface BusinessQueryResult {
  queryType: string;
  currency: string;
  period?: {
    startDate: string;
    endDate: string;
    label: string;
  };
  data: unknown;
}

export interface BusinessQueryResponse {
  queryType: string;
  answer: string;
  result: BusinessQueryResult;
}

export interface IncomeExpenseTotalData {
  amountMinor: number;
  amountDisplay: number;
  currency: string;
  transactionCount: number;
}

export interface NetCashFlowData {
  incomeAmountMinor: number;
  incomeAmountDisplay: number;
  expenseAmountMinor: number;
  expenseAmountDisplay: number;
  netCashFlowMinor: number;
  netCashFlowDisplay: number;
  currency: string;
}

export interface TransactionCountData {
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
}

export interface CategoryBreakdownData {
  categories: Array<{
    categoryName: string;
    categoryId: string;
    amountMinor: number;
    amountDisplay: number;
  }>;
  totalMinor: number;
}

export interface OutstandingAmountData {
  amountMinor: number;
  amountDisplay: number;
  currency: string;
  outstandingInvoiceCount: number;
}

export interface OutstandingInvoicesData {
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    totalMinor: number;
    remainingMinor: number;
    dueDate?: string;
    isOverdue: boolean;
  }>;
  count: number;
  totalOutstandingMinor: number;
  totalOutstandingDisplay: number;
  currency: string;
}

export interface OverdueInvoicesData {
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    remainingMinor: number;
    dueDate?: string;
  }>;
  count: number;
  totalOverdueMinor: number;
  totalOverdueDisplay: number;
  currency: string;
}

export interface UnpaidCustomersData {
  customers: Array<{
    customerId: string;
    customerName: string;
    outstandingAmountMinor: number;
    outstandingAmountDisplay: number;
    invoiceCount: number;
  }>;
  totalCount: number;
  totalOutstandingMinor: number;
  totalOutstandingDisplay: number;
  currency: string;
}

export interface InvoiceStatusData {
  found: boolean;
  invoiceNumber: string;
  customerName?: string;
  totalMinor?: number;
  paidMinor?: number;
  remainingMinor?: number;
  paymentStatus?: string;
  dueDate?: string;
  isOverdue?: boolean;
  currency?: string;
  message?: string;
}

export interface RecentTransactionsData {
  transactions: Array<{
    id: string;
    type: string;
    amountMinor: number;
    amountDisplay: number;
    currency: string;
    description?: string;
    categoryName: string;
    date: string;
  }>;
  count: number;
}

export interface SuggestedQuestion {
  label: string;
  question: string;
}
