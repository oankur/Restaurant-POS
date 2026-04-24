import { create } from 'zustand';
import type { AuthSession } from '../types';
import api from '../api/client';

interface AuthStore {
  token: string | null;
  session: AuthSession | null;

  loginOutlet: (username: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  loginManager: (password: string) => Promise<void>;
  exitManager: () => Promise<void>;
  logout: () => void;
}

function loadSession(): { token: string | null; session: AuthSession | null } {
  try {
    const token = localStorage.getItem('pos_token');
    const session = JSON.parse(localStorage.getItem('pos_session') || 'null');
    return { token, session };
  } catch {
    return { token: null, session: null };
  }
}

function saveSession(token: string, session: AuthSession) {
  localStorage.setItem('pos_token', token);
  localStorage.setItem('pos_session', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_session');
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...loadSession(),

  loginOutlet: async (username, password) => {
    const { data } = await api.post('/auth/login', { loginType: 'outlet', username, password });
    saveSession(data.token, data.session);
    set({ token: data.token, session: data.session });
  },

  loginAdmin: async (username, password) => {
    const { data } = await api.post('/auth/login', { loginType: 'admin', username, password });
    saveSession(data.token, data.session);
    set({ token: data.token, session: data.session });
  },

  loginManager: async (password) => {
    const { data } = await api.post('/auth/manager-login', { password });
    saveSession(data.token, data.session);
    set({ token: data.token, session: data.session });
  },

  exitManager: async () => {
    const { data } = await api.post('/auth/exit-manager');
    saveSession(data.token, data.session);
    set({ token: data.token, session: data.session });
  },

  logout: () => {
    clearSession();
    set({ token: null, session: null });
  },
}));
