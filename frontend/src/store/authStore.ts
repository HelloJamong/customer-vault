import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SessionPolicy, User } from '@/types/auth.types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';

interface AuthState {
  user: User | null;
  sessionExpiresAt: string | null;
  sessionTimeoutMinutes: number | null;
  sessionWarningEnabled: boolean;

  // Actions
  login: (accessToken: string, refreshToken: string, user: User, session: SessionPolicy) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setSessionPolicy: (session: SessionPolicy) => void;
}

// 토큰의 단일 소스는 sessionStorage. 스토어에는 user만 둔다.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionExpiresAt: null,
      sessionTimeoutMinutes: null,
      sessionWarningEnabled: true,

      login: (accessToken, refreshToken, user, session) => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({
          user,
          sessionExpiresAt: session.expiresAt,
          sessionTimeoutMinutes: session.timeoutMinutes,
          sessionWarningEnabled: session.warningEnabled,
        });
      },

      logout: () => {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        set({
          user: null,
          sessionExpiresAt: null,
          sessionTimeoutMinutes: null,
          sessionWarningEnabled: true,
        });
      },

      setUser: (user) => set({ user }),
      setSessionPolicy: (session) => set({
        sessionExpiresAt: session.expiresAt,
        sessionTimeoutMinutes: session.timeoutMinutes,
        sessionWarningEnabled: session.warningEnabled,
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        sessionExpiresAt: state.sessionExpiresAt,
        sessionTimeoutMinutes: state.sessionTimeoutMinutes,
        sessionWarningEnabled: state.sessionWarningEnabled,
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
