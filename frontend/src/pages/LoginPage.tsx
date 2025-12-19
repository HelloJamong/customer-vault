import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { isAuthenticated } from '@/store/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import symbolLogo from '@/assets/images/symbol.svg';

const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, '패스워드를 입력해주세요'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const authenticated = isAuthenticated();
  const { login, isLoginLoading } = useAuth();
  const location = useLocation();
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = (data: LoginForm) => {
    login(data);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: '#f8fafc', // slate-50
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '448px', // max-w-md in Tailwind
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 4,
          }}
        >
          <Box
            component="img"
            src={symbolLogo}
            alt="Customer Vault Logo"
            sx={{
              width: 120,
              height: 120,
            }}
          />
        </Box>

        {/* Login Card */}
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            bgcolor: 'white',
            borderRadius: 4, // rounded-2xl
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', // shadow-xl
            p: 5,
          }}
        >
          {/* Card Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b', // slate-500
              }}
            >
              로그인하여 시작하세요.
            </Typography>
          </Box>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {passwordChanged && (
              <Alert severity="success" sx={{ mb: 3 }}>
                비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.
              </Alert>
            )}
            <Box sx={{ mb: 3 }}>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155', // slate-700
                  mb: 0.5,
                }}
              >
                아이디
              </Typography>
              <TextField
                {...register('username')}
                fullWidth
                placeholder="아이디를 입력해주세요"
                error={!!errors.username}
                helperText={errors.username?.message}
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#f8fafc', // slate-50
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#e2e8f0', // slate-200
                    },
                    '&:hover fieldset': {
                      borderColor: '#cbd5e1', // slate-300
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#6366f1', // indigo-500
                      borderWidth: 2,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 1.5,
                    color: '#0f172a', // slate-900
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#94a3b8', // slate-400
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 5 }}>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155', // slate-700
                  mb: 0.5,
                }}
              >
                패스워드
              </Typography>
              <TextField
                {...register('password')}
                type="password"
                fullWidth
                placeholder="패스워드를 입력해주세요"
                error={!!errors.password}
                helperText={errors.password?.message}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#f8fafc', // slate-50
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#e2e8f0', // slate-200
                    },
                    '&:hover fieldset': {
                      borderColor: '#cbd5e1', // slate-300
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#6366f1', // indigo-500
                      borderWidth: 2,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 1.5,
                    color: '#0f172a', // slate-900
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#94a3b8', // slate-400
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoginLoading}
              sx={{
                bgcolor: '#6366f1', // indigo-600
                color: 'white',
                fontWeight: 600,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#4f46e5', // indigo-700
                  boxShadow: 'none',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
                '&:focus': {
                  outline: '2px solid #6366f1',
                  outlineOffset: '2px',
                },
                transition: 'all 0.2s',
              }}
            >
              {isLoginLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </Paper>

        {/* Footer Note */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography
            variant="body2"
            sx={{
              color: '#64748b', // slate-500
              fontSize: '0.875rem',
            }}
          >
            계정 발급은 관리자에게 문의 부탁드립니다.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
