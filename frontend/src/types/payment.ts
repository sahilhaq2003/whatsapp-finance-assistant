import { PaymentMethod } from './transaction';

export enum PaymentStatus {
  CONFIRMED = 'confirmed',
  VOIDED = 'voided',
}

export interface Payment {
  _id: string;
  businessId: string;
  invoiceId: { _id: string; invoiceNumber: string } | string;
  customerId: string;
  amountMinor: number;
  currency: string;
  date: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  createdByUserId: string;
  voidedAt?: string;
  voidedByUserId?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
