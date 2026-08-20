import { api } from '@/lib/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ReportService {
  async getOverview(params?: { period?: string; dateFrom?: string; dateTo?: string }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').FinancialOverview }>(`/reports/overview${qs}`);
  }

  async getIncomeReport(params?: { period?: string; dateFrom?: string; dateTo?: string; categoryId?: string; customerId?: string }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').IncomeReportData }>(`/reports/income${qs}`);
  }

  async getExpenseReport(params?: { period?: string; dateFrom?: string; dateTo?: string; categoryId?: string }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').ExpenseReportData }>(`/reports/expenses${qs}`);
  }

  async getIncomeVsExpenses(params?: { period?: string; dateFrom?: string; dateTo?: string }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').IncomeVsExpenseData }>(`/reports/income-vs-expenses${qs}`);
  }

  async getCategoryReport(params?: { period?: string; dateFrom?: string; dateTo?: string }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').CategoryBreakdownData }>(`/reports/categories${qs}`);
  }

  async getTransactionReport(params?: {
    period?: string; dateFrom?: string; dateTo?: string;
    type?: string; categoryId?: string; customerId?: string;
    paymentMethod?: string; status?: string; page?: number; limit?: number;
  }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').TransactionReportData }>(`/reports/transactions${qs}`);
  }

  async getCustomerReport() {
    return api.get<{ success: boolean; data: import('@/types/report').CustomerReportData }>('/reports/customers');
  }

  async getOutstandingInvoices() {
    return api.get<{ success: boolean; data: import('@/types/report').OutstandingInvoiceData }>('/reports/invoices/outstanding');
  }

  async getOverdueInvoices() {
    return api.get<{ success: boolean; data: import('@/types/report').OverdueInvoiceData }>('/reports/invoices/overdue');
  }

  async getPaymentReport(params?: { period?: string; dateFrom?: string; dateTo?: string; customerId?: string }) {
    const qs = this.buildQueryString(params);
    return api.get<{ success: boolean; data: import('@/types/report').PaymentReportData }>(`/reports/payments${qs}`);
  }

  async exportReport(params: {
    type: string; format: string; period?: string; dateFrom?: string; dateTo?: string;
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE}/reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('dp_selected_business')
          ? { 'X-Business-Id': localStorage.getItem('dp_selected_business')! }
          : {}),
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  }
}

export const reportService = new ReportService();
