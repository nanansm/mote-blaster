import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/axios';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updatePlan: (plan: User['plan']) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: () => {
        // This will start OAuth flow by redirecting to backend
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, isAuthenticated: false });
        }
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.user, isAuthenticated: true });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      updatePlan: (plan) => {
        set((state) => ({
          user: state.user ? { ...state.user, plan } : null,
        }));
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);
