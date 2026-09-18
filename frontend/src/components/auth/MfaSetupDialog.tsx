import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { authAPI } from '@/api/auth.api';
import type { MfaSetupResponse } from '@/types/auth.types';
import { getApiErrorMessage } from '@/utils/api-error';

interface MfaSetupDialogProps {
  open: boolean;
  onSuccess: () => void;
  onLogout: () => void;
}

const MfaSetupDialog = ({ open, onSuccess, onLogout }: MfaSetupDialogProps) => {
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSetup(null);
    setCode('');
    setError('');
    setLoading(true);
    authAPI.setupMfa()
      .then(setSetup)
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'OTP 등록 정보를 생성하지 못했습니다.')))
      .finally(() => setLoading(false));
  }, [open]);

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Authenticator 앱의 6자리 코드를 입력해주세요.');
      return;
    }
    try {
      setConfirming(true);
      setError('');
      await authAPI.confirmMfaSetup(code);
      onSuccess();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'OTP 등록 확인에 실패했습니다.'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>OTP 2차 인증 등록</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          1. 휴대폰 Authenticator 앱에서 계정 추가를 선택하세요.<br />
          2. 아래 QR 코드를 스캔하세요.<br />
          3. 앱에 표시된 6자리 코드를 입력해 등록을 완료하세요.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
        {setup && (
          <>
            <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
              <Box component="img" src={setup.qrCode} alt="OTP 등록 QR 코드" sx={{ width: 240, height: 240 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              QR 스캔이 되지 않으면 수동 키를 입력할 수 있습니다: {setup.manualKey}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="등록 확인 코드"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ inputMode: 'numeric', maxLength: 6, autoComplete: 'one-time-code' }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onLogout} disabled={confirming}>로그아웃</Button>
        <Button onClick={() => void handleConfirm()} variant="contained" disabled={!setup || confirming || code.length !== 6}>
          {confirming ? '등록 중...' : 'OTP 등록 완료'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MfaSetupDialog;
