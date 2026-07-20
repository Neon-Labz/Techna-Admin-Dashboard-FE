import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      try {
        const authData =
          localStorage.getItem('edu-auth') || sessionStorage.getItem('edu-auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          const token = parsed?.state?.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch {
        // Ignore malformed auth data
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Unwrap the NestJS global response envelope:
//   HTTP body: { success, message, data: <controller_return>, timestamp, path }
// After this interceptor, api.get/post/patch calls resolve with <controller_return> directly.
api.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => Promise.reject(error),
);

export default api;