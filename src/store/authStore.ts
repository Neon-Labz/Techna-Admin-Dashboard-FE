import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { setAuthToken } from '../api/axiosClient';
import { authApi } from '../api';
import type { User } from '../types';

// "Remember me" checked → localStorage (survives browser restart).
// Unchecked → sessionStorage (survives page refresh, cleared when the tab closes).
const dualStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name) ?? sessionStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    let remember = false;
    try {
      remember = Boolean(JSON.parse(value)?.state?.rememberSession);
    } catch {
      // fall through with remember = false
    }
    if (remember) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

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
  rememberSession: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (
    email: string,
    password: string,
    remember?: boolean
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
      rememberSession: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),

      login: async (email: string, password: string, remember = false) => {
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

          setAuthToken(access_token);

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            rememberSession: remember,
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
          rememberSession: false,
        });
        setAuthToken(null);
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
            rememberSession: false,
          });
          setAuthToken(null);
          return;
        }

        try {
          const session = await authApi.getSession();

          if (session.role && session.role !== 'admin') {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              rememberSession: false,
            });
            setAuthToken(null);
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
          setAuthToken(token);
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            rememberSession: false,
          });
          setAuthToken(null);
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
      storage: createJSONStorage(() => dualStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        rememberSession: state.rememberSession,
      }),
      onRehydrateStorage: () => (state) => {
        setAuthToken(state?.token || null);
        state?.setHasHydrated(true);
      },
    }
  )
);
