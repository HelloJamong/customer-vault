import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';

interface ServerInfo {
  id?: number;
  serverType: string;
  manufacturer?: string;
  modelName?: string;
  hostname?: string;
  serialNumber?: string;
  osVersion?: string;
  cpuType?: string;
  memoryCapacity?: string;
  diskCapacity?: string;
  nicFiberCount?: number;
  nicUtpCount?: number;
  powerSupplyCount?: number;
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
  servers?: ServerInfo[];
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
    servers: [],
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
    // null, undefined 체크
    if (!value) return '';
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

  const handleAddServer = () => {
    const newServer: ServerInfo = {
      serverType: '관리서버',
      manufacturer: '',
      modelName: '',
      hostname: '',
      serialNumber: '',
      osVersion: '',
      cpuType: '',
      memoryCapacity: '',
      diskCapacity: '',
      nicFiberCount: 0,
      nicUtpCount: 0,
      powerSupplyCount: 0,
    };
    setFormData({
      ...formData,
      servers: [...(formData.servers || []), newServer],
    });
  };

  const handleRemoveServer = (index: number) => {
    const updatedServers = [...(formData.servers || [])];
    updatedServers.splice(index, 1);
    setFormData({ ...formData, servers: updatedServers });
  };

  const handleServerChange = (index: number, field: keyof ServerInfo, value: any) => {
    const updatedServers = [...(formData.servers || [])];
    updatedServers[index] = {
      ...updatedServers[index],
      [field]: value,
    };
    setFormData({ ...formData, servers: updatedServers });
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
          <Grid xs={12} sm={4}>
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

          <Grid xs={12} sm={4}>
            <TextField
              fullWidth
              label="빌드 버전"
              value={formData.virtualPcBuildVersion}
              onChange={(e) => setFormData({ ...formData, virtualPcBuildVersion: e.target.value })}
              placeholder="예: 19045"
            />
          </Grid>

          <Grid xs={12} sm={4}>
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            서버 구성
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleAddServer} size="small">
            서버 추가
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
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
        </Box>

        {formData.servers && formData.servers.length > 0 ? (
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>
              서버 정보
            </Typography>
            {formData.servers.map((server, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    서버 #{index + 1}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveServer(index)}>
                    <Delete />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>구분</InputLabel>
                      <Select
                        value={server.serverType}
                        label="구분"
                        onChange={(e) => handleServerChange(index, 'serverType', e.target.value)}
                      >
                        <MenuItem value="관리서버">관리서버</MenuItem>
                        <MenuItem value="보안게이트웨이서버">보안게이트웨이서버</MenuItem>
                        <MenuItem value="통합서버">통합서버</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="제조사"
                      value={server.manufacturer || ''}
                      onChange={(e) => handleServerChange(index, 'manufacturer', e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="모델명"
                      value={server.modelName || ''}
                      onChange={(e) => handleServerChange(index, 'modelName', e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="호스트네임"
                      value={server.hostname || ''}
                      onChange={(e) => handleServerChange(index, 'hostname', e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="SerialNumber"
                      value={server.serialNumber || ''}
                      onChange={(e) => handleServerChange(index, 'serialNumber', e.target.value)}
                      placeholder="예: 1234567890"
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="OS 버전"
                      value={server.osVersion || ''}
                      onChange={(e) => handleServerChange(index, 'osVersion', e.target.value)}
                      placeholder="예: RockyLinux 9.5, CentOS 7.9"
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CPU 종류"
                      value={server.cpuType || ''}
                      onChange={(e) => handleServerChange(index, 'cpuType', e.target.value)}
                      placeholder="예: Intel Xeon E5-2680"
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="메모리 용량"
                      value={server.memoryCapacity || ''}
                      onChange={(e) => handleServerChange(index, 'memoryCapacity', e.target.value)}
                      placeholder="예: 32GB, 64GB"
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="디스크 용량"
                      value={server.diskCapacity || ''}
                      onChange={(e) => handleServerChange(index, 'diskCapacity', e.target.value)}
                      placeholder="예: 1TB, 2TB SSD"
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Fiber NIC 수량"
                      value={server.nicFiberCount || 0}
                      onChange={(e) => handleServerChange(index, 'nicFiberCount', Number(e.target.value))}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="UTP NIC 수량"
                      value={server.nicUtpCount || 0}
                      onChange={(e) => handleServerChange(index, 'nicUtpCount', Number(e.target.value))}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="전원 수량"
                      value={server.powerSupplyCount || 0}
                      onChange={(e) =>
                        handleServerChange(index, 'powerSupplyCount', Number(e.target.value))
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
            서버를 추가해주세요.
          </Typography>
        )}
      </Paper>

      {/* 인사연동 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          인사연동
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid xs={12}>
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
              <Grid xs={12} sm={6}>
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
              <Grid xs={12} sm={6}>
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
