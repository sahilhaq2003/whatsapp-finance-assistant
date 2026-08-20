const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
let authExpiredEventSent = false;
let businessContextInvalidEventSent = false;

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const selectedBusinessId =
    typeof window !== 'undefined'
      ? localStorage.getItem('dp_selected_business')
      : null;

  if (selectedBusinessId && MONGO_OBJECT_ID_PATTERN.test(selectedBusinessId)) {
    businessContextInvalidEventSent = false;
    headers['X-Business-Id'] = selectedBusinessId;
  } else if (selectedBusinessId && typeof window !== 'undefined') {
    localStorage.removeItem('dp_selected_business');
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !skipAuth) {
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshResponse.ok) {
      authExpiredEventSent = false;
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
    } else {
      if (typeof window !== 'undefined' && !authExpiredEventSent) {
        authExpiredEventSent = true;
        window.dispatchEvent(new Event('dp_auth_expired'));
      }
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'An error occurred',
    }));

    if (
      typeof window !== 'undefined' &&
      (error.message === 'Business context is required' ||
        error.message === 'Invalid business ID') &&
      !businessContextInvalidEventSent
    ) {
      businessContextInvalidEventSent = true;
      localStorage.removeItem('dp_selected_business');
      window.dispatchEvent(new Event('dp_business_context_invalid'));
    }

    const message = Array.isArray(error.message)
      ? error.message.join('; ')
      : error.message;

    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
