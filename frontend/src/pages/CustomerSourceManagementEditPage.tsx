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
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import { getApiErrorMessage } from '@/utils/api-error';

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

interface ServerAccessInfo {
  id?: number;
  accessType: '관리웹' | '서버';
  webUrl?: string;
  webAccount?: string;
  webPassword?: string;
  serverHostname?: string;
  serverIpAddress?: string;
  serverSshPort?: number;
  serverRootAccessible?: '가능' | '불가능';
  serverSshAccount?: string;
  serverSshPassword?: string;
  serverRootPassword?: string;
}

interface HRIntegration {
  enabled: boolean;
  dbType: string;
  dbVersion: string;
}

interface VirtualPcInstalledProgram {
  id?: number;
  name: string;
  version?: string;
  description?: string;
}

interface VirtualPcChecklistItem {
  id?: number;
  itemKey: string;
  checked: boolean;
  note?: string;
  displayOrder?: number;
  checkedBy?: { id: number; name: string } | null;
  checkedByName?: string | null;
  checkedAt?: string | null;
}

interface VirtualPcImage {
  id?: number;
  name: string;
  osName: string;
  osEdition: string;
  osRelease: string;
  cDiskCapacity: number | '';
  dDiskCapacity?: number | '';
  licenseStatus: '진행완료' | '미진행';
  licenseNote?: string;
  installedPrograms: VirtualPcInstalledProgram[];
  checklistItems: VirtualPcChecklistItem[];
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
  virtualPcImages: VirtualPcImage[];
  adminWebVersion: string;
  adminWebVersionDetail: string;
  adminWebCustomInfo: string;
  redundancyType: '이중화 구성' | '단일 구성';
  servers?: ServerInfo[];
  accessInfo?: ServerAccessInfo[];
  hrIntegration: HRIntegration;
}

const VMFT_CHECKLIST = [
  { itemKey: 'vmft_d_drive_type', label: 'D 드라이브 Type 확인' },
  { itemKey: 'vmft_3d_acceleration', label: '3D 가속 비활성화 확인' },
  { itemKey: 'vmft_nested_vt', label: 'Nested VT 비활성화 확인' },
];

const BOOT_TEST_CHECKLIST = [
  { itemKey: 'boot_server_install', label: '서버 설치 확인' },
  { itemKey: 'boot_cache_install', label: '캐시 설치 확인' },
  { itemKey: 'boot_network', label: '가상PC 네트워크 연결 확인' },
  { itemKey: 'boot_programs', label: '가상PC 내 설치 프로그램 정상 동작 확인' },
];

const createChecklistItems = (): VirtualPcChecklistItem[] =>
  [...VMFT_CHECKLIST, ...BOOT_TEST_CHECKLIST].map((item, index) => ({
    itemKey: item.itemKey,
    checked: false,
    note: '',
    displayOrder: index,
  }));

const createVirtualPcImage = (): VirtualPcImage => ({
  name: '',
  osName: '',
  osEdition: '',
  osRelease: '',
  cDiskCapacity: '',
  dDiskCapacity: '',
  licenseStatus: '미진행',
  licenseNote: '',
  installedPrograms: [],
  checklistItems: createChecklistItems(),
});

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
    virtualPcImages: [createVirtualPcImage()],
    adminWebVersion: '4.2',
    adminWebVersionDetail: '',
    adminWebCustomInfo: '',
    redundancyType: '단일 구성',
    servers: [],
    accessInfo: [],
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
            const sourceData = sourceResponse.data as SourceManagement;
            const virtualPcImages = sourceData.virtualPcImages?.length
              ? sourceData.virtualPcImages.map((image) => ({
                ...image,
                dDiskCapacity: image.dDiskCapacity ?? '',
                installedPrograms: image.installedPrograms || [],
                checklistItems: image.checklistItems?.length
                  ? image.checklistItems
                  : createChecklistItems(),
              }))
              : [{
                ...createVirtualPcImage(),
                name: sourceData.virtualPcImageInfo ? '기존 이미지 정보' : '',
                osName: sourceData.virtualPcOsVersion || '',
                osRelease: sourceData.virtualPcBuildVersion || '',
              }];
            setFormData({
              ...sourceData,
              adminWebVersion: sourceData.adminWebVersion || '4.2',
              adminWebVersionDetail: sourceData.adminWebVersionDetail || '',
              virtualPcImages,
            });
          }
        } catch (error) {
          // 404인 경우 새로 생성
          if (!(error instanceof Error) || !('response' in error) || (error as { response?: { status?: number } }).response?.status !== 404) {
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
    const invalidImageIndex = formData.virtualPcImages.findIndex((image) =>
      !image.name.trim()
      || !image.osName.trim()
      || !image.osEdition.trim()
      || !image.osRelease.trim()
      || !image.cDiskCapacity
      || (image.licenseStatus === '미진행' && !image.licenseNote?.trim()),
    );

    if (invalidImageIndex >= 0) {
      alert(`가상PC 이미지 #${invalidImageIndex + 1}의 필수 정보를 확인해주세요. (C 드라이브 용량 및 정품 인증 비고 포함)`);
      return;
    }

    setIsSaving(true);
    try {
      // customerId와 id를 제외한 데이터만 전송
      const dataToSend = {
        ...Object.fromEntries(
          Object.entries(formData).filter(([key]) =>
            !['id', 'customerId', 'virtualPcImages', 'clientVersionDetail', 'adminWebReleaseDate'].includes(key),
          ),
        ),
        virtualPcImages: formData.virtualPcImages.map((image) => ({
          id: image.id,
          name: image.name.trim(),
          osName: image.osName.trim(),
          osEdition: image.osEdition.trim(),
          osRelease: image.osRelease.trim(),
          cDiskCapacity: Number(image.cDiskCapacity),
          dDiskCapacity: image.dDiskCapacity === '' ? undefined : Number(image.dDiskCapacity),
          licenseStatus: image.licenseStatus,
          licenseNote: image.licenseNote?.trim() || undefined,
          installedPrograms: image.installedPrograms
            .filter((program) => program.name.trim())
            .map((program) => ({
              name: program.name.trim(),
              version: program.version?.trim() || undefined,
              description: program.description?.trim() || undefined,
            })),
          checklistItems: image.checklistItems
            .filter((item) => item.itemKey !== 'vmft_hash_value')
            .map((item) => ({
              itemKey: item.itemKey,
              checked: item.checked,
              note: item.note?.trim() || undefined,
              displayOrder: item.displayOrder,
            })),
        })),
      };

      if (formData.id) {
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
      alert(getApiErrorMessage(error, '저장에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
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

  const handleServerChange = (index: number, field: keyof ServerInfo, value: string | number) => {
    const updatedServers = [...(formData.servers || [])];
    updatedServers[index] = {
      ...updatedServers[index],
      [field]: value,
    };
    setFormData({ ...formData, servers: updatedServers });
  };

  const handleAddAccessInfo = () => {
    const newAccessInfo: ServerAccessInfo = {
      accessType: '관리웹',
      webUrl: '',
      webAccount: '',
      webPassword: '',
      serverHostname: '',
      serverIpAddress: '',
      serverSshPort: 22,
      serverRootAccessible: '불가능',
      serverSshAccount: '',
      serverSshPassword: '',
      serverRootPassword: '',
    };
    setFormData({
      ...formData,
      accessInfo: [...(formData.accessInfo || []), newAccessInfo],
    });
  };

  const handleRemoveAccessInfo = (index: number) => {
    const updatedAccessInfo = [...(formData.accessInfo || [])];
    updatedAccessInfo.splice(index, 1);
    setFormData({ ...formData, accessInfo: updatedAccessInfo });
  };

  const handleAccessInfoChange = (index: number, field: keyof ServerAccessInfo, value: string | number) => {
    const updatedAccessInfo = [...(formData.accessInfo || [])];
    updatedAccessInfo[index] = {
      ...updatedAccessInfo[index],
      [field]: value,
    };
    setFormData({ ...formData, accessInfo: updatedAccessInfo });
  };

  const handleAddVirtualPcImage = () => {
    if (formData.virtualPcImages.length >= 10) return;
    setFormData({
      ...formData,
      virtualPcImages: [...formData.virtualPcImages, createVirtualPcImage()],
    });
  };

  const handleRemoveVirtualPcImage = (index: number) => {
    if (formData.virtualPcImages.length <= 1) return;
    setFormData({
      ...formData,
      virtualPcImages: formData.virtualPcImages.filter((_, imageIndex) => imageIndex !== index),
    });
  };

  const handleVirtualPcImageChange = <K extends keyof VirtualPcImage>(
    index: number,
    field: K,
    value: VirtualPcImage[K],
  ) => {
    const virtualPcImages = [...formData.virtualPcImages];
    virtualPcImages[index] = { ...virtualPcImages[index], [field]: value };
    setFormData({ ...formData, virtualPcImages });
  };

  const handleProgramChange = (
    imageIndex: number,
    programIndex: number,
    field: keyof VirtualPcInstalledProgram,
    value: string,
  ) => {
    const virtualPcImages = [...formData.virtualPcImages];
    const programs = [...virtualPcImages[imageIndex].installedPrograms];
    programs[programIndex] = { ...programs[programIndex], [field]: value };
    virtualPcImages[imageIndex] = { ...virtualPcImages[imageIndex], installedPrograms: programs };
    setFormData({ ...formData, virtualPcImages });
  };

  const handleChecklistChange = (
    imageIndex: number,
    itemKey: string,
    field: 'checked' | 'note',
    value: boolean | string,
  ) => {
    const virtualPcImages = [...formData.virtualPcImages];
    const image = virtualPcImages[imageIndex];
    const checklistItems = image.checklistItems.map((item) =>
      item.itemKey === itemKey ? { ...item, [field]: value } : item,
    );
    virtualPcImages[imageIndex] = { ...image, checklistItems };
    setFormData({ ...formData, virtualPcImages });
  };

  const handleAddProgram = (imageIndex: number) => {
    const virtualPcImages = [...formData.virtualPcImages];
    virtualPcImages[imageIndex] = {
      ...virtualPcImages[imageIndex],
      installedPrograms: [
        ...virtualPcImages[imageIndex].installedPrograms,
        { name: '', version: '', description: '' },
      ],
    };
    setFormData({ ...formData, virtualPcImages });
  };

  const handleRemoveProgram = (imageIndex: number, programIndex: number) => {
    const virtualPcImages = [...formData.virtualPcImages];
    virtualPcImages[imageIndex] = {
      ...virtualPcImages[imageIndex],
      installedPrograms: virtualPcImages[imageIndex].installedPrograms.filter((_, index) => index !== programIndex),
    };
    setFormData({ ...formData, virtualPcImages });
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

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="클라이언트 버전"
              value={formData.clientVersion}
              onChange={(e) => setFormData({ ...formData, clientVersion: e.target.value })}
              placeholder="예: 1.0"
            />
          </Grid>
        </Grid>
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

      {/* 가상PC 이미지 관리 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              가상PC 이미지 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이미지 {formData.virtualPcImages.length}/10개
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddVirtualPcImage}
            disabled={formData.virtualPcImages.length >= 10}
            size="small"
          >
            이미지 정보 추가
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {formData.virtualPcImages.map((image, imageIndex) => {
          const getChecklistItem = (itemKey: string) =>
            image.checklistItems.find((item) => item.itemKey === itemKey) || {
              itemKey,
              checked: false,
              note: '',
              checkedBy: null,
              checkedAt: null,
            };

          return (
            <Paper key={image.id || imageIndex} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  이미지 #{imageIndex + 1}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveVirtualPcImage(imageIndex)}
                  disabled={formData.virtualPcImages.length <= 1}
                  aria-label={`이미지 ${imageIndex + 1} 삭제`}
                >
                  <Delete />
                </IconButton>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="가상PC 이름"
                    value={image.name}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'name', e.target.value)}
                    placeholder="예: 업무용 표준 이미지"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="OS"
                    value={image.osName}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'osName', e.target.value)}
                    placeholder="예: Win11"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="OS 에디션"
                    value={image.osEdition}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'osEdition', e.target.value)}
                    placeholder="예: Pro"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="OS 릴리즈"
                    value={image.osRelease}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'osRelease', e.target.value)}
                    placeholder="예: 25H2"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    type="number"
                    label="C 드라이브 용량 (GB)"
                    value={image.cDiskCapacity}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'cDiskCapacity', e.target.value === '' ? '' : Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="D 드라이브 용량 (GB, 선택)"
                    value={image.dDiskCapacity ?? ''}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'dDiskCapacity', e.target.value === '' ? '' : Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                정품 인증
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>정품 인증 상태</InputLabel>
                    <Select
                      value={image.licenseStatus}
                      label="정품 인증 상태"
                      onChange={(e) => handleVirtualPcImageChange(imageIndex, 'licenseStatus', e.target.value as VirtualPcImage['licenseStatus'])}
                    >
                      <MenuItem value="진행완료">진행완료</MenuItem>
                      <MenuItem value="미진행">미진행</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    required={image.licenseStatus === '미진행'}
                    label="정품 인증 비고"
                    value={image.licenseNote || ''}
                    onChange={(e) => handleVirtualPcImageChange(imageIndex, 'licenseNote', e.target.value)}
                    placeholder={image.licenseStatus === '미진행' ? '미진행 사유를 입력하세요' : '비고 입력 (선택)'}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                설치 프로그램 리스트
              </Typography>
              {image.installedPrograms.map((program, programIndex) => (
                <Grid container spacing={2} key={program.id || programIndex} sx={{ mb: 1 }} alignItems="center">
                  <Grid xs={12} sm={4}>
                    <TextField fullWidth size="small" label="프로그램명" value={program.name} onChange={(e) => handleProgramChange(imageIndex, programIndex, 'name', e.target.value)} />
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <TextField fullWidth size="small" label="버전" value={program.version || ''} onChange={(e) => handleProgramChange(imageIndex, programIndex, 'version', e.target.value)} />
                  </Grid>
                  <Grid xs={10} sm={4}>
                    <TextField fullWidth size="small" label="설명" value={program.description || ''} onChange={(e) => handleProgramChange(imageIndex, programIndex, 'description', e.target.value)} />
                  </Grid>
                  <Grid xs={2} sm={1}>
                    <IconButton size="small" color="error" onClick={() => handleRemoveProgram(imageIndex, programIndex)} aria-label="설치 프로그램 삭제">
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button size="small" startIcon={<Add />} onClick={() => handleAddProgram(imageIndex)} sx={{ mb: 3 }}>
                설치 프로그램 추가
              </Button>

              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                VMFT 설정 확인
              </Typography>
              {image.dDiskCapacity !== '' && image.dDiskCapacity !== undefined && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  D 드라이브가 입력되어 D 드라이브 Type 확인 항목이 활성화되었습니다.
                </Alert>
              )}
              {[VMFT_CHECKLIST, BOOT_TEST_CHECKLIST].map((checklist, checklistIndex) => (
                <Box key={checklistIndex} sx={{ mb: checklistIndex === 0 ? 3 : 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                    {checklistIndex === 0 ? 'VMFT 설정 확인' : '구동 테스트'}
                  </Typography>
                  {checklist.map((item) => {
                    if (item.itemKey === 'vmft_d_drive_type' && (image.dDiskCapacity === '' || image.dDiskCapacity === undefined)) {
                      return null;
                    }
                    const result = getChecklistItem(item.itemKey);
                    return (
                      <Grid container spacing={1} key={item.itemKey} alignItems="center" sx={{ mb: 1 }}>
                        <Grid xs={12} sm={5}>
                          <Box sx={{ minHeight: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <FormControlLabel
                              control={<Checkbox checked={result.checked} onChange={(e) => handleChecklistChange(imageIndex, item.itemKey, 'checked', e.target.checked)} />}
                              label={item.label}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ pl: 4.5 }}>
                              점검자: {result.checked ? (result.checkedBy?.name || result.checkedByName || '저장 시 로그인 계정') : '-'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid xs={12} sm={7}>
                          <TextField fullWidth size="small" label="비고" value={result.note || ''} onChange={(e) => handleChecklistChange(imageIndex, item.itemKey, 'note', e.target.value)} />
                        </Grid>
                      </Grid>
                    );
                  })}
                </Box>
              ))}
            </Paper>
          );
        })}
      </Paper>

      {/* 관리웹 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          관리웹 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>관리웹 버전</InputLabel>
              <Select
                value={formData.adminWebVersion}
                label="관리웹 버전"
                onChange={(e) => setFormData({ ...formData, adminWebVersion: e.target.value })}
              >
                <MenuItem value="4.2">4.2</MenuItem>
                <MenuItem value="6.1">6.1</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="관리웹 세부 버전 (선택)"
              value={formData.adminWebVersionDetail}
              onChange={(e) => setFormData({ ...formData, adminWebVersionDetail: e.target.value })}
              placeholder="예: 6.1.20260916"
            />
          </Grid>
        </Grid>

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

      {/* 서버 접근 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            서버 접근 정보
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleAddAccessInfo} size="small">
            접근 정보 추가
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {formData.accessInfo && formData.accessInfo.length > 0 ? (
          <Box>
            {formData.accessInfo.map((access, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    접근 정보 #{index + 1}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveAccessInfo(index)}>
                    <Delete />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>구분</InputLabel>
                      <Select
                        value={access.accessType}
                        label="구분"
                        onChange={(e) =>
                          handleAccessInfoChange(index, 'accessType', e.target.value as '관리웹' | '서버')
                        }
                      >
                        <MenuItem value="관리웹">관리웹</MenuItem>
                        <MenuItem value="서버">서버</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {access.accessType === '관리웹' && (
                    <>
                      <Grid xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="관리웹 주소"
                          value={access.webUrl || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'webUrl', e.target.value)}
                          placeholder="예: https://admin.example.com"
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="계정"
                          value={access.webAccount || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'webAccount', e.target.value)}
                          placeholder="계정 입력"
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="패스워드"
                          value={access.webPassword || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'webPassword', e.target.value)}
                          placeholder="예: password123 또는 담당자를 통해 확인 필요"
                        />
                      </Grid>
                    </>
                  )}

                  {access.accessType === '서버' && (
                    <>
                      <Grid xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="HostName"
                          value={access.serverHostname || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'serverHostname', e.target.value)}
                          placeholder="예: server01"
                        />
                      </Grid>
                      <Grid xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="IP 주소"
                          value={access.serverIpAddress || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'serverIpAddress', e.target.value)}
                          placeholder="예: 192.168.1.100"
                        />
                      </Grid>
                      <Grid xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="SSH 포트"
                          value={access.serverSshPort || 22}
                          onChange={(e) =>
                            handleAccessInfoChange(index, 'serverSshPort', parseInt(e.target.value) || 22)
                          }
                          placeholder="22"
                        />
                      </Grid>
                      <Grid xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>root 접근 여부</InputLabel>
                          <Select
                            value={access.serverRootAccessible || '불가능'}
                            label="root 접근 여부"
                            onChange={(e) =>
                              handleAccessInfoChange(
                                index,
                                'serverRootAccessible',
                                e.target.value as '가능' | '불가능'
                              )
                            }
                          >
                            <MenuItem value="가능">가능</MenuItem>
                            <MenuItem value="불가능">불가능</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="SSH 계정"
                          value={access.serverSshAccount || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'serverSshAccount', e.target.value)}
                          placeholder="예: admin"
                        />
                      </Grid>
                      <Grid xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="SSH 패스워드"
                          value={access.serverSshPassword || ''}
                          onChange={(e) => handleAccessInfoChange(index, 'serverSshPassword', e.target.value)}
                          placeholder="예: password123 또는 담당자를 통해 확인 필요"
                        />
                      </Grid>
                      {access.serverRootAccessible === '가능' && (
                        <Grid xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="root 패스워드"
                            value={access.serverRootPassword || ''}
                            onChange={(e) => handleAccessInfoChange(index, 'serverRootPassword', e.target.value)}
                            placeholder="예: rootpass123 또는 담당자를 통해 확인 필요"
                          />
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </Paper>
            ))}
          </Box>
        ) : (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              등록된 접근 정보가 없습니다. 상단 버튼을 클릭하여 추가하세요.
            </Typography>
          </Box>
        )}
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
