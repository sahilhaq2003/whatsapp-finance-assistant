import { api } from '@/lib/api-client';
import type {
  Transaction,
  TransactionSummary,
  CategorySummaryItem,
  Pagination,
  TransactionFilters,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  VoidTransactionRequest,
} from '@/types/transaction';
import type { ApiResponse } from '@/types/auth';

function buildQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const transactionService = {
  getTransactions: (filters: TransactionFilters = {}) =>
    api.get<
      ApiResponse<{
        items: Transaction[];
        pagination: Pagination;
      }>
    >(`/transactions${buildQueryString(filters)}`),

  getTransaction: (id: string) =>
    api.get<ApiResponse<Transaction>>(`/transactions/${id}`),

  createTransaction: (data: CreateTransactionRequest) =>
    api.post<ApiResponse<Transaction>>('/transactions', data),

  updateTransaction: (id: string, data: UpdateTransactionRequest) =>
    api.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data),

  voidTransaction: (id: string, data: VoidTransactionRequest = {}) =>
    api.delete<ApiResponse<null>>(`/transactions/${id}`, data),

  getTransactionSummary: (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    return api.get<ApiResponse<TransactionSummary>>(
      `/transactions/summary${qs ? `?${qs}` : ''}`,
    );
  },

  getCategorySummary: (type?: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    return api.get<ApiResponse<CategorySummaryItem[]>>(
      `/transactions/summary/categories${qs ? `?${qs}` : ''}`,
    );
  },
};
