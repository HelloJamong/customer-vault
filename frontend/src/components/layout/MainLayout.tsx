import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Menu, MenuItem, Typography, Tooltip, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { KeyboardArrowDown, DarkMode, LightMode } from '@mui/icons-material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useColorMode } from '@/hooks/useColorMode';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';
import NotificationBell from '@/components/layout/NotificationBell';
import { NoticePopup } from '@/components/NoticePopup';
import { noticesApi, type Notice } from '@/api/notices.api';
import headerLogo from '@/assets/images/logo.svg';

// 다크모드에서도 알파 블렌딩으로 자연스럽게 배경에 녹아들도록 고정 색상 대신 투명도로 표현
const NAV_ACTIVE_BG = alpha('#2563eb', 0.1);
const LOGOUT_HOVER_BG = alpha('#dc2626', 0.08);

const MainLayout = () => {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle: toggleColorMode } = useColorMode();

  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const [logAnchor, setLogAnchor] = useState<null | HTMLElement>(null);
  const [workStatusAnchor, setWorkStatusAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const userRequiresPasswordChange = Boolean(user?.passwordExpired || user?.isFirstLogin);
  const isForcedPasswordChange = userRequiresPasswordChange;
  const forcedPasswordMessage = user?.passwordExpired
    ? '비밀번호 사용 기간이 만료되었습니다. 계속하려면 비밀번호를 변경해야 합니다.'
    : undefined;
  const effectivePasswordDialogOpen = passwordDialogOpen || userRequiresPasswordChange;

  // 공지사항 팝업 관련 상태
  const [unreadNotices, setUnreadNotices] = useState<Notice[]>([]);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [noticePopupOpen, setNoticePopupOpen] = useState(false);
  // 팝업은 세션당 1회만 자동 표시 (닫은 뒤 재표시되지 않도록)
  const noticeAutoShownRef = useRef(false);

  // 읽지 않은 공지사항 조회 (슈퍼 관리자 제외) — 사용자당 1회
  useEffect(() => {
    if (!user || user.role?.toLowerCase() === 'super_admin') return;

    noticesApi
      .getUnreadNotices()
      .then((notices) => {
        if (notices.length > 0) {
          // 가장 최신 공지사항 1개만 표시
          setUnreadNotices([notices[0]]);
          setCurrentNoticeIndex(0);
        }
      })
      .catch((error) => {
        console.error('읽지 않은 공지사항 조회 실패:', error);
      });
  }, [user]);

  // 비밀번호 변경 다이얼로그가 없거나 닫힌 뒤에 공지 팝업을 1회만 표시
  useEffect(() => {
    if (!effectivePasswordDialogOpen && unreadNotices.length > 0 && !noticeAutoShownRef.current) {
      noticeAutoShownRef.current = true;
      const timer = window.setTimeout(() => setNoticePopupOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [effectivePasswordDialogOpen, unreadNotices.length]);

  const handleLogout = () => {
    setUserAnchor(null);
    logout({});
  };

  const handlePasswordDialogOpen = () => {
    setUserAnchor(null);
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

  const handleNoticePopupClose = async (dontShowAgain: boolean) => {
    const currentNotice = unreadNotices[currentNoticeIndex];
    if (!currentNotice) return;

    try {
      // "다시 보지 않기"를 체크한 경우에만 읽음으로 표시
      if (dontShowAgain) {
        await noticesApi.markAsRead(currentNotice.id, dontShowAgain);
      }

      // 팝업 닫기
      setNoticePopupOpen(false);
      setUnreadNotices([]);
      setCurrentNoticeIndex(0);
    } catch (error) {
      console.error('공지사항 읽음 처리 실패:', error);
      setNoticePopupOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // role을 소문자로 변환하여 체크
  const userRole = user?.role?.toLowerCase();
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const canManageCustomers = isAdmin || userRole === 'user';

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          width: '100%',
          height: 80,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
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
            <Box
              component="img"
              src={headerLogo}
              alt="Customer Vault"
              sx={{
                height: 40,
                cursor: 'pointer',
              }}
              onClick={() => navigate('/dashboard')}
            />

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
                color: isActive('/dashboard') ? 'primary.main' : 'text.secondary',
                bgcolor: isActive('/dashboard') ? NAV_ACTIVE_BG : 'transparent',
                borderRadius: 1.5,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: isActive('/dashboard') ? NAV_ACTIVE_BG : 'action.hover',
                  color: 'text.primary',
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
                    color: 'text.secondary',
                    textTransform: 'none',
                    '&:hover': {
                      color: 'text.primary',
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
                      border: 1, borderColor: 'divider',
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
                      sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                    >
                      슈퍼관리자
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/admins');
                    }}
                    sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                  >
                    관리자
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/users');
                    }}
                    sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                  >
                    사용자
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* 고객사 관리 */}
            {canManageCustomers && (
              <Button
                onClick={() => navigate('/customers')}
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/customers') ? 600 : 500,
                  color: isActive('/customers') ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive('/customers') ? NAV_ACTIVE_BG : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                고객사 관리
              </Button>
            )}

            {/* 업무 현황 Dropdown */}
            {isAdmin && (
              <>
                <Button
                  onClick={(e) => setWorkStatusAnchor(e.currentTarget)}
                  endIcon={<KeyboardArrowDown sx={{ fontSize: '0.75rem' }} />}
                  sx={{
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: location.pathname.startsWith('/work-status') ? 'primary.main' : 'text.secondary',
                    textTransform: 'none',
                    '&:hover': {
                      color: 'text.primary',
                    },
                  }}
                >
                  업무 현황
                </Button>
                <Menu
                  anchorEl={workStatusAnchor}
                  open={Boolean(workStatusAnchor)}
                  onClose={() => setWorkStatusAnchor(null)}
                  sx={{
                    '& .MuiPaper-root': {
                      mt: 1,
                      minWidth: 192,
                      borderRadius: 2,
                      border: 1, borderColor: 'divider',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setWorkStatusAnchor(null);
                      navigate('/work-status/inspections');
                    }}
                    selected={location.pathname === '/work-status/inspections'}
                    sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                  >
                    점검 현황
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setWorkStatusAnchor(null);
                      navigate('/work-status/assignments');
                    }}
                    selected={location.pathname === '/work-status/assignments'}
                    sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                  >
                    고객사 담당 현황
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* 공지사항 */}
            <Button
              onClick={() => navigate('/notices')}
              sx={{
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: isActive('/notices') ? 600 : 500,
                color: isActive('/notices') ? 'primary.main' : 'text.secondary',
                bgcolor: isActive('/notices') ? NAV_ACTIVE_BG : 'transparent',
                borderRadius: 1.5,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: isActive('/notices') ? NAV_ACTIVE_BG : 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              공지사항
            </Button>

            {/* 점검서 업로드 (사용자 전용) */}
            {userRole === 'user' && (
              <Button
                onClick={() => navigate('/documents')}
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/documents') ? 600 : 500,
                  color: isActive('/documents') ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive('/documents') ? NAV_ACTIVE_BG : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                점검서 업로드
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
                    color: 'text.secondary',
                    textTransform: 'none',
                    '&:hover': {
                      color: 'text.primary',
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
                      border: 1, borderColor: 'divider',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setLogAnchor(null);
                      navigate('/logs/login');
                    }}
                    sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                  >
                    로그인 이력
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setLogAnchor(null);
                      navigate('/logs/upload');
                    }}
                    sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                  >
                    업로드 이력
                  </MenuItem>
                  {isSuperAdmin && (
                    <MenuItem
                      onClick={() => {
                        setLogAnchor(null);
                        navigate('/logs/system');
                      }}
                      sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
                    >
                      시스템 이력
                    </MenuItem>
                  )}
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
                  color: isActive('/settings') ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive('/settings') ? NAV_ACTIVE_BG : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                시스템 설정
              </Button>
            )}

            {/* 백업 관리 */}
            {isSuperAdmin && (
              <Button
                onClick={() => navigate('/backup')}
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/backup') ? 600 : 500,
                  color: isActive('/backup') ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive('/backup') ? NAV_ACTIVE_BG : 'transparent',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                백업 관리
              </Button>
            )}
          </Box>
        </Box>

        {/* Right: Color Mode Toggle + Notification Bell + User Profile Dropdown */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 다크모드 / 라이트모드 전환 */}
          <Tooltip title={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ color: 'text.secondary' }}>
              {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <Button
            onClick={(e) => setUserAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDown sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />}
            sx={{
              textTransform: 'none',
              color: 'text.primary',
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
                border: 1, borderColor: 'divider',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              },
            }}
          >
            <MenuItem
              onClick={handlePasswordDialogOpen}
              sx={{ fontSize: '0.875rem', color: 'text.primary', py: 1.25, px: 2 }}
            >
              패스워드 변경
            </MenuItem>
            <Box sx={{ height: '1px', bgcolor: 'divider', my: 0.5 }} />
            <MenuItem
              onClick={handleLogout}
              sx={{
                fontSize: '0.875rem',
                color: 'error.main',
                py: 1.25,
                px: 2,
                '&:hover': {
                  bgcolor: LOGOUT_HOVER_BG,
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
          width: '100%',
          margin: '0 auto',
          p: 5,
          flexGrow: 1,
        }}
      >
        <Outlet />
      </Box>

      <ChangePasswordDialog
        open={effectivePasswordDialogOpen}
        isForced={isForcedPasswordChange}
        forcedMessage={forcedPasswordMessage}
        onClose={handlePasswordDialogClose}
        onSuccess={handlePasswordChangeSuccess}
      />

      {/* 공지사항 팝업 */}
      {unreadNotices.length > 0 && (
        <NoticePopup
          notice={unreadNotices[currentNoticeIndex]}
          open={noticePopupOpen}
          onClose={handleNoticePopupClose}
        />
      )}

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          width: '100%',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          py: 2,
          px: 5,
        }}
      >
        <Box
          sx={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.disabled">
            © {new Date().getFullYear()} Customer Vault. All rights reserved.
            {import.meta.env.VITE_APP_VERSION && import.meta.env.VITE_APP_VERSION !== 'dev' && (
              <Box component="span" sx={{ ml: 1.5 }}>
                {import.meta.env.VITE_APP_VERSION}
              </Box>
            )}
          </Typography>
          <Tooltip title="GitHub 저장소">
            <IconButton
              component="a"
              href="https://github.com/HelloJamong/customer-vault"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
