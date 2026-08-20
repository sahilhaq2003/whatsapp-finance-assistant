export enum BusinessQueryType {
  INCOME_TOTAL = 'income_total',
  EXPENSE_TOTAL = 'expense_total',
  NET_CASH_FLOW = 'net_cash_flow',
  TRANSACTION_COUNT = 'transaction_count',
  EXPENSE_CATEGORY_BREAKDOWN = 'expense_category_breakdown',
  INCOME_CATEGORY_BREAKDOWN = 'income_category_breakdown',
  OUTSTANDING_AMOUNT = 'outstanding_amount',
  OUTSTANDING_INVOICES = 'outstanding_invoices',
  OVERDUE_INVOICES = 'overdue_invoices',
  UNPAID_CUSTOMERS = 'unpaid_customers',
  INVOICE_STATUS = 'invoice_status',
  RECENT_TRANSACTIONS = 'recent_transactions',
  UNKNOWN = 'unknown',
}

export enum DateRangePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}
