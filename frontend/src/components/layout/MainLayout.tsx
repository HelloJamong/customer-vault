import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authAPI } from '@/api/auth.api';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, '현재 패스워드를 입력해주세요'),
  newPassword: z.string().min(4, '새 패스워드는 최소 4자 이상이어야 합니다'),
  confirmPassword: z.string().min(1, '패스워드 확인을 입력해주세요'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '패스워드가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

const MainLayout = () => {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const [logAnchor, setLogAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const handleLogout = () => {
    setUserAnchor(null);
    logout();
  };

  const handlePasswordDialogOpen = () => {
    setUserAnchor(null);
    setPasswordDialogOpen(true);
    reset();
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    reset();
  };

  const onPasswordChangeSubmit = async (data: PasswordChangeForm) => {
    setIsSubmitting(true);
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      alert('패스워드가 성공적으로 변경되었습니다.');
      handlePasswordDialogClose();
    } catch (error: any) {
      const message = error.response?.data?.message || '패스워드 변경에 실패했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // role을 소문자로 변환하여 체크
  const userRole = user?.role?.toLowerCase();
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          width: '100%',
          height: 80,
          bgcolor: 'white',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Box
          sx={{
            maxWidth: '1440px',
            height: '100%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 5,
          }}
        >
          {/* Left: Logo + Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* Logo */}
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#1e293b',
              }}
            >
              CS Manager
            </Typography>

          {/* Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* 대시보드 */}
            <Button
              onClick={() => navigate('/dashboard')}
              sx={{
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: isActive('/dashboard') ? 600 : 500,
                color: isActive('/dashboard') ? '#2563eb' : '#64748b',
                bgcolor: isActive('/dashboard') ? '#eff6ff' : 'transparent',
                borderRadius: 1.5,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: isActive('/dashboard') ? '#eff6ff' : '#f8fafc',
                  color: '#0f172a',
                },
              }}
            >
              대시보드
            </Button>

            {/* 계정관리 Dropdown */}
            {isAdmin && (
              <>
                <Button
                  onClick={(e) => setAccountAnchor(e.currentTarget)}
                  endIcon={<KeyboardArrowDown sx={{ fontSize: '0.75rem' }} />}
                  sx={{
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#64748b',
                    textTransform: 'none',
                    '&:hover': {
                      color: '#0f172a',
                    },
                  }}
                >
                  계정관리
                </Button>
                <Menu
                  anchorEl={accountAnchor}
                  open={Boolean(accountAnchor)}
                  onClose={() => setAccountAnchor(null)}
                  sx={{
                    '& .MuiPaper-root': {
                      mt: 1,
                      minWidth: 192,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    },
                  }}
                >
                  {isSuperAdmin && (
                    <MenuItem
                      onClick={() => {
                        setAccountAnchor(null);
                        navigate('/users?role=super_admin');
                      }}
                      sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                    >
                      슈퍼관리자
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/users?role=admin');
                    }}
                    sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                  >
                    관리자
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/users?role=user');
                    }}
                    sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                  >
                    사용자
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* 고객사 관리 */}
            {isAdmin && (
              <Button
                onClick={() => navigate('/customers')}
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/customers') ? 600 : 500,
                  color: isActive('/customers') ? '#2563eb' : '#64748b',
                  bgcolor: isActive('/customers') ? '#eff6ff' : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    color: '#0f172a',
                  },
                }}
              >
                고객사 관리
              </Button>
            )}

            {/* 서비스 로그 Dropdown */}
            {isAdmin && (
              <>
                <Button
                  onClick={(e) => setLogAnchor(e.currentTarget)}
                  endIcon={<KeyboardArrowDown sx={{ fontSize: '0.75rem' }} />}
                  sx={{
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#64748b',
                    textTransform: 'none',
                    '&:hover': {
                      color: '#0f172a',
                    },
                  }}
                >
                  서비스 로그
                </Button>
                <Menu
                  anchorEl={logAnchor}
                  open={Boolean(logAnchor)}
                  onClose={() => setLogAnchor(null)}
                  sx={{
                    '& .MuiPaper-root': {
                      mt: 1,
                      minWidth: 192,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setLogAnchor(null);
                      navigate('/logs/login');
                    }}
                    sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                  >
                    로그인 이력
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setLogAnchor(null);
                      navigate('/logs/upload');
                    }}
                    sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                  >
                    업로드 이력
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setLogAnchor(null);
                      navigate('/logs/system');
                    }}
                    sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                  >
                    시스템 이력
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* 시스템 설정 */}
            {isSuperAdmin && (
              <Button
                onClick={() => navigate('/settings')}
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/settings') ? 600 : 500,
                  color: isActive('/settings') ? '#2563eb' : '#64748b',
                  bgcolor: isActive('/settings') ? '#eff6ff' : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    color: '#0f172a',
                  },
                }}
              >
                시스템 설정
              </Button>
            )}
          </Box>
        </Box>

        {/* Right: User Profile Dropdown */}
        <Box>
          <Button
            onClick={(e) => setUserAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDown sx={{ fontSize: '0.75rem', color: '#64748b' }} />}
            sx={{
              textTransform: 'none',
              color: '#334155',
              fontSize: '0.875rem',
              fontWeight: 500,
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
          >
            {user?.username || 'User'}
          </Button>
          <Menu
            anchorEl={userAnchor}
            open={Boolean(userAnchor)}
            onClose={() => setUserAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{
              '& .MuiPaper-root': {
                mt: 1.5,
                minWidth: 192,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              },
            }}
          >
            <MenuItem
              onClick={handlePasswordDialogOpen}
              sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
            >
              패스워드 변경
            </MenuItem>
            <Box sx={{ height: '1px', bgcolor: '#f1f5f9', my: 0.5 }} />
            <MenuItem
              onClick={handleLogout}
              sx={{
                fontSize: '0.875rem',
                color: '#dc2626',
                py: 1.25,
                px: 2,
                '&:hover': {
                  bgcolor: '#fef2f2',
                },
              }}
            >
              로그아웃
            </MenuItem>
          </Menu>
        </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          maxWidth: '1440px',
          margin: '0 auto',
          p: 5,
        }}
      >
        <Outlet />
      </Box>

      {/* 패스워드 변경 다이얼로그 */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handlePasswordDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            pb: 2,
          }}
        >
          패스워드 변경
        </DialogTitle>
        <form onSubmit={handleSubmit(onPasswordChangeSubmit)}>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography
                  component="label"
                  sx={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    mb: 0.5,
                  }}
                >
                  현재 패스워드
                </Typography>
                <TextField
                  {...register('currentPassword')}
                  type="password"
                  fullWidth
                  placeholder="현재 패스워드를 입력해주세요"
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6366f1',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  sx={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    mb: 0.5,
                  }}
                >
                  새 패스워드
                </Typography>
                <TextField
                  {...register('newPassword')}
                  type="password"
                  fullWidth
                  placeholder="새 패스워드를 입력해주세요"
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6366f1',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  sx={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    mb: 0.5,
                  }}
                >
                  패스워드 재확인
                </Typography>
                <TextField
                  {...register('confirmPassword')}
                  type="password"
                  fullWidth
                  placeholder="패스워드를 다시 입력해주세요"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6366f1',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
            <Button
              onClick={handlePasswordDialogClose}
              disabled={isSubmitting}
              sx={{
                color: '#64748b',
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
                py: 1,
                '&:hover': {
                  bgcolor: '#f8fafc',
                },
              }}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                bgcolor: '#6366f1',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#4f46e5',
                  boxShadow: 'none',
                },
              }}
            >
              {isSubmitting ? '변경 중...' : '저장'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default MainLayout;
