import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';

interface ServerConfig {
  managementServer: number;
  securityGatewayServer: number;
  integratedServer: number;
}

interface HRIntegration {
  enabled: boolean;
  dbType: string;
  dbVersion: string;
}

interface SourceManagement {
  id?: number;
  customerId: number;
  clientVersion: string;
  clientCustomInfo: string;
  virtualPcOsVersion: string;
  virtualPcBuildVersion: string;
  virtualPcGuestAddition: string;
  virtualPcImageInfo: string;
  adminWebReleaseDate: string;
  adminWebCustomInfo: string;
  redundancyType: '이중화 구성' | '단일 구성';
  serverConfig: ServerConfig;
  hrIntegration: HRIntegration;
}

const CustomerSourceManagementEditPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [customerName, setCustomerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<SourceManagement>({
    customerId: Number(customerId),
    clientVersion: '',
    clientCustomInfo: '',
    virtualPcOsVersion: '',
    virtualPcBuildVersion: '',
    virtualPcGuestAddition: '',
    virtualPcImageInfo: '',
    adminWebReleaseDate: '',
    adminWebCustomInfo: '',
    redundancyType: '단일 구성',
    serverConfig: {
      managementServer: 0,
      securityGatewayServer: 0,
      integratedServer: 0,
    },
    hrIntegration: {
      enabled: false,
      dbType: '',
      dbVersion: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 고객사 이름 조회
        const customerResponse = await apiClient.get(`/customers/${customerId}`);
        setCustomerName(customerResponse.data.name);

        // 소스 관리 정보 조회
        try {
          const sourceResponse = await apiClient.get(`/customers/${customerId}/source-management`);
          if (sourceResponse.data) {
            setFormData(sourceResponse.data);
          }
        } catch (error: any) {
          // 404인 경우 새로 생성
          if (error.response?.status !== 404) {
            throw error;
          }
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // customerId와 id를 제외한 데이터만 전송
      const { id, customerId: _, ...dataToSend } = formData;

      if (id) {
        // 수정
        await apiClient.put(`/customers/${customerId}/source-management`, dataToSend);
      } else {
        // 신규 생성
        await apiClient.post(`/customers/${customerId}/source-management`, dataToSend);
      }
      alert('저장되었습니다.');
      navigate(`/customers/${customerId}/source-management`);
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatReleaseDate = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    // Release 접두사 추가
    if (numbers.length === 0) return '';
    return `Release ${numbers.slice(0, 6)}`;
  };

  const handleReleaseDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // "Release " 제거하고 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    setFormData({ ...formData, adminWebReleaseDate: numbers });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/customers/${customerId}/source-management`)}
          >
            취소
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {customerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              형상 관리 {formData.id ? '수정' : '등록'}
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={isSaving}>
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </Box>

      {/* 클라이언트 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          클라이언트 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="클라이언트 버전"
            value={formData.clientVersion}
            onChange={(e) => setFormData({ ...formData, clientVersion: e.target.value })}
            placeholder="예: v1.0.0"
          />
        </Box>
        <Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="클라이언트 커스텀 정보"
            value={formData.clientCustomInfo}
            onChange={(e) => setFormData({ ...formData, clientCustomInfo: e.target.value })}
            placeholder="커스텀 정보를 입력하세요"
          />
        </Box>
      </Paper>

      {/* 가상PC 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          가상PC 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>OS 버전</InputLabel>
              <Select
                value={formData.virtualPcOsVersion}
                label="OS 버전"
                onChange={(e) => setFormData({ ...formData, virtualPcOsVersion: e.target.value })}
              >
                <MenuItem value="">선택 안 함</MenuItem>
                <MenuItem value="Windows10">Windows10</MenuItem>
                <MenuItem value="Windows11">Windows11</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="빌드 버전"
              value={formData.virtualPcBuildVersion}
              onChange={(e) => setFormData({ ...formData, virtualPcBuildVersion: e.target.value })}
              placeholder="예: 19045"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="GuestAddition 버전"
              value={formData.virtualPcGuestAddition}
              onChange={(e) => setFormData({ ...formData, virtualPcGuestAddition: e.target.value })}
              placeholder="예: 7.0.12"
            />
          </Grid>
        </Grid>

        <Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="가상PC 이미지 정보"
            value={formData.virtualPcImageInfo}
            onChange={(e) => setFormData({ ...formData, virtualPcImageInfo: e.target.value })}
            placeholder="가상PC 이미지 정보를 입력하세요"
          />
        </Box>
      </Paper>

      {/* 관리웹 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          관리웹 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="관리웹 소스 릴리즈 날짜"
            value={formatReleaseDate(formData.adminWebReleaseDate)}
            onChange={handleReleaseDateChange}
            placeholder="Release 251219"
            helperText="숫자 6자리 입력 (예: 251219 → Release 251219)"
          />
        </Box>
        <Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="관리웹 커스텀 정보"
            value={formData.adminWebCustomInfo}
            onChange={(e) => setFormData({ ...formData, adminWebCustomInfo: e.target.value })}
            placeholder="커스텀 정보를 입력하세요"
          />
        </Box>
      </Paper>

      {/* 서버 구성 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          서버 구성
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>이중화 구성 여부</InputLabel>
              <Select
                value={formData.redundancyType}
                label="이중화 구성 여부"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    redundancyType: e.target.value as '이중화 구성' | '단일 구성',
                  })
                }
              >
                <MenuItem value="단일 구성">단일 구성</MenuItem>
                <MenuItem value="이중화 구성">이중화 구성</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="관리서버"
              value={formData.serverConfig.managementServer}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serverConfig: {
                    ...formData.serverConfig,
                    managementServer: Number(e.target.value),
                  },
                })
              }
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="보안게이트웨이서버"
              value={formData.serverConfig.securityGatewayServer}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serverConfig: {
                    ...formData.serverConfig,
                    securityGatewayServer: Number(e.target.value),
                  },
                })
              }
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="통합서버"
              value={formData.serverConfig.integratedServer}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serverConfig: {
                    ...formData.serverConfig,
                    integratedServer: Number(e.target.value),
                  },
                })
              }
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 인사연동 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          인사연동
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>인사연동 여부</InputLabel>
              <Select
                value={formData.hrIntegration.enabled ? '사용' : '미사용'}
                label="인사연동 여부"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hrIntegration: {
                      ...formData.hrIntegration,
                      enabled: e.target.value === '사용',
                    },
                  })
                }
              >
                <MenuItem value="미사용">미사용</MenuItem>
                <MenuItem value="사용">사용</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {formData.hrIntegration.enabled && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="인사DB 종류"
                  value={formData.hrIntegration.dbType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hrIntegration: {
                        ...formData.hrIntegration,
                        dbType: e.target.value,
                      },
                    })
                  }
                  placeholder="예: Oracle, MySQL, MS-SQL"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="인사DB 버전"
                  value={formData.hrIntegration.dbVersion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hrIntegration: {
                        ...formData.hrIntegration,
                        dbVersion: e.target.value,
                      },
                    })
                  }
                  placeholder="예: 19c, 8.0, 2019"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default CustomerSourceManagementEditPage;
