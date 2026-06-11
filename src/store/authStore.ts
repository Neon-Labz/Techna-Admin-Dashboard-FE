import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginRequest } from '../api/authApi';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: User['role'];
  iat?: number;
  exp?: number;
}

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const json = (await loginRequest(email, password)) as {
            access_token?: string;
            token?: string;
            role?: User['role'];
            data?: {
              access_token?: string;
              token?: string;
              role?: User['role'];
            };
          };

          const token =
            json?.access_token ||
            json?.data?.access_token ||
            json?.data?.token ||
            json?.token;

          const role = json?.role || json?.data?.role || 'admin';

          if (!token) {
            return {
              success: false,
              error: 'Login failed: token not received',
            };
          }

          localStorage.setItem('techna_admin_token', token);

          let decoded: JwtPayload = {};

          try {
            decoded = jwtDecode<JwtPayload>(token);
          } catch {
            decoded = {};
          }

          const userEmail = decoded.email || email;

          const user: User = {
            id: decoded.sub || 'admin',
            name: nameFromEmail(userEmail),
            email: userEmail,
            role,
            createdAt: new Date().toISOString(),
          };

          set({
            user,
            token,
            isAuthenticated: true,
          });

          return { success: true };
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? (error.response?.data as { message?: string } | undefined)
                ?.message || 'Unable to connect to backend'
            : error instanceof Error
              ? error.message
              : 'Unable to connect to backend';

          return {
            success: false,
            error: message,
          };
        }
      },

      register: async () => {
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

          return {
            user: {
              ...state.user,
              ...data,
            },
          };
        });
      },
    }),
    { name: 'techna-auth' },
  ),
);