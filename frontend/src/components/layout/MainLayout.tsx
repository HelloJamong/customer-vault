import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Menu, MenuItem } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';

const MainLayout = () => {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const [logAnchor, setLogAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isForcedPasswordChange, setIsForcedPasswordChange] = useState(false);

  useEffect(() => {
    if (user?.isFirstLogin) {
      setIsForcedPasswordChange(true);
      setPasswordDialogOpen(true);
    }
  }, [user?.isFirstLogin]);

  const handleLogout = () => {
    setUserAnchor(null);
    logout({});
  };

  const handlePasswordDialogOpen = () => {
    setUserAnchor(null);
    setIsForcedPasswordChange(false);
    setPasswordDialogOpen(true);
  };

  const handlePasswordDialogClose = () => {
    if (isForcedPasswordChange) {
      return;
    }
    setPasswordDialogOpen(false);
  };

  const handlePasswordChangeSuccess = () => {
    alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
    setPasswordDialogOpen(false);
    logout({ redirectState: { passwordChanged: true } });
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
                        navigate('/super-admins');
                      }}
                      sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                    >
                      슈퍼관리자
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/admins');
                    }}
                    sx={{ fontSize: '0.875rem', color: '#334155', py: 1.25, px: 2 }}
                  >
                    관리자
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/users');
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

      <ChangePasswordDialog
        open={passwordDialogOpen}
        isForced={isForcedPasswordChange}
        onClose={handlePasswordDialogClose}
        onSuccess={handlePasswordChangeSuccess}
      />
    </Box>
  );
};

export default MainLayout;
