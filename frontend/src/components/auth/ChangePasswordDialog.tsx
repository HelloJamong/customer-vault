import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import apiClient from '@/api/axios';

interface ChangePasswordDialogProps {
  open: boolean;
  isForced?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
}

interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireSpecial: boolean;
  requireNumber: boolean;
}

const ChangePasswordDialog = ({
  open,
  isForced = false,
  onClose,
  onSuccess,
}: ChangePasswordDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [requirements, setRequirements] = useState<PasswordRequirements | null>(null);

  useEffect(() => {
    if (open) {
      fetchPasswordRequirements();
    }
  }, [open]);

  const fetchPasswordRequirements = async () => {
    try {
      const { data } = await apiClient.get('/auth/password-requirements');
      setRequirements(data);
    } catch (error) {
      console.error('비밀번호 요구사항 조회 실패:', error);
    }
  };

  const validatePassword = () => {
    if (!requirements) return true;

    const checks = [
      {
        valid: newPassword.length >= requirements.minLength,
        message: `최소 ${requirements.minLength}자 이상`,
      },
      {
        valid: newPassword.length <= requirements.maxLength,
        message: `최대 ${requirements.maxLength}자 이하`,
      },
      {
        valid: !requirements.requireUppercase || /[A-Z]/.test(newPassword),
        message: '대문자 포함',
      },
      {
        valid: !requirements.requireSpecial || /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
        message: '특수문자 포함',
      },
      {
        valid: !requirements.requireNumber || /[0-9]/.test(newPassword),
        message: '숫자 포함',
      },
    ];

    return checks;
  };

  const handleSubmit = async () => {
    setError('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (error: any) {
      console.error('비밀번호 변경 실패:', error);
      const errorMessage = error.response?.data?.message || '비밀번호 변경에 실패했습니다.';
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    if (isForced) {
      return; // 강제 변경 모드에서는 닫기 불가
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose?.();
  };

  const passwordChecks = validatePassword();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isForced}
    >
      <DialogTitle>
        {isForced ? '비밀번호 변경 필요' : '비밀번호 변경'}
      </DialogTitle>
      <DialogContent>
        {isForced && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            최초 로그인 또는 비밀번호 초기화 후에는 반드시 비밀번호를 변경해야 합니다.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="현재 비밀번호"
          type="password"
          fullWidth
          margin="normal"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />

        <TextField
          label="새 비밀번호"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />

        <TextField
          label="새 비밀번호 확인"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        {requirements && newPassword && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              비밀번호 요구사항:
            </Typography>
            <List dense>
              {passwordChecks.map((check, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {check.valid ? (
                      <Check color="success" fontSize="small" />
                    ) : (
                      <Close color="error" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={check.message}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: check.valid ? 'success.main' : 'error.main',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!isForced && (
          <Button onClick={handleClose}>취소</Button>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            !currentPassword ||
            !newPassword ||
            !confirmPassword ||
            newPassword !== confirmPassword ||
            (requirements && passwordChecks.some((check) => !check.valid))
          }
        >
          변경
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
