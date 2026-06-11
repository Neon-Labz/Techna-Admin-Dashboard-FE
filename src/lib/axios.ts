import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const authData =
        localStorage.getItem('techna-auth') ||
        localStorage.getItem('edu-auth') ||
        localStorage.getItem('auth-storage');

      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          const token = parsed?.state?.token || parsed?.token;

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
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