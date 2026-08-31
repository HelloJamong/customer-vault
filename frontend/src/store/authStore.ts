import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '@/types/auth.types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';

interface AuthState {
  user: User | null;

  // Actions
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

// 토큰의 단일 소스는 sessionStorage. 스토어에는 user만 둔다.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,

      login: (accessToken, refreshToken, user) => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({ user });
      },

      logout: () => {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        set({ user: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

// Helper function to check authentication
export const isAuthenticated = (): boolean => {
  const state = useAuthStore.getState();
  const hasToken = !!sessionStorage.getItem(ACCESS_TOKEN_KEY);
  return !!state.user && hasToken;
};
