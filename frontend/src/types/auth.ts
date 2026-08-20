export interface User {
  _id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  status: string;
  preferredLanguage: string;
  timezone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSummary {
  _id: string;
  name: string;
  slug: string;
  baseCurrency: string;
  status: string;
  businessType?: string;
  role: string;
}

export interface AuthUser {
  user: User;
  businesses: BusinessSummary[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  password: string;
  preferredLanguage?: string;
  timezone?: string;
  businessName: string;
  businessType?: string;
}

export interface CreateBusinessRequest {
  name: string;
  country?: string;
  baseCurrency?: string;
  timezone?: string;
  defaultLanguage?: string;
  businessType?: string;
  phone?: string;
  email?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
