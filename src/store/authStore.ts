import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';
import type { User } from '../types';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  loadSession: () => Promise<void>;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),

      login: async (email: string, password: string) => {
        try {
          const response = await authApi.login(email, password);
          const { access_token, role } = response;

          if (role !== 'admin') {
            return {
              success: false,
              error: 'Access denied. Only admin users can login to this portal.',
            };
          }

          const decoded = jwtDecode<JwtPayload>(access_token);

          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            return {
              success: false,
              error: 'Token expired. Please try again.',
            };
          }

          const user: User = {
            id: decoded.sub,
            name: decoded.email.split('@')[0] || 'Admin',
            email: decoded.email,
            role: 'admin',
            createdAt: new Date().toISOString(),
          };

          set({
            user,
            token: access_token,
            isAuthenticated: true,
          });

          return { success: true };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Login failed';

          return {
            success: false,
            error: message,
          };
        }
      },

      logout: async () => {
        const token = get().token;

        if (token) {
          try {
            await authApi.logout();
          } catch {
            // Proceed with local logout even if API call fails
          }
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
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

      loadSession: async () => {
        const { token, isTokenExpired } = get();

        if (!token) return;

        if (isTokenExpired()) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return;
        }

        try {
          const session = await authApi.getSession();

          if (session.role && session.role !== 'admin') {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            return;
          }

          const user: User = {
            id: session._id || session.userId || 'admin',
            name: session.name || session.email || 'Admin',
            email: session.email || '',
            role: 'admin',
            phone: session.phone || undefined,
            createdAt: session.createdAt || new Date().toISOString(),
          };

          set({
            user,
            isAuthenticated: true,
          });
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      isTokenExpired: () => {
        const token = get().token;

        if (!token) return true;

        try {
          const decoded = jwtDecode<JwtPayload>(token);

          if (!decoded.exp) return false;

          return decoded.exp * 1000 < Date.now() + 30000;
        } catch {
          return true;
        }
      },
    }),
    {
      name: 'edu-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);