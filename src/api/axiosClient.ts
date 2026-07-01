const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getStoredToken(): string | null {
  if (authToken) return authToken;

  if (typeof window === 'undefined') return null;

  try {
    const stored =
      localStorage.getItem('techna-auth') || localStorage.getItem('edu-auth');

    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

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

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.message || 'Session expired. Please login again.';

    const isLoginRequest =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/student/login');

    if (!isLoginRequest && typeof window !== 'undefined') {
      setAuthToken(null);
      localStorage.removeItem('techna-auth');
      localStorage.removeItem('edu-auth');
      window.location.href = '/login';
    }

    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.message || `Request failed with status ${response.status}`;

    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  const json: ApiWrappedResponse<T> = await response.json();

  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }

  return json as unknown as T;
}