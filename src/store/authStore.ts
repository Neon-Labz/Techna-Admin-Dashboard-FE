import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp?: number;
}

// Capitalise the first letter of each word for a display name
function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const res = await axios.post<{ access_token: string; role: string }>(
            'http://localhost:4000/api/auth/login',
            { email, password },
          );

          // Techna-BE wraps every response: { success, message, data: <actual> }
          const payload = (res.data as unknown as { data: { access_token: string; role: string } }).data
            ?? res.data;

          const token = payload.access_token;
          if (!token) return { success: false, error: 'No token in response' };

          // Persist token where api.ts interceptor can find it
          localStorage.setItem('techna_admin_token', token);

          const decoded = jwtDecode<JwtPayload>(token);
          const user: User = {
            id: decoded.sub,
            name: nameFromEmail(decoded.email),
            email: decoded.email,
            role: 'admin',
            createdAt: new Date().toISOString(),
          };

          set({ user, token, isAuthenticated: true });
          return { success: true };
        } catch (err: unknown) {
          let message = 'Login failed';
          if (axios.isAxiosError(err)) {
            const msg = err.response?.data?.message;
            message = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : message;
          }
          return { success: false, error: message };
        }
      },

      // Admin accounts are provisioned via server environment variables.
      // Self-registration is not supported by the backend.
      register: async (_name: string, _email: string, _password: string) => {
        return {
          success: false,
          error: 'Admin registration is disabled. Contact your system administrator.',
        };
      },

      logout: () => {
        localStorage.removeItem('techna_admin_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateProfile: (data: Partial<User>) => {
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, ...data } };
        });
      },
    }),
    { name: 'edu-auth' },
  ),
);
