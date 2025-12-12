import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import { useSettings } from '../hooks/useSettings';
import type { UpdateSettingsRequest } from '../types/settings.types';

const SettingsPage = () => {
  const { settings, loading, error, updateSettings } = useSettings();
  const [formData, setFormData] = useState<UpdateSettingsRequest>({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultPassword: settings.defaultPassword,
        passwordMinLength: settings.passwordMinLength,
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireSpecial: settings.passwordRequireSpecial,
        passwordRequireNumber: settings.passwordRequireNumber,
        passwordExpiryEnabled: settings.passwordExpiryEnabled,
        passwordExpiryDays: settings.passwordExpiryDays,
        preventDuplicateLogin: settings.preventDuplicateLogin,
        loginFailureLimitEnabled: settings.loginFailureLimitEnabled,
        loginFailureLimit: settings.loginFailureLimit,
        accountLockMinutes: settings.accountLockMinutes,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(formData);
      setSnackbar({
        open: true,
        message: '시스템 설정이 저장되었습니다.',
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || '설정 저장에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        시스템 설정
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        시스템 전반적인 설정을 관리합니다
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* 1. 초기 패스워드 설정 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            1. 초기 패스워드 설정
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            신규 계정 생성 및 패스워드 초기화 시 사용되는 기본 패스워드입니다
          </Typography>
          <TextField
            fullWidth
            label="초기 패스워드"
            value={formData.defaultPassword || ''}
            onChange={(e) =>
              setFormData({ ...formData, defaultPassword: e.target.value })
            }
            variant="outlined"
            size="small"
          />
        </Paper>

        {/* 2. 패스워드 복잡성 설정 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            2. 패스워드 복잡성 설정
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            패스워드 생성 시 적용되는 복잡성 규칙을 설정합니다
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>패스워드 최소 자릿수</InputLabel>
                <Select
                  value={formData.passwordMinLength || 8}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passwordMinLength: Number(e.target.value),
                    })
                  }
                  label="패스워드 최소 자릿수"
                >
                  {Array.from({ length: 13 }, (_, i) => i + 8).map((length) => (
                    <MenuItem key={length} value={length}>
                      {length}자
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.passwordRequireUppercase || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordRequireUppercase: e.target.checked,
                      })
                    }
                  />
                }
                label="대문자 필수"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.passwordRequireSpecial || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordRequireSpecial: e.target.checked,
                      })
                    }
                  />
                }
                label="특수문자 필수"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.passwordRequireNumber || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordRequireNumber: e.target.checked,
                      })
                    }
                  />
                }
                label="숫자 필수"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* 3. 패스워드 변경 주기 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            3. 패스워드 변경 주기
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            정기적인 패스워드 변경을 강제합니다
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.passwordExpiryEnabled || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordExpiryEnabled: e.target.checked,
                      })
                    }
                  />
                }
                label="패스워드 변경 주기 활성화"
              />
            </Grid>
            {formData.passwordExpiryEnabled && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>변경 주기</InputLabel>
                  <Select
                    value={formData.passwordExpiryDays || 90}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordExpiryDays: Number(e.target.value),
                      })
                    }
                    label="변경 주기"
                  >
                    <MenuItem value={7}>7일</MenuItem>
                    <MenuItem value={30}>30일</MenuItem>
                    <MenuItem value={60}>60일</MenuItem>
                    <MenuItem value={90}>90일</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* 4. 중복 로그인 방지 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            4. 중복 로그인 방지
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            동일 계정의 다중 세션 접속을 제어합니다
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.preventDuplicateLogin || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preventDuplicateLogin: e.target.checked,
                  })
                }
              />
            }
            label="활성화 시 새로운 세션 로그인 시 기존 세션을 자동으로 종료합니다"
          />
        </Paper>

        {/* 5. 로그인 실패 횟수 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            5. 로그인 실패 횟수 제한
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            연속된 로그인 실패 시 계정을 일시적으로 잠금합니다
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.loginFailureLimitEnabled || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loginFailureLimitEnabled: e.target.checked,
                      })
                    }
                  />
                }
                label="로그인 실패 횟수 제한 활성화"
              />
            </Grid>
            {formData.loginFailureLimitEnabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>최대 실패 횟수</InputLabel>
                    <Select
                      value={formData.loginFailureLimit || 5}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loginFailureLimit: Number(e.target.value),
                        })
                      }
                      label="최대 실패 횟수"
                    >
                      {[1, 2, 3, 4, 5].map((count) => (
                        <MenuItem key={count} value={count}>
                          {count}회
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>계정 잠금 시간</InputLabel>
                    <Select
                      value={formData.accountLockMinutes || 10}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          accountLockMinutes: Number(e.target.value),
                        })
                      }
                      label="계정 잠금 시간"
                    >
                      {[5, 10, 15, 20, 25, 30].map((minutes) => (
                        <MenuItem key={minutes} value={minutes}>
                          {minutes}분
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        {/* 저장 버튼 */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSave}
            disabled={saving}
            sx={{ minWidth: 120 }}
          >
            {saving ? <CircularProgress size={24} /> : '저장'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;
