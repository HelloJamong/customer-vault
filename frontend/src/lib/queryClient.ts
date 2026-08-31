import { QueryClient } from '@tanstack/react-query';

// 앱 전역 QueryClient. App.tsx의 Provider와 axios 인터셉터(로그아웃 시 캐시 비우기)가
// 같은 인스턴스를 공유하도록 모듈로 분리한다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});
