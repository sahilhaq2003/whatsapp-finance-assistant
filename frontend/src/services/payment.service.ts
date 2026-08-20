import { api } from '@/lib/api-client';
import type { Payment, CreatePaymentRequest, Pagination } from '@/types/payment';

class PaymentService {
  async getPayments(params?: Record<string, string>): Promise<{
    success: boolean;
    data: { items: Payment[]; pagination: Pagination };
  }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/payments${query}`);
  }

  async recordPayment(
    data: CreatePaymentRequest,
  ): Promise<{ success: boolean; data: { payment: Payment; invoiceSummary: unknown }; message: string }> {
    return api.post('/payments', data);
  }

  async voidPayment(
    id: string,
    reason?: string,
  ): Promise<{ success: boolean; data: Payment; message: string }> {
    return api.post(`/payments/${id}/void`, { reason });
  }
}

export const paymentService = new PaymentService();
