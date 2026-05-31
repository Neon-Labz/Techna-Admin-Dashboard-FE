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

// Simple JWT-like token generator (in real app, use backend)
function generateToken(user: User): string {
  const payload = { sub: user.id, email: user.email, role: user.role, iat: Date.now() };
  return btoa(JSON.stringify(payload));
}

function getStoredAdmins(): Array<{ email: string; password: string; user: User }> {
  const stored = localStorage.getItem('edu_admins');
  if (stored) return JSON.parse(stored);
  // Default admin
  const defaultAdmin: User = {
    id: 'admin-1',
    name: 'Super Admin',
    email: 'admin@eduadmin.com',
    role: 'admin',
    phone: '+94 77 123 4567',
    createdAt: new Date().toISOString(),
  };
  const admins = [{ email: 'admin@eduadmin.com', password: 'Admin@123', user: defaultAdmin }];
  localStorage.setItem('edu_admins', JSON.stringify(admins));
  return admins;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const admins = getStoredAdmins();
        const found = admins.find(a => a.email === email && a.password === password);
        if (!found) {
          return { success: false, error: 'Invalid email or password' };
        }
        const token = generateToken(found.user);
        set({ user: found.user, token, isAuthenticated: true });
        return { success: true };
      },

      register: async (name: string, email: string, password: string) => {
        const admins = getStoredAdmins();
        if (admins.find(a => a.email === email)) {
          return { success: false, error: 'Email already registered' };
        }
        const newUser: User = {
          id: `admin-${Date.now()}`,
          name,
          email,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        admins.push({ email, password, user: newUser });
        localStorage.setItem('edu_admins', JSON.stringify(admins));
        const token = generateToken(newUser);
        set({ user: newUser, token, isAuthenticated: true });
        return { success: true };
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateProfile: (data: Partial<User>) => {
        set(state => {
          if (!state.user) return state;
          const updatedUser = { ...state.user, ...data };
          // Update in storage
          const admins = getStoredAdmins();
          const idx = admins.findIndex(a => a.user.id === updatedUser.id);
          if (idx !== -1) {
            admins[idx].user = updatedUser;
            localStorage.setItem('edu_admins', JSON.stringify(admins));
          }
          return { user: updatedUser };
        });
      },
    }),
    { name: 'edu-auth' }
  )
);
