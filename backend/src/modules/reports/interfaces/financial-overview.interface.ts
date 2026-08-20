export interface FinancialOverviewResult {
  period: { startDate: string; endDate: string };
  currency: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  transactionCount: number;
  outstandingAmount: number;
  outstandingInvoiceCount: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
}

export interface IncomeVsExpenseSeries {
  period: string;
  income: number;
  expenses: number;
}

export interface IncomeVsExpenseResult {
  currency: string;
  totals: { income: number; expenses: number; netCashFlow: number };
  series: IncomeVsExpenseSeries[];
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface CategoryBreakdownResult {
  type: string;
  currency: string;
  total: number;
  categories: CategoryBreakdownItem[];
}

export interface TransactionReportRow {
  _id: string;
  date: string;
  type: string;
  description: string;
  customerName: string;
  categoryName: string;
  paymentMethod: string;
  amount: number;
  status: string;
  source: string;
}

export interface TransactionReportResult {
  currency: string;
  transactions: TransactionReportRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CustomerReportRow {
  customerId: string;
  customerName: string;
  confirmedIncome: number;
  transactionCount: number;
  invoiceCount: number;
  outstandingAmount: number;
  overdueAmount: number;
  lastActivityDate: string | null;
}

export interface CustomerReportResult {
  currency: string;
  customers: CustomerReportRow[];
}

export interface OutstandingInvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  paid: number;
  remaining: number;
  paymentStatus: string;
  isOverdue: boolean;
}

export interface OutstandingInvoiceResult {
  currency: string;
  summary: { outstandingAmount: number; invoiceCount: number };
  invoices: OutstandingInvoiceRow[];
}

export interface AgingBuckets {
  '1to7': number;
  '8to30': number;
  '31to60': number;
  '61plus': number;
}

export interface OverdueInvoiceResult {
  currency: string;
  summary: { overdueAmount: number; invoiceCount: number };
  aging: AgingBuckets;
  invoices: OutstandingInvoiceRow[];
}

export interface PaymentReportRow {
  paymentId: string;
  date: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  method: string;
  reference: string;
  status: string;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
}

export interface PaymentReportResult {
  currency: string;
  summary: { confirmedTotal: number; paymentCount: number };
  methodBreakdown: PaymentMethodBreakdown[];
  payments: PaymentReportRow[];
}
