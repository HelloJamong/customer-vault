# React 프론트엔드 개발 가이드

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 초기 설정](#프로젝트-초기-설정)
4. [프로젝트 구조](#프로젝트-구조)
5. [필수 패키지 설치](#필수-패키지-설치)
6. [환경 변수 설정](#환경-변수-설정)
7. [API 클라이언트 구현](#api-클라이언트-구현)
8. [인증 시스템 구현](#인증-시스템-구현)
9. [라우팅 설정](#라우팅-설정)
10. [페이지 구현 가이드](#페이지-구현-가이드)
11. [상태 관리](#상태-관리)
12. [UI 컴포넌트](#ui-컴포넌트)
13. [배포 설정](#배포-설정)

---

## 프로젝트 개요

기존 Flask + Jinja2 템플릿 기반 프론트엔드를 React 18+ SPA(Single Page Application)로 마이그레이션합니다.

### 마이그레이션 목표

- ✅ NestJS 백엔드 API와 완전 분리
- ✅ 모던 React 기술 스택 활용
- ✅ TypeScript로 타입 안정성 확보
- ✅ 반응형 디자인 구현
- ✅ 기존 기능 100% 재구현

---

## 기술 스택

### 핵심 기술

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18+ | UI 프레임워크 |
| TypeScript | 5+ | 타입 안정성 |
| Vite | 5+ | 빌드 도구 |
| React Router | 6+ | 라우팅 |
| Axios | 1.6+ | HTTP 클라이언트 |
| React Query | 5+ | 서버 상태 관리 |
| Zustand | 4+ | 클라이언트 상태 관리 |

### UI 라이브러리

**옵션 1: Material-UI (MUI)** ⭐ 추천
```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
```

**옵션 2: Ant Design**
```bash
npm install antd
```

**옵션 3: Tailwind CSS + Headless UI**
```bash
npm install -D tailwindcss postcss autoprefixer
npm install @headlessui/react
```

### 폼 관리

```bash
npm install react-hook-form zod @hookform/resolvers
```

### 유틸리티

```bash
npm install dayjs # 날짜 처리
npm install clsx # className 유틸리티
```

---

## 프로젝트 초기 설정

### 1. Vite로 React 프로젝트 생성

```bash
# 프로젝트 루트에서 실행
cd /Users/hellowook/Dev/VS_Code/customer-storage

# Vite로 React + TypeScript 프로젝트 생성
npm create vite@latest frontend -- --template react-ts

# frontend 디렉토리로 이동
cd frontend

# 의존성 설치
npm install
```

### 2. 프로젝트 구조 확인

```bash
frontend/
├── public/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 3. 개발 서버 실행

```bash
npm run dev
# 기본적으로 http://localhost:5173 에서 실행됨
```

---

## 프로젝트 구조

### 권장 디렉토리 구조

```
frontend/
├── public/
│   └── assets/              # 정적 파일 (이미지, 폰트 등)
├── src/
│   ├── api/                 # API 클라이언트
│   │   ├── axios.ts         # Axios 인스턴스 설정
│   │   ├── auth.api.ts      # 인증 API
│   │   ├── users.api.ts     # 사용자 API
│   │   ├── customers.api.ts # 고객사 API
│   │   └── ...
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   ├── common/          # 공통 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── layout/          # 레이아웃 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MainLayout.tsx
│   │   └── features/        # 기능별 컴포넌트
│   │       ├── auth/
│   │       ├── customers/
│   │       └── ...
│   ├── hooks/               # 커스텀 훅
│   │   ├── useAuth.ts
│   │   ├── useCustomers.ts
│   │   └── ...
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── UsersPage.tsx
│   │   └── ...
│   ├── routes/              # 라우팅 설정
│   │   ├── index.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── RoleRoute.tsx
│   ├── store/               # 상태 관리 (Zustand)
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── ...
│   ├── types/               # TypeScript 타입 정의
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── customer.types.ts
│   │   └── ...
│   ├── utils/               # 유틸리티 함수
│   │   ├── format.ts        # 날짜, 숫자 포맷팅
│   │   ├── validation.ts    # 유효성 검사
│   │   └── constants.ts     # 상수
│   ├── App.tsx              # 루트 컴포넌트
│   ├── main.tsx             # 진입점
│   └── vite-env.d.ts
├── .env.development         # 개발 환경 변수
├── .env.production          # 프로덕션 환경 변수
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 필수 패키지 설치

### 1. 핵심 패키지

```bash
# 라우팅
npm install react-router-dom

# HTTP 클라이언트
npm install axios

# 서버 상태 관리
npm install @tanstack/react-query

# 클라이언트 상태 관리
npm install zustand

# 폼 관리
npm install react-hook-form zod @hookform/resolvers

# 날짜 처리
npm install dayjs

# 유틸리티
npm install clsx
```

### 2. UI 라이브러리 (Material-UI 선택 시)

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
npm install @mui/x-data-grid  # 테이블용
```

### 3. 개발 도구

```bash
# TypeScript 타입 정의
npm install -D @types/node

# ESLint & Prettier (선택)
npm install -D eslint prettier eslint-config-prettier
```

---

## 환경 변수 설정

### `.env.development`

```env
# API 서버 주소
VITE_API_BASE_URL=http://localhost:5001/api

# 환경
VITE_ENV=development

# 토큰 저장 키
VITE_ACCESS_TOKEN_KEY=access_token
VITE_REFRESH_TOKEN_KEY=refresh_token
```

### `.env.production`

```env
# API 서버 주소 (실제 도메인으로 변경)
VITE_API_BASE_URL=https://api.yourdomain.com/api

# 환경
VITE_ENV=production

# 토큰 저장 키
VITE_ACCESS_TOKEN_KEY=access_token
VITE_REFRESH_TOKEN_KEY=refresh_token
```

### 환경 변수 사용

```typescript
// src/utils/constants.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const ACCESS_TOKEN_KEY = import.meta.env.VITE_ACCESS_TOKEN_KEY;
export const REFRESH_TOKEN_KEY = import.meta.env.VITE_REFRESH_TOKEN_KEY;
```

---

## API 클라이언트 구현

### 1. Axios 인스턴스 설정

```typescript
// src/api/axios.ts
import axios from 'axios';
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: Access Token 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 토큰 만료 시 자동 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러 && 재시도 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        // Refresh Token으로 새 Access Token 발급
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // 새 토큰 저장
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh Token도 만료된 경우 로그아웃
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. 인증 API

```typescript
// src/api/auth.api.ts
import apiClient from './axios';
import type { LoginRequest, LoginResponse, User } from '@/types/auth.types';

export const authAPI = {
  // 로그인
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  // 토큰 갱신
  refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
    const { data } = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  // 비밀번호 변경
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};
```

### 3. 고객사 API

```typescript
// src/api/customers.api.ts
import apiClient from './axios';
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.types';

export const customersAPI = {
  // 고객사 목록 조회
  getAll: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get('/customers');
    return data;
  },

  // 고객사 상세 조회
  getById: async (id: number): Promise<Customer> => {
    const { data } = await apiClient.get(`/customers/${id}`);
    return data;
  },

  // 고객사 생성
  create: async (dto: CreateCustomerDto): Promise<Customer> => {
    const { data } = await apiClient.post('/customers', dto);
    return data;
  },

  // 고객사 수정
  update: async (id: number, dto: UpdateCustomerDto): Promise<Customer> => {
    const { data } = await apiClient.patch(`/customers/${id}`, dto);
    return data;
  },

  // 고객사 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  // 담당 고객사 목록 (일반 사용자용)
  getMyCustomers: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get('/customers/my');
    return data;
  },
};
```

---

## 인증 시스템 구현

### 1. TypeScript 타입 정의

```typescript
// src/types/auth.types.ts
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
```

### 2. Zustand 인증 스토어

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth.types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

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
      isAuthenticated: false,

      login: (accessToken, refreshToken, user) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
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
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 3. 커스텀 훅

```typescript
// src/hooks/useAuth.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest } from '@/types/auth.types';

export const useAuth = () => {
  const navigate = useNavigate();
  const { login: setAuth, logout: clearAuth, user } = useAuthStore();

  // 로그인 뮤테이션
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
      alert(error.response?.data?.message || '로그인에 실패했습니다.');
    },
  });

  // 로그아웃 뮤테이션
  const logoutMutation = useMutation({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      clearAuth();
      navigate('/login');
    },
  });

  // 현재 사용자 정보 쿼리
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authAPI.getCurrentUser(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  });

  return {
    user,
    currentUser,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending,
  };
};
```

---

## 라우팅 설정

### 1. Private Route 컴포넌트

```typescript
// src/routes/PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### 2. Role-based Route 컴포넌트

```typescript
// src/routes/RoleRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth.types';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### 3. 라우터 설정

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { RoleRoute } from './RoleRoute';
import { UserRole } from '@/types/auth.types';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CustomersPage from '@/pages/CustomersPage';
import UsersPage from '@/pages/UsersPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import MainLayout from '@/components/layout/MainLayout';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      {
        path: 'users',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <UsersPage />
          </RoleRoute>
        ),
      },
      // 더 많은 라우트...
    ],
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
]);
```

### 4. App.tsx 설정

```typescript
// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
```

---

## 페이지 구현 가이드

### 1. 로그인 페이지

```typescript
// src/pages/LoginPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

const loginSchema = z.object({
  username: z.string().min(1, '사용자명을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const { login, isLoginLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    login(data);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          고객창고
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          로그인하여 시작하세요
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            {...register('username')}
            label="사용자명"
            fullWidth
            margin="normal"
            error={!!errors.username}
            helperText={errors.username?.message}
          />
          <TextField
            {...register('password')}
            label="비밀번호"
            type="password"
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            disabled={isLoginLoading}
          >
            {isLoginLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;
```

### 2. 대시보드 페이지

```typescript
// src/pages/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth.types';

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  // Role별로 다른 대시보드 표시
  const getDashboardContent = () => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        return <SuperAdminDashboard />;
      case UserRole.ADMIN:
        return <AdminDashboard />;
      case UserRole.USER:
        return <UserDashboard />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>
      {getDashboardContent()}
    </Box>
  );
};

// 슈퍼관리자용 대시보드
const SuperAdminDashboard = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">전체 고객사</Typography>
          <Typography variant="h3">142</Typography>
        </Paper>
      </Grid>
      {/* 더 많은 통계 카드... */}
    </Grid>
  );
};

// 관리자용 대시보드
const AdminDashboard = () => {
  return <div>관리자 대시보드</div>;
};

// 일반 사용자용 대시보드
const UserDashboard = () => {
  return <div>사용자 대시보드</div>;
};

export default DashboardPage;
```

### 3. 고객사 목록 페이지

```typescript
// src/pages/CustomersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Button, Typography } from '@mui/material';
import { customersAPI } from '@/api/customers.api';
import type { Customer } from '@/types/customer.types';

const CustomersPage = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 고객사 목록 조회
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersAPI.getAll,
  });

  // 고객사 삭제
  const deleteMutation = useMutation({
    mutationFn: customersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      alert('삭제되었습니다.');
    },
  });

  const columns: GridColDef<Customer>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: '고객사명', width: 200 },
    { field: 'contact_person', headerName: '담당자', width: 130 },
    { field: 'contact_phone', headerName: '연락처', width: 150 },
    {
      field: 'actions',
      headerName: '작업',
      width: 150,
      renderCell: (params) => (
        <Button
          size="small"
          color="error"
          onClick={() => {
            if (confirm('정말 삭제하시겠습니까?')) {
              deleteMutation.mutate(params.row.id);
            }
          }}
        >
          삭제
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">고객사 관리</Typography>
        <Button variant="contained">고객사 추가</Button>
      </Box>

      <DataGrid
        rows={customers}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
      />
    </Box>
  );
};

export default CustomersPage;
```

---

## 상태 관리

### React Query로 서버 상태 관리

```typescript
// src/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '@/api/customers.api';
import type { CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.types';

export const useCustomers = () => {
  const queryClient = useQueryClient();

  // 고객사 목록
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: customersAPI.getAll,
  });

  // 고객사 생성
  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => customersAPI.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // 고객사 수정
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCustomerDto }) =>
      customersAPI.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // 고객사 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    createCustomer: createMutation.mutate,
    updateCustomer: updateMutation.mutate,
    deleteCustomer: deleteMutation.mutate,
  };
};
```

### Zustand로 UI 상태 관리

```typescript
// src/store/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
```

---

## UI 컴포넌트

### 레이아웃 컴포넌트

```typescript
// src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useUIStore } from '@/store/uiStore';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 240;

const MainLayout = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={toggleSidebar} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            고객창고
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar /> {/* AppBar 높이만큼 여백 */}
        <Sidebar />
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginLeft: sidebarOpen ? 0 : `-${DRAWER_WIDTH}px`,
          transition: 'margin 0.3s',
        }}
      >
        <Toolbar /> {/* AppBar 높이만큼 여백 */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
```

---

## 배포 설정

### 1. Vite 설정 (Docker 통합)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // Docker에서 접근 가능하도록
  },
  preview: {
    port: 3000,
    host: true,
  },
});
```

### 2. Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 이미지
FROM nginx:alpine

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Nginx 설정

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # React Router를 위한 설정
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 프록시 (선택)
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 정적 파일 캐싱
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. Docker Compose 업데이트

```yaml
# docker-compose.yml (루트)
services:
  backend:
    # ... 기존 백엔드 설정
    networks:
      - customer_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: customer_frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://localhost:5001/api
    depends_on:
      - backend
    networks:
      - customer_network

  db:
    # ... 기존 DB 설정

networks:
  customer_network:
    driver: bridge
```

---

## 다음 단계

### Phase 1: 프로젝트 초기 설정
- [ ] React 프로젝트 생성
- [ ] 필수 패키지 설치
- [ ] 프로젝트 구조 설정
- [ ] 환경 변수 설정

### Phase 2: 핵심 기능 구현
- [ ] API 클라이언트 구현
- [ ] 인증 시스템 구현
- [ ] 라우팅 설정
- [ ] 레이아웃 컴포넌트

### Phase 3: 페이지 구현
- [ ] 로그인 페이지
- [ ] 대시보드 (3가지 role별)
- [ ] 고객사 관리
- [ ] 사용자 관리
- [ ] 문서 업로드/관리
- [ ] 로그 조회
- [ ] 설정 페이지

### Phase 4: 고급 기능
- [ ] 파일 업로드 UI
- [ ] 데이터 테이블 정렬/필터링
- [ ] 페이지네이션
- [ ] 검색 기능
- [ ] 알림/토스트

### Phase 5: 배포
- [ ] Dockerfile 작성
- [ ] Nginx 설정
- [ ] Docker Compose 통합
- [ ] 프로덕션 빌드 최적화

---

**🚀 React 프론트엔드 개발을 시작하세요!**
