import api from '../lib/axios';

export async function login(email: string, password: string) {
  return api.post('/auth/login', { email, password });
}