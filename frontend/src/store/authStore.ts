import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth.types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  updateAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (accessToken, refreshToken, user) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
        });
      },

      logout: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      setUser: (user) => set({ user }),

      updateAccessToken: (token) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        set({ accessToken: token });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

// Helper function to check authentication
export const isAuthenticated = (): boolean => {
  const state = useAuthStore.getState();
  const hasToken = !!localStorage.getItem(ACCESS_TOKEN_KEY);
  return !!state.user && hasToken;
};
