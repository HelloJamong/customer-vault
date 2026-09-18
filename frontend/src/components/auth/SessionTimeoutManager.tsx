import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { authAPI } from '@/api/auth.api';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';

const SESSION_WARNING_SECONDS = 60;

export const SessionTimeoutManager = () => {
  const {
    user,
    sessionExpiresAt,
    sessionTimeoutMinutes,
    sessionWarningEnabled,
    setSessionPolicy,
  } = useAuthStore();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [extending, setExtending] = useState(false);

  const logoutLocally = useCallback(() => {
    useAuthStore.getState().logout();
    queryClient.clear();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  // 새로고침 후 저장된 인증 상태에 세션 정책이 없으면 서버에서 다시 조회한다.
  useEffect(() => {
    if (!user || sessionExpiresAt) return undefined;

    let cancelled = false;
    void authAPI.getSessionPolicy()
      .then((policy) => {
        if (!cancelled) setSessionPolicy(policy);
      })
      .catch(() => {
        if (!cancelled) logoutLocally();
      });

    return () => {
      cancelled = true;
    };
  }, [logoutLocally, sessionExpiresAt, setSessionPolicy, user]);

  useEffect(() => {
    if (!user || !sessionExpiresAt || !sessionTimeoutMinutes) return undefined;

    let expired = false;
    const handleActivity = (event: Event) => {
      const detail = (event as CustomEvent<{
        sessionExpiresAt?: string;
        warningEnabled?: boolean;
      }>).detail;
      const sessionExpiresAtFromResponse = detail?.sessionExpiresAt;
      if (sessionExpiresAtFromResponse) {
        const current = useAuthStore.getState();
        setSessionPolicy({
          timeoutMinutes: current.sessionTimeoutMinutes ?? sessionTimeoutMinutes,
          warningEnabled: detail.warningEnabled ?? current.sessionWarningEnabled,
          warningSeconds: SESSION_WARNING_SECONDS,
          expiresAt: sessionExpiresAtFromResponse,
        });
      }
    };

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(sessionExpiresAt).getTime() - Date.now()) / 1000));
      if (seconds === 0) {
        if (!expired) {
          expired = true;
          setRemainingSeconds(null);
          logoutLocally();
        }
        return;
      }

      setRemainingSeconds(
        sessionWarningEnabled && seconds <= SESSION_WARNING_SECONDS ? seconds : null,
      );
    };

    window.addEventListener('session-activity', handleActivity);
    tick();
    const timer = window.setInterval(tick, 250);

    return () => {
      window.removeEventListener('session-activity', handleActivity);
      window.clearInterval(timer);
    };
  }, [logoutLocally, sessionExpiresAt, sessionTimeoutMinutes, sessionWarningEnabled, setSessionPolicy, user]);

  const handleExtend = async () => {
    try {
      setExtending(true);
      const policy = await authAPI.extendSession();
      setSessionPolicy(policy);
      setRemainingSeconds(null);
    } catch {
      logoutLocally();
    } finally {
      setExtending(false);
    }
  };

  return (
    <Dialog
      open={remainingSeconds !== null}
      disableEscapeKeyDown
      onClose={() => undefined}
      aria-labelledby="session-timeout-title"
    >
      <DialogTitle id="session-timeout-title">세션 만료 안내</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          보안을 위해 세션이 자동으로 종료됩니다.
        </Alert>
        <Typography>
          {remainingSeconds ?? SESSION_WARNING_SECONDS}초 후 로그아웃됩니다.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleExtend} variant="contained" disabled={extending} autoFocus>
          {extending ? <CircularProgress size={20} /> : '로그인 연장하기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
