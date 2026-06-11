import axios from 'axios';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const authStorage = JSON.parse(localStorage.getItem('techna-auth') || '{}');
      const token = authStorage?.state?.token;

      if (token) {
        config.headers = config.headers || {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore malformed persisted auth data.
    }
  }

  return config;
});

api.interceptors.response.use((response) => response.data?.data ?? response.data);

export default api;