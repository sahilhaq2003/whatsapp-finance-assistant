export enum CustomerStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface CustomerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country?: string;
}

export interface Customer {
  _id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
  status: CustomerStatus;
  createdByUserId: string;
  archivedAt?: string;
  archivedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFinancialSummary {
  currency: string;
  totalReceived: number;
  confirmedTransactionCount: number;
  lastTransactionDate: string | null;
  invoiceCount: number;
  outstandingInvoiceCount: number;
  outstandingBalance: number;
}

export interface CustomerTransactionHistory {
  items: Array<{
    _id: string;
    type: string;
    amountMinor: number;
    currency: string;
    date: string;
    description?: string;
    categoryId?: { _id: string; name: string; type: string } | string;
    status: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerFilters {
  search?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
}
