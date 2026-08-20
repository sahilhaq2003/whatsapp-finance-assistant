export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  VOIDED = 'voided',
}

export enum InvoicePaymentStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
}

export interface InvoiceCustomerSnapshot {
  name: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    district?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface InvoiceItem {
  _id: string;
  businessId: string;
  invoiceId: string;
  description: string;
  quantity: string;
  rateMinor: number;
  amountMinor: number;
  sortOrder: number;
}

export interface Invoice {
  _id: string;
  businessId: string;
  customerId: { _id: string; name: string; phone?: string; email?: string } | string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  subtotalMinor: number;
  totalMinor: number;
  notes?: string;
  customerSnapshot: InvoiceCustomerSnapshot;
  issuedAt?: string;
  issuedByUserId?: string;
  voidedAt?: string;
  voidedByUserId?: string;
  voidReason?: string;
  pdfKey?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
  paymentSummary: {
    invoiceTotalMinor: number;
    confirmedPaidMinor: number;
    remainingMinor: number;
    paymentStatus: InvoicePaymentStatus;
  };
  isOverdue: boolean;
}

export interface InvoiceSummary {
  currency: string;
  outstandingAmount: number;
  outstandingInvoiceCount: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
}

export interface CreateInvoiceItemRequest {
  description: string;
  quantity: string;
  rate: number;
}

export interface CreateInvoiceRequest {
  customerId: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  items: CreateInvoiceItemRequest[];
}

export interface UpdateInvoiceRequest {
  customerId?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  items?: CreateInvoiceItemRequest[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
