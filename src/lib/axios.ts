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
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => Promise.reject(error),
);

export default api;