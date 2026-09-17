import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  // null = 시스템 설정을 따름 (기본값)
  mode: ThemeMode | null;
  toggleMode: (systemPrefersDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: null,
      toggleMode: (systemPrefersDark) => {
        const current = get().mode ?? (systemPrefersDark ? 'dark' : 'light');
        set({ mode: current === 'dark' ? 'light' : 'dark' });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
