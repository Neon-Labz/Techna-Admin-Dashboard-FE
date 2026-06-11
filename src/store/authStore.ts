import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
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

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
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

          const user: User = {
            id: 'admin',
            name: 'Super Admin',
            email,
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
            ? (error.response?.data as { message?: string } | undefined)?.message ||
              'Unable to connect to backend'
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
          error: 'Registration is disabled for admin dashboard',
        };
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateProfile: (data: Partial<User>) => {
        const currentUser = get().user;

        if (!currentUser) return;

        set({
          user: {
            ...currentUser,
            ...data,
          },
        });
      },
    }),
    { name: 'edu-auth' },
  ),
);
