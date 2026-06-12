import axios from 'axios';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      try {
        const authData =
          localStorage.getItem('techna-auth') ||
          localStorage.getItem('edu-auth') ||
          localStorage.getItem('auth-storage') ||
          '{}';

        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token || parsed?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Ignore malformed persisted auth data.
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;