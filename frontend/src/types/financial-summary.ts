export type SummaryFrequency = 'daily' | 'weekly';
export type SummaryStatus = 'generated' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
export type SummaryChannel = 'whatsapp';
export type WeeklyDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface SummaryPreference {
  _id: string;
  businessId: string;
  dailyEnabled: boolean;
  dailySendHour: number;
  dailySendMinute: number;
  weeklyEnabled: boolean;
  weeklyDay: WeeklyDay;
  weeklySendHour: number;
  weeklySendMinute: number;
  timezone: string;
  channel: SummaryChannel;
  includeIncome: boolean;
  includeExpenses: boolean;
  includeNetCashFlow: boolean;
  includeTransactionCount: boolean;
  includeOutstandingInvoices: boolean;
  includeTopCategories: boolean;
  includeOverdueInvoices: boolean;
  createdByUserId: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryCategoryBreakdown {
  categoryId: string;
  name: string;
  amountMinor: number;
  transactionCount: number;
}

export interface FinancialSummary {
  _id: string;
  businessId: string;
  frequency: SummaryFrequency;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netCashFlowMinor: number;
  transactionCount: number;
  outstandingAmountMinor: number;
  outstandingInvoiceCount: number;
  overdueAmountMinor: number;
  overdueInvoiceCount: number;
  topExpenseCategories: SummaryCategoryBreakdown[];
  topIncomeCategories: SummaryCategoryBreakdown[];
  status: SummaryStatus;
  providerMessageId?: string;
  generatedAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureCode?: string;
  sendAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSummaryPreferenceRequest {
  dailyEnabled?: boolean;
  dailySendHour?: number;
  dailySendMinute?: number;
  weeklyEnabled?: boolean;
  weeklyDay?: WeeklyDay;
  weeklySendHour?: number;
  weeklySendMinute?: number;
  channel?: SummaryChannel;
  includeIncome?: boolean;
  includeExpenses?: boolean;
  includeNetCashFlow?: boolean;
  includeTransactionCount?: boolean;
  includeOutstandingInvoices?: boolean;
  includeTopCategories?: boolean;
  includeOverdueInvoices?: boolean;
}

export interface SummaryListResponse {
  items: FinancialSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SummaryPreview {
  periodStart: string;
  periodEnd: string;
  currency: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  transactionCount: number;
  outstandingAmount: number;
  outstandingInvoiceCount: number;
}
