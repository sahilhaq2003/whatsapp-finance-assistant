import { api } from '@/lib/api-client';
import type {
  Customer,
  CustomerFinancialSummary,
  CustomerTransactionHistory,
  CustomerFilters,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/types/customer';
import type { ApiResponse } from '@/types/auth';
import type { Pagination } from '@/types/transaction';

function buildQueryString(filters: CustomerFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const customerService = {
  getCustomers: (filters: CustomerFilters = {}) =>
    api.get<
      ApiResponse<{ items: Customer[]; pagination: Pagination }>
    >(`/customers${buildQueryString(filters)}`),

  getCustomer: (id: string) =>
    api.get<ApiResponse<Customer>>(`/customers/${id}`),

  createCustomer: (data: CreateCustomerRequest) =>
    api.post<ApiResponse<Customer>>('/customers', data),

  updateCustomer: (id: string, data: UpdateCustomerRequest) =>
    api.patch<ApiResponse<Customer>>(`/customers/${id}`, data),

  archiveCustomer: (id: string) =>
    api.delete<ApiResponse<null>>(`/customers/${id}`),

  restoreCustomer: (id: string) =>
    api.patch<ApiResponse<Customer>>(`/customers/${id}/restore`),

  getCustomerTransactions: (
    id: string,
    params: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.type) query.set('type', params.type);
    const qs = query.toString();
    return api.get<ApiResponse<CustomerTransactionHistory>>(
      `/customers/${id}/transactions${qs ? `?${qs}` : ''}`,
    );
  },

  getCustomerSummary: (id: string) =>
    api.get<ApiResponse<CustomerFinancialSummary>>(
      `/customers/${id}/summary`,
    ),
};
