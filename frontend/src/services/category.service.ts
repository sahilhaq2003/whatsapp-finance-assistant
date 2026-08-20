import { api } from '@/lib/api-client';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category';
import type { ApiResponse } from '@/types/auth';

export const categoryService = {
  getCategories: (type?: string) => {
    const params = type ? `?type=${type}` : '';
    return api.get<ApiResponse<Category[]>>(`/categories${params}`);
  },

  getCategory: (id: string) =>
    api.get<ApiResponse<Category>>(`/categories/${id}`),

  createCategory: (data: CreateCategoryRequest) =>
    api.post<ApiResponse<Category>>('/categories', data),

  updateCategory: (id: string, data: UpdateCategoryRequest) =>
    api.patch<ApiResponse<Category>>(`/categories/${id}`, data),

  deactivateCategory: (id: string) =>
    api.delete<ApiResponse<null>>(`/categories/${id}`),
};
