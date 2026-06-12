import { apiClient } from './axiosClient';

export interface LoginResponse {
  access_token: string;
  role: string;
}

export interface SessionResponse {
  _id?: string;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  createdAt?: string;
}

export const authApi = {
  /**
   * Login with email and password
   * Only admin users are allowed to login
   */
  login: (email: string, password: string) =>
    apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  /**
   * Get the current session/user info using stored token
   */
  getSession: () =>
    apiClient<SessionResponse>('/auth/session'),

  /**
   * Logout the current user
   */
  logout: () =>
    apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  /**
   * Request password reset email
   */
  forgotPassword: (email: string) =>
    apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  /**
   * Reset password with token from email
   */
  resetPassword: (token: string, newPassword: string) =>
    apiClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),
};
