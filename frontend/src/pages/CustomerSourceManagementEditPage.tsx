import { useState, useEffect } from 'react';
import {
  Box,
  Stack,
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
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Save, Add, Delete, ExpandMore } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import { getApiErrorMessage } from '@/utils/api-error';
import { useAuthStore } from '@/store/authStore';

type RaidType = '미확인' | 'RAID 미사용' | 'RAID0' | 'RAID1' | 'RAID5' | 'RAID6' | 'RAID10' | '기타';
type DiskCapacityUnit = 'GB' | 'TB';

interface ServerDiskGroup {
  id?: number;
  raidType: RaidType;
  diskType?: string;
  diskCapacityGb?: number | '';
  diskCapacityUnit: DiskCapacityUnit;
}

interface ServerInfo {
  id?: number;
  _clientKey?: string; // React key 안정화용 (신규 행), 저장 시 서버로 전송되지 않음(whitelist로 자동 제거)
  serverType: string;
  manufacturer?: string;
  modelName?: string;
  hostname?: string;
  serialNumber?: string;
  osVersion?: string;
  cpuType?: string;
  memoryCapacity?: string;
  diskCapacity?: string;
  diskGroups?: ServerDiskGroup[];
  nicFiberCount?: number;
  nicUtpCount?: number;
  powerSupplyCount?: number;
}

interface ServerAccessInfo {
  id?: number;
  _clientKey?: string; // React key 안정화용 (신규 행), 저장 시 서버로 전송되지 않음(whitelist로 자동 제거)
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
  dbName: string;
  dbHost: string;
  dbPort: number | '';
  dbUsername: string;
  dbPassword: string;
  mappings: HRFieldMapping[];
  userSyncQuery: string;
  departmentSyncQuery: string;
}

type HRMappingCategory = '부서' | '사용자';

interface HRFieldMapping {
  id?: number;
  category: HRMappingCategory;
  tableName: string;
  dbFieldName: string;
  vmfortFieldName: string;
  isRequired: boolean;
  description: string;
  displayOrder?: number;
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
  verified: boolean;
  verifiedBy?: { id: number; name: string } | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
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
    verified: false,
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

const createServerDiskGroup = (): ServerDiskGroup => ({
  raidType: '미확인',
  diskType: '',
  diskCapacityGb: '',
  diskCapacityUnit: 'GB',
});

const createHrMappings = (): HRFieldMapping[] => {
  const rows: Array<[HRMappingCategory, string, string, string, boolean, string]> = [
  ['부서', 'group_table(예시)', 'deptId', 'deptId', true, '부서 코드'],
  ['부서', 'group_table(예시)', 'deptName', 'deptName', true, '부서 이름'],
  ['부서', 'group_table(예시)', 'description', 'description', false, '부서 설명'],
  ['부서', 'group_table(예시)', 'parentDeptId', 'parentDeptId', true, '상위부서 코드 (상위부서 코드가 NULL이거나 0 일 경우 최상위 부서로 판단함)'],
  ['사용자', 'user_table(예시)', 'user_Id', 'user_Id', true, '사용자 계정 (VMFort 로그인 시 사용)'],
  ['사용자', 'user_table(예시)', 'user_Name', 'user_Name', true, '사용자 이름'],
  ['사용자', 'user_table(예시)', 'email', 'email', false, '이메일'],
  ['사용자', 'user_table(예시)', 'position', 'position', false, '직급'],
  ['사용자', 'user_table(예시)', 'deptId', 'deptId', true, '소속 부서 코드 (부서 코드가 존재하지 않을 경우, 미소속 사용자 부서로 이동됨)'],
  ['사용자', 'user_table(예시)', 'officePhone', 'officePhone', false, '사무실 전화번호'],
  ['사용자', 'user_table(예시)', 'smartPhone', 'smartPhone', false, '휴대폰 전화번호'],
  ];
  return rows.map(([category, tableName, dbFieldName, vmfortFieldName, isRequired, description], displayOrder) => ({
    category,
    tableName,
    dbFieldName,
    vmfortFieldName,
    isRequired,
    description,
    displayOrder,
  }));
};

const CustomerSourceManagementEditPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const [customerName, setCustomerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

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
      dbName: '',
      dbHost: '',
      dbPort: '',
      dbUsername: '',
      dbPassword: '',
      mappings: createHrMappings(),
      userSyncQuery: '',
      departmentSyncQuery: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        // 고객사 이름 조회
        const customerResponse = await apiClient.get(`/customers/${customerId}`);
        setCustomerName(customerResponse.data.name);

        // 소스 관리 정보 조회
        const sourceResponse = await apiClient.get(`/customers/${customerId}/source-management/edit`);
        if (sourceResponse.data) {
          const sourceData = sourceResponse.data as SourceManagement;
          const virtualPcImages = sourceData.virtualPcImages?.length
            ? sourceData.virtualPcImages.map((image) => ({
              ...image,
              dDiskCapacity: image.dDiskCapacity ?? '',
              installedPrograms: image.installedPrograms || [],
              checklistItems: image.checklistItems?.length
                ? image.checklistItems.map((item) => ({ ...item, verified: !!item.verified }))
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
            hrIntegration: {
              ...sourceData.hrIntegration,
              dbType: sourceData.hrIntegration?.dbType || '',
              dbVersion: sourceData.hrIntegration?.dbVersion || '',
              dbName: sourceData.hrIntegration?.dbName || '',
              dbHost: sourceData.hrIntegration?.dbHost || '',
              dbPort: sourceData.hrIntegration?.dbPort ?? '',
              dbUsername: sourceData.hrIntegration?.dbUsername || '',
              dbPassword: sourceData.hrIntegration?.dbPassword || '',
              mappings: sourceData.hrIntegration?.mappings?.length
                ? sourceData.hrIntegration.mappings
                : createHrMappings(),
              userSyncQuery: sourceData.hrIntegration?.userSyncQuery || '',
              departmentSyncQuery: sourceData.hrIntegration?.departmentSyncQuery || '',
            },
            servers: sourceData.servers?.map((server) => ({
              ...server,
              // 편집 화면은 디스크 구성 1개만 다루지만, 기존에 여러 개가 등록된 서버의
              // 추가 구성(index 1+)은 편집 대상이 아니므로 그대로 보존해 저장 시 유실되지 않게 한다.
              diskGroups: server.diskGroups?.length ? [
                {
                  ...server.diskGroups[0],
                  raidType: server.diskGroups[0].raidType || '미확인',
                  diskType: server.diskGroups[0].diskType || '',
                  diskCapacityGb: server.diskGroups[0].diskCapacityGb ?? '',
                  diskCapacityUnit: server.diskGroups[0].diskCapacityUnit === 'TB' ? 'TB' : 'GB',
                },
                ...server.diskGroups.slice(1),
              ] : [],
            })) || [],
          });
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setLoadError(getApiErrorMessage(error, '구성 정보를 불러오지 못했습니다.'));
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
              verified: item.verified,
              note: item.note?.trim() || undefined,
              displayOrder: item.displayOrder,
            })),
        })),
        servers: formData.servers?.map((server) => ({
          ...server,
          diskGroups: server.diskGroups?.map((group) => ({
            id: group.id,
            raidType: group.raidType,
            diskType: group.diskType?.trim() || undefined,
            diskCapacityGb: group.diskCapacityGb === '' || group.diskCapacityGb == null
              ? undefined
              : Number(group.diskCapacityGb),
            diskCapacityUnit: group.diskCapacityUnit || 'GB',
          })),
        })),
        hrIntegration: {
          ...formData.hrIntegration,
          dbPort: formData.hrIntegration.dbPort === '' ? undefined : Number(formData.hrIntegration.dbPort),
          dbPassword: formData.hrIntegration.dbPassword.trim() || undefined,
          mappings: formData.hrIntegration.mappings.map((mapping, displayOrder) => ({
            id: mapping.id,
            category: mapping.category,
            tableName: mapping.tableName.trim(),
            dbFieldName: mapping.dbFieldName.trim(),
            vmfortFieldName: mapping.vmfortFieldName.trim(),
            isRequired: mapping.isRequired,
            description: mapping.description.trim() || undefined,
            displayOrder,
          })),
          // 빈 문자열로 명시 전송해야 기존 값을 지울 수 있다 (undefined는 "값 유지"로 해석됨)
          userSyncQuery: formData.hrIntegration.userSyncQuery.trim(),
          departmentSyncQuery: formData.hrIntegration.departmentSyncQuery.trim(),
        },
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
      _clientKey: crypto.randomUUID(),
      serverType: '관리서버',
      manufacturer: '',
      modelName: '',
      hostname: '',
      serialNumber: '',
      osVersion: '',
      cpuType: '',
      memoryCapacity: '',
      diskCapacity: '',
      diskGroups: [],
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

  const handleHrIntegrationChange = <K extends keyof HRIntegration>(field: K, value: HRIntegration[K]) => {
    setFormData({
      ...formData,
      hrIntegration: { ...formData.hrIntegration, [field]: value },
    });
  };

  const handleHrMappingChange = <K extends keyof HRFieldMapping>(
    index: number,
    field: K,
    value: HRFieldMapping[K],
  ) => {
    const mappings = [...formData.hrIntegration.mappings];
    mappings[index] = { ...mappings[index], [field]: value };
    handleHrIntegrationChange('mappings', mappings);
  };

  const handleAddHrMapping = (category: HRMappingCategory) => {
    handleHrIntegrationChange('mappings', [
      ...formData.hrIntegration.mappings,
      {
        category,
        tableName: '',
        dbFieldName: '',
        vmfortFieldName: '',
        isRequired: false,
        description: '',
        displayOrder: formData.hrIntegration.mappings.length,
      },
    ]);
  };

  const handleRemoveHrMapping = (index: number) => {
    handleHrIntegrationChange(
      'mappings',
      formData.hrIntegration.mappings.filter((_, mappingIndex) => mappingIndex !== index),
    );
  };

  const handleDiskConfigChange = (
    serverIndex: number,
    field: keyof ServerDiskGroup,
    value: string | number,
  ) => {
    const updatedServers = [...(formData.servers || [])];
    const existingGroups = updatedServers[serverIndex].diskGroups || [];
    const diskConfig = existingGroups[0] || createServerDiskGroup();
    updatedServers[serverIndex] = {
      ...updatedServers[serverIndex],
      // 이 화면은 구성 1개만 편집하므로 index 0만 갱신하고, 추가 구성(index 1+)은 그대로 둔다.
      diskGroups: [{ ...diskConfig, [field]: value }, ...existingGroups.slice(1)],
    };
    setFormData({ ...formData, servers: updatedServers });
  };

  const handleAddAccessInfo = () => {
    const newAccessInfo: ServerAccessInfo = {
      _clientKey: crypto.randomUUID(),
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
    field: 'checked' | 'verified' | 'note',
    value: boolean | string,
  ) => {
    const virtualPcImages = [...formData.virtualPcImages];
    const image = virtualPcImages[imageIndex];
    const checklistItems = image.checklistItems.map((item) => {
      if (item.itemKey !== itemKey) return item;
      return {
        ...item,
        [field]: value,
        ...(field === 'checked' && value === false ? { verified: false } : {}),
      };
    });
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

  if (loadError) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/customers/${customerId}/source-management`)}
          sx={{ mb: 2 }}
        >
          돌아가기
        </Button>
        <Alert severity="error">{loadError}</Alert>
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
              구성 정보 {formData.id ? '수정' : '등록'}
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
              verified: false,
              note: '',
              checkedBy: null,
              checkedAt: null,
              verifiedBy: null,
              verifiedAt: null,
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

              <Accordion
                disableGutters
                elevation={0}
                sx={{ mb: 2, border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    설치 프로그램 리스트 ({image.installedPrograms.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
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
                  <Button size="small" startIcon={<Add />} onClick={() => handleAddProgram(imageIndex)}>
                    설치 프로그램 추가
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    체크리스트 ({image.checklistItems.filter((item) => item.itemKey !== 'vmft_hash_value').length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
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
                            <Grid xs={12} sm={7}>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                {item.label}
                              </Typography>
                              <Stack direction="row" spacing={2}>
                                <FormControlLabel
                                  control={(
                                    <Checkbox
                                      checked={result.checked}
                                      onChange={(e) => handleChecklistChange(imageIndex, item.itemKey, 'checked', e.target.checked)}
                                      inputProps={{ 'aria-label': `${item.label} 검토 여부` }}
                                    />
                                  )}
                                  label="검토"
                                />
                                <FormControlLabel
                                  control={(
                                    <Checkbox
                                      checked={result.verified}
                                      disabled={
                                        !result.checked
                                        || !(result.checkedBy?.name || result.checkedByName)
                                        || result.checkedBy?.id === currentUser?.id
                                      }
                                      onChange={(e) => handleChecklistChange(imageIndex, item.itemKey, 'verified', e.target.checked)}
                                      inputProps={{ 'aria-label': `${item.label} 검증 여부` }}
                                    />
                                  )}
                                  label="검증"
                                />
                              </Stack>
                            </Grid>
                            <Grid xs={12} sm={5}>
                              <TextField fullWidth size="small" label="비고" value={result.note || ''} onChange={(e) => handleChecklistChange(imageIndex, item.itemKey, 'note', e.target.value)} />
                            </Grid>
                          </Grid>
                        );
                      })}
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
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
              <Paper key={access.id ?? access._clientKey ?? index} variant="outlined" sx={{ p: 2, mb: 2 }}>
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
              <Paper key={server.id ?? server._clientKey ?? index} variant="outlined" sx={{ p: 2, mb: 2 }}>
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
                  {server.diskCapacity && !server.diskGroups?.[0] && (
                    <Grid xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="기존 디스크 정보 (호환)"
                        value={server.diskCapacity}
                        onChange={(e) => handleServerChange(index, 'diskCapacity', e.target.value)}
                        helperText="새 디스크 정보를 입력하면 이 값은 함께 보존됩니다."
                      />
                    </Grid>
                  )}
                  <Grid xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="현재 디스크 용량"
                      value={server.diskGroups?.[0]?.diskCapacityGb ?? ''}
                      onChange={(e) => handleDiskConfigChange(index, 'diskCapacityGb', e.target.value === '' ? '' : Number(e.target.value))}
                      inputProps={{ min: 1 }}
                      placeholder="예: 480, 2"
                    />
                  </Grid>
                  <Grid xs={12} sm={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>단위</InputLabel>
                      <Select
                        value={server.diskGroups?.[0]?.diskCapacityUnit || 'GB'}
                        label="단위"
                        onChange={(e) => handleDiskConfigChange(index, 'diskCapacityUnit', e.target.value as DiskCapacityUnit)}
                      >
                        <MenuItem value="GB">GB</MenuItem>
                        <MenuItem value="TB">TB</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>RAID 구성</InputLabel>
                      <Select
                        value={server.diskGroups?.[0]?.raidType || '미확인'}
                        label="RAID 구성"
                        onChange={(e) => handleDiskConfigChange(index, 'raidType', e.target.value as RaidType)}
                      >
                        <MenuItem value="미확인">구성 미확인</MenuItem>
                        <MenuItem value="RAID 미사용">RAID 미사용</MenuItem>
                        <MenuItem value="RAID0">RAID0</MenuItem>
                        <MenuItem value="RAID1">RAID1</MenuItem>
                        <MenuItem value="RAID5">RAID5</MenuItem>
                        <MenuItem value="RAID6">RAID6</MenuItem>
                        <MenuItem value="RAID10">RAID10</MenuItem>
                        <MenuItem value="기타">기타</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>디스크 유형</InputLabel>
                      <Select
                        value={server.diskGroups?.[0]?.diskType || ''}
                        label="디스크 유형"
                        onChange={(e) => handleDiskConfigChange(index, 'diskType', e.target.value)}
                      >
                        <MenuItem value=""><em>미입력</em></MenuItem>
                        <MenuItem value="HDD">HDD</MenuItem>
                        <MenuItem value="SSD">SSD</MenuItem>
                        <MenuItem value="NVMe">NVMe</MenuItem>
                        <MenuItem value="기타">기타</MenuItem>
                      </Select>
                    </FormControl>
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
                  handleHrIntegrationChange('enabled', e.target.value === '사용')
                }
              >
                <MenuItem value="미사용">미사용</MenuItem>
                <MenuItem value="사용">사용</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {formData.hrIntegration.enabled && (
            <>
              <Grid xs={12}>
                <Typography variant="subtitle1" fontWeight="bold">
                  고객사 인사시스템 정보
                </Typography>
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="인사DB 종류"
                  value={formData.hrIntegration.dbType}
                  onChange={(e) => handleHrIntegrationChange('dbType', e.target.value)}
                  placeholder="예: Oracle, MySQL, MS-SQL"
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="인사DB 버전"
                  value={formData.hrIntegration.dbVersion}
                  onChange={(e) => handleHrIntegrationChange('dbVersion', e.target.value)}
                  placeholder="예: 19c, 8.0, 2019"
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="DB명"
                  value={formData.hrIntegration.dbName}
                  onChange={(e) => handleHrIntegrationChange('dbName', e.target.value)}
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="DB IP"
                  value={formData.hrIntegration.dbHost}
                  onChange={(e) => handleHrIntegrationChange('dbHost', e.target.value)}
                  placeholder="예: 192.168.0.10"
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Port"
                  value={formData.hrIntegration.dbPort}
                  onChange={(e) => handleHrIntegrationChange('dbPort', e.target.value === '' ? '' : Number(e.target.value))}
                  inputProps={{ min: 1, max: 65535 }}
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="DB 접속 ID"
                  value={formData.hrIntegration.dbUsername}
                  onChange={(e) => handleHrIntegrationChange('dbUsername', e.target.value)}
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  label="DB 접속 PW"
                  value={formData.hrIntegration.dbPassword}
                  onChange={(e) => handleHrIntegrationChange('dbPassword', e.target.value)}
                />
              </Grid>

              <Grid xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                  DB 연동 테이블 정보
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  View table의 실제 테이블명과 필드명으로 수정해주세요.
                </Typography>
                {([['부서', '부서 매핑'], ['사용자', '사용자 매핑']] as [HRMappingCategory, string][]).map(
                  ([category, title], categoryIndex) => {
                    const items = formData.hrIntegration.mappings
                      .map((mapping, originalIndex) => ({ mapping, originalIndex }))
                      .filter(({ mapping }) => mapping.category === category);

                    return (
                      <Accordion
                        key={category}
                        disableGutters
                        elevation={0}
                        sx={{
                          mb: categoryIndex === 0 ? 2 : 0,
                          border: 1,
                          borderColor: 'divider',
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {title} ({items.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 1100 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ minWidth: 150, whiteSpace: 'nowrap' }}>테이블명</TableCell>
                                  <TableCell sx={{ minWidth: 150, whiteSpace: 'nowrap' }}>인사DB 필드명</TableCell>
                                  <TableCell sx={{ minWidth: 150, whiteSpace: 'nowrap' }}>VMFort 필드명</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>필수여부</TableCell>
                                  <TableCell sx={{ minWidth: 320, whiteSpace: 'nowrap' }}>설명</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>작업</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {items.map(({ mapping, originalIndex }) => (
                                  <TableRow key={mapping.id || originalIndex}>
                                    <TableCell>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={mapping.tableName}
                                        onChange={(e) => handleHrMappingChange(originalIndex, 'tableName', e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={mapping.dbFieldName}
                                        onChange={(e) => handleHrMappingChange(originalIndex, 'dbFieldName', e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={mapping.vmfortFieldName}
                                        onChange={(e) => handleHrMappingChange(originalIndex, 'vmfortFieldName', e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Checkbox
                                        checked={mapping.isRequired}
                                        onChange={(e) => handleHrMappingChange(originalIndex, 'isRequired', e.target.checked)}
                                        inputProps={{ 'aria-label': `${mapping.dbFieldName || '필드'} 필수여부` }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        value={mapping.description}
                                        onChange={(e) => handleHrMappingChange(originalIndex, 'description', e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemoveHrMapping(originalIndex)}
                                        aria-label={`${title} ${originalIndex + 1}번째 매핑 삭제`}
                                      >
                                        <Delete />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          <Button size="small" startIcon={<Add />} onClick={() => handleAddHrMapping(category)} sx={{ mt: 1 }}>
                            {title} 추가
                          </Button>
                        </AccordionDetails>
                      </Accordion>
                    );
                  },
                )}
              </Grid>

              <Grid xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1, mb: 2 }}>
                  연동 쿼리
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="사용자 연동 쿼리"
                    value={formData.hrIntegration.userSyncQuery}
                    onChange={(e) => handleHrIntegrationChange('userSyncQuery', e.target.value)}
                    placeholder="사용자 정보를 조회하는 쿼리를 입력하세요."
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="부서 연동 쿼리"
                    value={formData.hrIntegration.departmentSyncQuery}
                    onChange={(e) => handleHrIntegrationChange('departmentSyncQuery', e.target.value)}
                    placeholder="부서 정보를 조회하는 쿼리를 입력하세요."
                  />
                </Stack>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default CustomerSourceManagementEditPage;
