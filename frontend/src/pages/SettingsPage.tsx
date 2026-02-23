import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Checkbox,
  FormGroup,
  Divider,
} from '@mui/material';
import Grid from '@/mui-grid2';
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
        jiraEnabled: settings.jiraEnabled,
        jiraBaseUrl: settings.jiraBaseUrl ?? '',
        backupEnabled: settings.backupEnabled,
        backupScheduleType: settings.backupScheduleType ?? 'daily',
        backupScheduleHour: settings.backupScheduleHour ?? 2,
        backupScheduleDay: settings.backupScheduleDay ?? 1,
        backupTargetDb: settings.backupTargetDb,
        backupTargetDocs: settings.backupTargetDocs,
        backupDestLocal: settings.backupDestLocal,
        backupDestRemote: settings.backupDestRemote,
        backupRetentionCount: settings.backupRetentionCount ?? 7,
        sftpHost: settings.sftpHost ?? '',
        sftpUsername: settings.sftpUsername ?? '',
        sftpPassword: '',
        sftpKeyPath: settings.sftpKeyPath ?? '',
        sftpRemotePath: settings.sftpRemotePath ?? '',
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
            <Grid xs={12}>
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
            <Grid xs={12} sm={4}>
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
            <Grid xs={12} sm={4}>
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
            <Grid xs={12} sm={4}>
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
            <Grid xs={12}>
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
              <Grid xs={12} sm={6}>
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
            <Grid xs={12}>
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
                <Grid xs={12} sm={6}>
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
                <Grid xs={12} sm={6}>
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

        {/* 6. JIRA 연결 설정 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            6. JIRA 연결 설정
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            지원 로그의 JIRA 티켓 연동 기능을 설정합니다
          </Typography>
          <Grid container spacing={2}>
            <Grid xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.jiraEnabled || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jiraEnabled: e.target.checked,
                      })
                    }
                  />
                }
                label="JIRA 연동 기능 사용"
              />
            </Grid>
            {formData.jiraEnabled && (
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="JIRA URL"
                  value={formData.jiraBaseUrl || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, jiraBaseUrl: e.target.value })
                  }
                  variant="outlined"
                  size="small"
                  placeholder="http://192.168.0.1:8080"
                  helperText="JIRA 서버의 Base URL을 입력하세요 (예: http://IP:포트)"
                />
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* 7. 데이터 백업 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            7. 데이터 백업
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            DB와 점검서 파일을 주기적으로 백업합니다. 로컬 저장 또는 원격 SFTP 서버로 전송할 수 있습니다.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.backupEnabled ?? false}
                onChange={(e) => setFormData({ ...formData, backupEnabled: e.target.checked })}
                color="primary"
              />
            }
            label="백업 기능 활성화"
          />

          {formData.backupEnabled && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />

              {/* 백업 주기 */}
              <Typography variant="subtitle2" gutterBottom>백업 주기</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>주기</InputLabel>
                    <Select
                      value={formData.backupScheduleType ?? 'daily'}
                      label="주기"
                      onChange={(e) => setFormData({ ...formData, backupScheduleType: e.target.value })}
                    >
                      <MenuItem value="daily">매일</MenuItem>
                      <MenuItem value="weekly">매주</MenuItem>
                      <MenuItem value="monthly">매월</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {formData.backupScheduleType === 'weekly' && (
                  <Grid xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>요일</InputLabel>
                      <Select
                        value={formData.backupScheduleDay ?? 1}
                        label="요일"
                        onChange={(e) => setFormData({ ...formData, backupScheduleDay: Number(e.target.value) })}
                      >
                        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                          <MenuItem key={i} value={i}>{d}요일</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {formData.backupScheduleType === 'monthly' && (
                  <Grid xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>날짜</InputLabel>
                      <Select
                        value={formData.backupScheduleDay ?? 1}
                        label="날짜"
                        onChange={(e) => setFormData({ ...formData, backupScheduleDay: Number(e.target.value) })}
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <MenuItem key={d} value={d}>{d}일</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>실행 시간</InputLabel>
                    <Select
                      value={formData.backupScheduleHour ?? 2}
                      label="실행 시간"
                      onChange={(e) => setFormData({ ...formData, backupScheduleHour: Number(e.target.value) })}
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* 백업 항목 */}
              <Typography variant="subtitle2" gutterBottom>백업 항목</Typography>
              <FormGroup row sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.backupTargetDb ?? true}
                      onChange={(e) => setFormData({ ...formData, backupTargetDb: e.target.checked })}
                    />
                  }
                  label="DB"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.backupTargetDocs ?? true}
                      onChange={(e) => setFormData({ ...formData, backupTargetDocs: e.target.checked })}
                    />
                  }
                  label="점검서 파일"
                />
              </FormGroup>

              {/* 저장 경로 */}
              <Typography variant="subtitle2" gutterBottom>백업 저장 경로</Typography>
              <FormGroup row sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.backupDestLocal ?? true}
                      onChange={(e) => setFormData({ ...formData, backupDestLocal: e.target.checked })}
                    />
                  }
                  label="로컬 (운영 서버 내 backups/ 폴더)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.backupDestRemote ?? false}
                      onChange={(e) => setFormData({ ...formData, backupDestRemote: e.target.checked })}
                    />
                  }
                  label="원격 (SFTP)"
                />
              </FormGroup>

              {/* SFTP 설정 */}
              {formData.backupDestRemote && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>SFTP 서버 설정</Typography>
                  <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="서버 주소"
                        placeholder="192.168.0.100:22"
                        value={formData.sftpHost ?? ''}
                        onChange={(e) => setFormData({ ...formData, sftpHost: e.target.value })}
                        helperText="IP:포트 형식으로 입력 (예: 192.168.0.100:22)"
                      />
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="계정"
                        value={formData.sftpUsername ?? ''}
                        onChange={(e) => setFormData({ ...formData, sftpUsername: e.target.value })}
                      />
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="패스워드"
                        placeholder="변경 시에만 입력"
                        value={formData.sftpPassword ?? ''}
                        onChange={(e) => setFormData({ ...formData, sftpPassword: e.target.value })}
                        helperText="변경하지 않으려면 비워두세요"
                      />
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="SSH 키 파일 경로 (선택)"
                        placeholder="/home/user/.ssh/id_rsa"
                        value={formData.sftpKeyPath ?? ''}
                        onChange={(e) => setFormData({ ...formData, sftpKeyPath: e.target.value })}
                        helperText="SSH 키 인증 사용 시 서버 내 키 파일 경로 입력"
                      />
                    </Grid>
                    <Grid xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="원격 백업 경로"
                        placeholder="/home/backup/customer-vault"
                        value={formData.sftpRemotePath ?? ''}
                        onChange={(e) => setFormData({ ...formData, sftpRemotePath: e.target.value })}
                        helperText="원격 서버의 백업 기본 경로 (하위에 db-backup/, doc-backup/ 폴더 자동 생성)"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* 보관 개수 */}
              <Grid container spacing={2}>
                <Grid xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="보관 개수"
                    value={formData.backupRetentionCount ?? 7}
                    onChange={(e) => setFormData({ ...formData, backupRetentionCount: parseInt(e.target.value) || 7 })}
                    inputProps={{ min: 1, max: 365 }}
                    helperText="최근 N개의 백업 파일을 유지합니다 (로컬 적용)"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
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
