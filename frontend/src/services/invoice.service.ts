import { api } from '@/lib/api-client';
import type {
  Invoice,
  InvoiceDetail,
  InvoiceSummary,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  Pagination,
} from '@/types/invoice';
import type { Payment } from '@/types/payment';

class InvoiceService {
  async getInvoices(params?: Record<string, string>): Promise<{
    success: boolean;
    data: { items: Invoice[]; pagination: Pagination };
  }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/invoices${query}`);
  }

  async getInvoice(id: string): Promise<{
    success: boolean;
    data: InvoiceDetail;
  }> {
    return api.get(`/invoices/${id}`);
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<{
    success: boolean;
    data: Invoice;
    message: string;
  }> {
    return api.post('/invoices', data);
  }

  async updateInvoice(
    id: string,
    data: UpdateInvoiceRequest,
  ): Promise<{
    success: boolean;
    data: Invoice;
    message: string;
  }> {
    return api.patch(`/invoices/${id}`, data);
  }

  async issueInvoice(
    id: string,
  ): Promise<{ success: boolean; data: Invoice; message: string }> {
    return api.post(`/invoices/${id}/issue`, {});
  }

  async voidInvoice(
    id: string,
    reason?: string,
  ): Promise<{ success: boolean; data: Invoice; message: string }> {
    return api.post(`/invoices/${id}/void`, { reason });
  }

  async getInvoicePdf(id: string): Promise<void> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/invoices/${id}/pdf`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) throw new Error('Failed to download PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async getInvoicePayments(
    id: string,
  ): Promise<{
    success: boolean;
    data: { items: Payment[]; summary: { invoiceTotalMinor: number; confirmedPaidMinor: number; remainingMinor: number; paymentStatus: string } };
  }> {
    return api.get(`/invoices/${id}/payments`);
  }

  async getOutstandingSummary(): Promise<{
    success: boolean;
    data: InvoiceSummary;
  }> {
    return api.get('/invoices/summary/outstanding');
  }
}

export const invoiceService = new InvoiceService();
