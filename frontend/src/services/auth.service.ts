import { api } from '@/lib/api-client';
import type {
  AuthUser,
  LoginRequest,
  RegisterRequest,
  CreateBusinessRequest,
  BusinessSummary,
  ApiResponse,
} from '@/types/auth';

export const authService = {
  register: (data: RegisterRequest) =>
    api.post<ApiResponse<AuthUser['user']>>('/auth/register', data),

  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthUser['user']>>('/auth/login', data),

  logout: () => api.post<ApiResponse<null>>('/auth/logout'),

  logoutAll: () => api.post<ApiResponse<null>>('/auth/logout-all'),

  getMe: () => api.get<ApiResponse<AuthUser>>('/auth/me', { skipAuth: true }),

  refresh: () => api.post<ApiResponse<null>>('/auth/refresh', undefined, { skipAuth: true }),

  getMyBusinesses: () =>
    api.get<ApiResponse<BusinessSummary[]>>('/businesses/my'),

  createBusiness: (data: CreateBusinessRequest) =>
    api.post<ApiResponse<{ business: BusinessSummary; membership: unknown }>>(
      '/businesses',
      data,
    ),
};
