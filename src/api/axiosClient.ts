const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Backend wraps all responses in: { success, message, data, timestamp, path }
interface ApiWrappedResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Get the stored auth token from localStorage
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('edu-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

/**
 * Core API request function with automatic token attachment
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = getStoredToken();

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle 401 Unauthorized - clear auth and redirect to login
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('edu-auth');
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || `Request failed with status ${response.status}`;
    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  const json: ApiWrappedResponse<T> = await response.json();

  // Unwrap the backend's ApiResponse wrapper to return just the data
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }

  return json as unknown as T;
}
