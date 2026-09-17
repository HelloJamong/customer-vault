import { useMediaQuery } from '@mui/material';
import { useThemeStore } from '@/store/themeStore';

// 기본은 시스템 설정(prefers-color-scheme)을 따르고, 토글로 명시적으로 재정의한다.
export function useColorMode() {
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  return {
    mode: mode ?? (systemPrefersDark ? 'dark' : 'light'),
    toggle: () => toggleMode(systemPrefersDark),
  } as const;
}
