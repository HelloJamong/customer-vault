import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { authAPI } from '@/api/auth.api';
import type { LoginResponse } from '@/types/auth.types';
import { getApiErrorMessage } from '@/utils/api-error';

interface MfaVerifyDialogProps {
  open: boolean;
  challengeToken: string | null;
  onSuccess: (data: LoginResponse) => void;
  onCancel: () => void;
}

const MfaVerifyDialog = ({ open, challengeToken, onSuccess, onCancel }: MfaVerifyDialogProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!challengeToken || !/^\d{6}$/.test(code)) {
      setError('Authenticator 앱의 6자리 코드를 입력해주세요.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const result = await authAPI.verifyMfa(challengeToken, code);
      setCode('');
      onSuccess(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'OTP 코드가 올바르지 않습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>OTP 코드 입력</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          휴대폰의 Google Authenticator 또는 Microsoft Authenticator에 표시된 6자리 코드를 입력해주세요.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          fullWidth
          label="OTP 코드"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputProps={{ inputMode: 'numeric', maxLength: 6, autoComplete: 'one-time-code' }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSubmit();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={submitting}>취소</Button>
        <Button onClick={() => void handleSubmit()} variant="contained" disabled={submitting || code.length !== 6}>
          {submitting ? '확인 중...' : '확인'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MfaVerifyDialog;
