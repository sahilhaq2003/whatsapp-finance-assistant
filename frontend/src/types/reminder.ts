export type ReminderStatus = 'pending' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled' | 'skipped';
export type ReminderTrigger = 'due_date' | 'post_due' | 'manual';
export type ReminderChannel = 'whatsapp';

export interface ReminderRule {
  _id: string;
  businessId: string;
  trigger: ReminderTrigger;
  channel: ReminderChannel;
  isEnabled: boolean;
  offsetDays: number;
  dayOfMonth: number;
  hourOfDay: number;
  minuteOfHour: number;
  maxRemindsPerInvoice: number;
  manualCooldownMinutes: number;
  templateName?: string;
  templateLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  _id: string;
  businessId: string;
  invoiceId: string | { _id: string; invoiceNumber: string };
  customerId: string | { _id: string; name: string; phone: string };
  trigger: ReminderTrigger;
  channel: ReminderChannel;
  status: ReminderStatus;
  scheduledAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  providerMessageId?: string;
  errorMessage?: string;
  deduplicationKey: string;
  sendAttempts: number;
  snapshotInvoiceNumber?: string;
  snapshotTotalMinor?: number;
  snapshotRemainingMinor?: number;
  snapshotDueDate?: string;
  snapshotCustomerPhone?: string;
  snapshotCustomerName?: string;
  triggeredByUserId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderStats {
  total: number;
  scheduled: number;
  sent: number;
  delivered: number;
  failed: number;
  cancelled: number;
}

export interface ReminderListResponse {
  items: Reminder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
