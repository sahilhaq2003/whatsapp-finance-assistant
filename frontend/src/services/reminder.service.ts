import { api } from '@/lib/api-client';
import type {
  Reminder,
  ReminderRule,
  ReminderStats,
  ReminderListResponse,
} from '@/types/reminder';

class ReminderService {
  async getReminders(params?: {
    invoiceId?: string;
    customerId?: string;
    status?: string;
    trigger?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ReminderListResponse }> {
    const query = new URLSearchParams();
    if (params?.invoiceId) query.set('invoiceId', params.invoiceId);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.status) query.set('status', params.status);
    if (params?.trigger) query.set('trigger', params.trigger);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    return api.get(`/reminders${qs ? `?${qs}` : ''}`);
  }

  async getStats(): Promise<{ success: boolean; data: ReminderStats }> {
    return api.get('/reminders/stats');
  }

  async getRules(): Promise<{ success: boolean; data: ReminderRule[] }> {
    return api.get('/reminders/rules');
  }

  async updateRule(
    ruleId: string,
    data: Partial<ReminderRule>
  ): Promise<{ success: boolean; data: ReminderRule }> {
    return api.patch(`/reminders/rules/${ruleId}`, data);
  }

  async triggerScan(): Promise<{
    success: boolean;
    data: { scanned: number; remindersCreated: number; skipped: number; errors: number };
  }> {
    return api.post('/reminders/scan');
  }

  async sendManualReminder(
    invoiceId: string
  ): Promise<{ success: boolean; data: Reminder }> {
    return api.post(`/reminders/invoice/${invoiceId}/send`);
  }

  async cancelFutureReminders(
    invoiceId: string
  ): Promise<{ success: boolean; data: { cancelled: number } }> {
    return api.post(`/reminders/invoice/${invoiceId}/cancel`);
  }

  async getRemindersForInvoice(
    invoiceId: string
  ): Promise<{ success: boolean; data: Reminder[] }> {
    return api.get(`/reminders/invoice/${invoiceId}`);
  }
}

export const reminderService = new ReminderService();
