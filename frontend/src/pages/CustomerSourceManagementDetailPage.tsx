import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Edit, Download, ExpandMore } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import { logsApi } from '@/api/logs.api';
import ExcelJS from 'exceljs';

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
  diskGroups?: ServerDiskGroup[];
  nicFiberCount?: number;
  nicUtpCount?: number;
  powerSupplyCount?: number;
}

interface ServerDiskGroup {
  raidType?: string | null;
  diskType?: string | null;
  diskCapacityGb?: number | null;
  diskCapacityUnit?: string | null;
}

const formatDiskSummary = (server: ServerInfo) => {
  const group = server.diskGroups?.[0];
  const details = [
    group?.diskCapacityGb ? `${group.diskCapacityGb}${group.diskCapacityUnit || 'GB'}` : null,
    group?.raidType,
    group?.diskType,
  ].filter(Boolean);
  return details.length > 0 ? details.join(' · ') : server.diskCapacity || '-';
};

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
  dbName?: string | null;
  dbHost?: string | null;
  dbPort?: number | null;
  dbUsername?: string | null;
  dbPassword?: string | null;
  mappings?: HRFieldMapping[];
  userSyncQuery?: string | null;
  departmentSyncQuery?: string | null;
}

interface HRFieldMapping {
  category: '부서' | '사용자';
  tableName: string;
  dbFieldName: string;
  vmfortFieldName: string;
  isRequired: boolean;
  description?: string | null;
}

interface VirtualPcInstalledProgram {
  id?: number;
  name: string;
  version?: string;
  description?: string;
}

interface VirtualPcChecklistItem {
  id?: number;
  category?: string;
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
  cDiskCapacity: number | null;
  dDiskCapacity?: number | null;
  licenseStatus: string;
  licenseNote?: string | null;
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
  virtualPcImages?: VirtualPcImage[];
  adminWebVersion?: string | null;
  adminWebVersionDetail?: string | null;
  adminWebCustomInfo: string;
  redundancyType: '이중화 구성' | '단일 구성';
  servers?: ServerInfo[];
  accessInfo?: ServerAccessInfo[];
  hrIntegration: HRIntegration;
}

const CHECKLIST_LABELS: Record<string, string> = {
  vmft_d_drive_type: 'D 드라이브 Type 확인',
  vmft_3d_acceleration: '3D 가속 비활성화 확인',
  vmft_nested_vt: 'Nested VT 비활성화 확인',
  boot_server_install: '서버 설치 확인',
  boot_cache_install: '캐시 설치 확인',
  boot_network: '가상PC 네트워크 연결 확인',
  boot_programs: '가상PC 내 설치 프로그램 정상 동작 확인',
};

type ExportRow = Array<string | number | boolean | null>;

const CustomerSourceManagementDetailPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [customerName, setCustomerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [sourceData, setSourceData] = useState<SourceManagement | null>(null);
  const [revealedAccessInfo, setRevealedAccessInfo] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 고객사 이름 조회
        const customerResponse = await apiClient.get(`/customers/${customerId}`);
        setCustomerName(customerResponse.data.name);

        // 소스 관리 정보 조회
        const sourceResponse = await apiClient.get(`/customers/${customerId}/source-management`);
        // id가 null이면 아직 등록되지 않은 상태
        if (sourceResponse.data && sourceResponse.data.id) {
          setSourceData(sourceResponse.data);
        } else {
          setSourceData(null);
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

  const InfoItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid xs={12} sm={3}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold">
          {label}
        </Typography>
      </Grid>
      <Grid xs={12} sm={9}>
        <Typography variant="body1">{value || '-'}</Typography>
      </Grid>
    </Grid>
  );

  const ImageInfoItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <Box sx={{ height: '100%', minHeight: 64, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight="bold"
        sx={{ minHeight: 24, display: 'flex', alignItems: 'center', lineHeight: 1.5 }}
      >
        {label}
      </Typography>
      <Typography variant="body1" sx={{ minHeight: 24, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {value || '-'}
      </Typography>
    </Box>
  );

  const handleExportToExcel = async () => {
    if (!sourceData) return;

    // 현재 날짜를 YYYYMMDD 형식으로 포맷
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `${customerName}_운영정보_${dateStr}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('구성 정보');
    worksheet.columns = [{ width: 25 }, { width: 50 }];

    // 엑셀 데이터 준비
    const data: ExportRow[] = [
      ['구성 정보', ''],
      ['고객사명', customerName],
      ['', ''],
      ['클라이언트 정보', ''],
      ['클라이언트 버전', sourceData.clientVersion || '-'],
      ['클라이언트 커스텀 정보', sourceData.clientCustomInfo || '-'],
      ['', ''],
      ['가상PC 정보', ''],
      ['OS 버전', sourceData.virtualPcOsVersion || '-'],
      ['빌드 버전', sourceData.virtualPcBuildVersion || '-'],
      ['GuestAddition 버전', sourceData.virtualPcGuestAddition || '-'],
      ['가상PC 이미지 정보', sourceData.virtualPcImageInfo || '-'],
      ['', ''],
      ['관리웹 정보', ''],
      ['관리웹 버전', sourceData.adminWebVersion || '-'],
      ['관리웹 세부 버전', sourceData.adminWebVersionDetail || '-'],
      ['관리웹 커스텀 정보', sourceData.adminWebCustomInfo || '-'],
      ['', ''],
      ['서버 구성', ''],
      ['이중화 구성', sourceData.redundancyType || '-'],
      ['', ''],
    ];

    // 서버 정보 테이블 추가
    if (sourceData.servers && sourceData.servers.length > 0) {
      data.push(['서버 정보', '', '', '', '', '', '', '', '', '', '', '', '']);
      data.push([
        '구분',
        '제조사',
        '모델명',
        '호스트네임',
        'SerialNumber',
        'OS 버전',
        'CPU 종류',
        '메모리 용량',
            '디스크 구성',
        'Fiber NIC',
        'UTP NIC',
        '전원 수량',
      ]);
      sourceData.servers.forEach((server) => {
        data.push([
          server.serverType || '-',
          server.manufacturer || '-',
          server.modelName || '-',
          server.hostname || '-',
          server.serialNumber || '-',
          server.osVersion || '-',
          server.cpuType || '-',
          server.memoryCapacity || '-',
            formatDiskSummary(server),
          server.nicFiberCount || 0,
          server.nicUtpCount || 0,
          server.powerSupplyCount || 0,
        ]);
      });
    }

    data.push(['', '']);
    data.push(['인사연동', '']);
    data.push(['인사연동 사용 여부', sourceData.hrIntegration.enabled ? '사용' : '미사용']);
    if (sourceData.hrIntegration.enabled) {
      data.push(['고객사 인사시스템 정보', '']);
      data.push(['DB 종류', sourceData.hrIntegration.dbType || '-']);
      data.push(['DB 버전', sourceData.hrIntegration.dbVersion || '-']);
      data.push(['DB명', sourceData.hrIntegration.dbName || '-']);
      data.push(['DB IP', sourceData.hrIntegration.dbHost || '-']);
      data.push(['Port', sourceData.hrIntegration.dbPort || '-']);
      data.push(['DB 접속 정보', `ID : ${sourceData.hrIntegration.dbUsername || '-'} / PW : ${sourceData.hrIntegration.dbPassword ? '********' : '-'}`]);
      data.push(['DB 연동 테이블 정보', '']);
      data.push(['구분', '테이블명', '인사DB 필드명', 'VMFort 필드명', '필수여부', '설명']);
      (sourceData.hrIntegration.mappings || []).forEach((mapping) => {
        data.push([
          mapping.category,
          mapping.tableName || '-',
          mapping.dbFieldName || '-',
          mapping.vmfortFieldName || '-',
          mapping.isRequired ? 'O' : 'X',
          mapping.description || '-',
        ]);
      });
      data.push(['사용자 연동 쿼리', sourceData.hrIntegration.userSyncQuery || '-']);
      data.push(['부서 연동 쿼리', sourceData.hrIntegration.departmentSyncQuery || '-']);
    }

    // 데이터 추가
    data.forEach(row => worksheet.addRow(row));

    // 중단 정렬 적용
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    // 로그 기록
    try {
      await logsApi.logExcelExport({
        action: '구성 정보 엑셀 내보내기',
        description: `${customerName} 고객사 구성 정보를 엑셀로 내보냄`,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
  };

  const handleExportVirtualPcImages = async () => {
    if (!sourceData?.virtualPcImages?.length) return;

    const workbook = new ExcelJS.Workbook();
    const usedSheetNames = new Set<string>();

    sourceData.virtualPcImages.forEach((image, index) => {
      const baseName = (image.name || `이미지 ${index + 1}`)
        .replaceAll('/', '-').replaceAll('\\', '-').replaceAll(':', '-').replaceAll('?', '-').replaceAll('*', '-').replaceAll('[', '-').replaceAll(']', '-')
        .slice(0, 31) || `이미지 ${index + 1}`;
      let sheetName = baseName;
      let suffix = 1;
      while (usedSheetNames.has(sheetName)) {
        const suffixText = `-${suffix++}`;
        sheetName = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
      }
      usedSheetNames.add(sheetName);

      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.columns = [{ width: 32 }, { width: 52 }, { width: 28 }, { width: 52 }];
      worksheet.addRows([
        ['가상PC 이미지 정보', '', ''],
        ['이미지 이름', image.name, ''],
        ['OS', image.osName, ''],
        ['OS 에디션', image.osEdition, ''],
        ['OS 릴리즈', image.osRelease, ''],
        ['C 드라이브 용량(GB)', image.cDiskCapacity, ''],
        ['D 드라이브 용량(GB)', image.dDiskCapacity ?? '-', ''],
        ['정품 인증', image.licenseStatus, ''],
        ['정품 인증 비고', image.licenseNote || '-', ''],
        ['', '', ''],
        ['설치 프로그램', '버전', '설명'],
        ...(image.installedPrograms.length
          ? image.installedPrograms.map((program) => [program.name, program.version || '-', program.description || '-'])
          : [['등록된 프로그램 없음', '-', '-']]),
        ['', '', ''],
        ['체크리스트 항목', '확인', '점검자', '비고'],
        ...(image.checklistItems.filter((item) => item.itemKey !== 'vmft_hash_value').length
          ? image.checklistItems
            .filter((item) => item.itemKey !== 'vmft_hash_value')
            .map((item) => [CHECKLIST_LABELS[item.itemKey] || item.itemKey, item.checked ? '확인 완료' : '미확인', item.checkedBy?.name || item.checkedByName || '-', item.note || '-'])
          : [['등록된 체크리스트 없음', '-', '-', '-']]),
      ]);
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeCustomerName = customerName
      .replaceAll('/', '-').replaceAll('\\', '-').replaceAll(':', '-').replaceAll('?', '-').replaceAll('*', '-').replaceAll('[', '-').replaceAll(']', '-');
    link.download = `${safeCustomerName}-이미지정보.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    try {
      await logsApi.logExcelExport({
        action: '가상PC 이미지 정보 엑셀 내보내기',
        description: `${customerName} 고객사의 가상PC 이미지 정보를 내보냄`,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const virtualPcImages = sourceData?.virtualPcImages?.length
    ? sourceData.virtualPcImages
    : (sourceData && (sourceData.virtualPcOsVersion || sourceData.virtualPcBuildVersion || sourceData.virtualPcImageInfo)
      ? [{
        name: '기존 이미지 정보',
        osName: sourceData.virtualPcOsVersion || '-',
        osEdition: '-',
        osRelease: sourceData.virtualPcBuildVersion || '-',
        cDiskCapacity: null,
        dDiskCapacity: null,
        licenseStatus: '-',
        licenseNote: null,
        installedPrograms: [],
        checklistItems: [],
      }]
      : []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/customers')}>
            목록으로
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {customerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              구성 정보
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportToExcel}
            disabled={!sourceData}
          >
            엑셀로 내보내기
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportVirtualPcImages}
            disabled={!sourceData?.virtualPcImages?.length}
          >
            이미지 정보 엑셀
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/customers/${customerId}/source-management/edit`)}
          >
            수정
          </Button>
        </Box>
      </Box>

      {!sourceData ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            구성 정보가 등록되지 않았습니다.
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate(`/customers/${customerId}/source-management/edit`)}
          >
            정보 등록하기
          </Button>
        </Paper>
      ) : (
        <>
          {/* 클라이언트 정보 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              클라이언트 정보
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <InfoItem label="클라이언트 버전" value={sourceData.clientVersion} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  클라이언트 커스텀 정보
                </Typography>
              </Grid>
              <Grid xs={12} sm={9}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {sourceData.clientCustomInfo || '-'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* 가상PC 이미지 관리 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                가상PC 이미지 관리
              </Typography>
              <Typography variant="body2" color="text.secondary">
                이미지 {virtualPcImages.length}개
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {virtualPcImages.length === 0 ? (
              <Typography color="text.secondary">등록된 가상PC 이미지가 없습니다.</Typography>
            ) : virtualPcImages.map((image, imageIndex) => (
              <Paper key={image.id || imageIndex} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {image.name || `이미지 ${imageIndex + 1}`}
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid xs={12} sm={4}><ImageInfoItem label="OS" value={`${image.osName} / ${image.osEdition} / ${image.osRelease}`} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="C 드라이브" value={image.cDiskCapacity ? `${image.cDiskCapacity}GB` : '-'} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="D 드라이브" value={image.dDiskCapacity ? `${image.dDiskCapacity}GB` : '없음'} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="정품 인증" value={image.licenseStatus} /></Grid>
                  <Grid xs={12} sm={8}><ImageInfoItem label="정품 인증 비고" value={image.licenseNote} /></Grid>
                </Grid>

                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{ mb: 2, border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      설치 프로그램 ({image.installedPrograms.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {image.installedPrograms.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead><TableRow><TableCell>프로그램명</TableCell><TableCell>버전</TableCell><TableCell>설명</TableCell></TableRow></TableHead>
                          <TableBody>{image.installedPrograms.map((program, programIndex) => (
                            <TableRow key={program.id || programIndex}><TableCell>{program.name}</TableCell><TableCell>{program.version || '-'}</TableCell><TableCell>{program.description || '-'}</TableCell></TableRow>
                          ))}</TableBody>
                        </Table>
                      </TableContainer>
                    ) : <Typography variant="body2" color="text.secondary">등록된 설치 프로그램이 없습니다.</Typography>}
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
                    {image.checklistItems.filter((item) => item.itemKey !== 'vmft_hash_value').length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead><TableRow><TableCell>항목</TableCell><TableCell>확인</TableCell><TableCell>점검자</TableCell><TableCell>비고</TableCell></TableRow></TableHead>
                          <TableBody>{image.checklistItems.filter((item) => item.itemKey !== 'vmft_hash_value').map((item, itemIndex) => (
                            <TableRow key={item.id || itemIndex}><TableCell>{CHECKLIST_LABELS[item.itemKey] || item.itemKey}</TableCell><TableCell>{item.checked ? '확인 완료' : '미확인'}</TableCell><TableCell>{item.checkedBy?.name || item.checkedByName || (item.checked ? '저장 시 기록' : '-')}</TableCell><TableCell>{item.note || '-'}</TableCell></TableRow>
                          ))}</TableBody>
                        </Table>
                      </TableContainer>
                    ) : <Typography variant="body2" color="text.secondary">등록된 체크리스트가 없습니다.</Typography>}
                  </AccordionDetails>
                </Accordion>
              </Paper>
            ))}
          </Paper>

          {/* 관리웹 정보 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              관리웹 정보
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <InfoItem
              label="관리웹 버전"
              value={sourceData.adminWebVersion || '4.2'}
            />
            <InfoItem label="관리웹 세부 버전" value={sourceData.adminWebVersionDetail} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  관리웹 커스텀 정보
                </Typography>
              </Grid>
              <Grid xs={12} sm={9}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {sourceData.adminWebCustomInfo || '-'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* 서버 접근 정보 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              서버 접근 정보
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {sourceData.accessInfo && sourceData.accessInfo.length > 0 ? (
              <Box>
                {sourceData.accessInfo.map((access, index) => {
                  const isRevealed = revealedAccessInfo.has(index);

                  return (
                    <Paper
                      key={index}
                      variant="outlined"
                      sx={{
                        p: 2,
                        mb: 2,
                        position: 'relative',
                        cursor: isRevealed ? 'default' : 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': isRevealed
                          ? {}
                          : {
                              borderColor: 'primary.main',
                              boxShadow: 1,
                            },
                      }}
                      onClick={() => {
                        if (!isRevealed) {
                          setRevealedAccessInfo(new Set(revealedAccessInfo).add(index));
                        }
                      }}
                    >
                      {!isRevealed && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            zIndex: 1,
                            borderRadius: 1,
                            pointerEvents: 'none',
                          }}
                        >
                          <Typography
                            variant="h6"
                            color="warning.main"
                            fontWeight="bold"
                            gutterBottom
                            sx={{ textAlign: 'center' }}
                          >
                            ⚠️ 민감 정보 포함 ({access.accessType})
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                            해당 항목은 민감 정보가 포함되어 있어 열람 시 주의가 필요합니다
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            (클릭하여 보기)
                          </Typography>
                        </Box>
                      )}

                      <Box
                        sx={{
                          filter: isRevealed ? 'none' : 'blur(8px)',
                          transition: 'filter 0.3s ease',
                          userSelect: isRevealed ? 'text' : 'none',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          접근 정보 #{index + 1}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid xs={12} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              구분
                            </Typography>
                            <Typography variant="body1">{access.accessType}</Typography>
                          </Grid>

                          {access.accessType === '관리웹' && (
                            <>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  관리웹 주소
                                </Typography>
                                <Typography variant="body1">{access.webUrl || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  계정
                                </Typography>
                                <Typography variant="body1">{access.webAccount || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  패스워드
                                </Typography>
                                <Typography variant="body1">{access.webPassword || '-'}</Typography>
                              </Grid>
                            </>
                          )}

                          {access.accessType === '서버' && (
                            <>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  HostName
                                </Typography>
                                <Typography variant="body1">{access.serverHostname || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  IP 주소
                                </Typography>
                                <Typography variant="body1">{access.serverIpAddress || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  SSH 포트
                                </Typography>
                                <Typography variant="body1">{access.serverSshPort || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  root 접근 여부
                                </Typography>
                                <Typography variant="body1">{access.serverRootAccessible || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  SSH 계정
                                </Typography>
                                <Typography variant="body1">{access.serverSshAccount || '-'}</Typography>
                              </Grid>
                              <Grid xs={12} sm={3}>
                                <Typography variant="body2" color="text.secondary">
                                  SSH 패스워드
                                </Typography>
                                <Typography variant="body1">{access.serverSshPassword || '-'}</Typography>
                              </Grid>
                              {access.serverRootAccessible === '가능' && (
                                <Grid xs={12} sm={3}>
                                  <Typography variant="body2" color="text.secondary">
                                    root 패스워드
                                  </Typography>
                                  <Typography variant="body1">{access.serverRootPassword || '-'}</Typography>
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                등록된 접근 정보가 없습니다.
              </Typography>
            )}
          </Paper>

          {/* 서버 구성 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              서버 구성
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <InfoItem label="이중화 구성 여부" value={sourceData.redundancyType} />

            {sourceData.servers && sourceData.servers.length > 0 ? (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 2 }}>
                  서버 정보
                </Typography>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 1200 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>구분</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>제조사</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>모델명</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>호스트네임</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>SerialNumber</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>OS 버전</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>CPU 종류</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>메모리</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>디스크 구성</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>Fiber NIC</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>UTP NIC</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>전원</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sourceData.servers.map((server, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.serverType}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.manufacturer || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.modelName || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.hostname || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.serialNumber || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.osVersion || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.cpuType || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.memoryCapacity || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'pre-line' }}>{formatDiskSummary(server)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.nicFiberCount || 0}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.nicUtpCount || 0}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.powerSupplyCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                등록된 서버 정보가 없습니다.
              </Typography>
            )}
          </Paper>

          {/* 인사연동 */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              인사연동
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <InfoItem label="인사연동 여부" value={sourceData.hrIntegration.enabled ? '사용' : '미사용'} />

            {sourceData.hrIntegration.enabled && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  고객사 인사시스템 정보
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid xs={12} sm={4}><ImageInfoItem label="DB 종류" value={sourceData.hrIntegration.dbType} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="DB 버전" value={sourceData.hrIntegration.dbVersion} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="DB명" value={sourceData.hrIntegration.dbName} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="DB IP" value={sourceData.hrIntegration.dbHost} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="Port" value={sourceData.hrIntegration.dbPort} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="DB 접속 ID" value={sourceData.hrIntegration.dbUsername} /></Grid>
                  <Grid xs={12} sm={4}><ImageInfoItem label="DB 접속 PW" value={sourceData.hrIntegration.dbPassword ? '********' : '-'} /></Grid>
                </Grid>

                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  DB 연동 테이블 정보
                </Typography>
                {sourceData.hrIntegration.mappings?.length ? (
                  <TableContainer sx={{ overflowX: 'auto', mb: 3 }}>
                    <Table size="small" sx={{ minWidth: 850 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>구분</TableCell>
                          <TableCell>테이블명</TableCell>
                          <TableCell>인사DB 필드명</TableCell>
                          <TableCell>VMFort 필드명</TableCell>
                          <TableCell>필수여부</TableCell>
                          <TableCell>설명</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sourceData.hrIntegration.mappings.map((mapping, index) => (
                          <TableRow key={`${mapping.category}-${mapping.dbFieldName}-${index}`}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{mapping.category}</TableCell>
                            <TableCell>{mapping.tableName || '-'}</TableCell>
                            <TableCell>{mapping.dbFieldName || '-'}</TableCell>
                            <TableCell>{mapping.vmfortFieldName || '-'}</TableCell>
                            <TableCell>{mapping.isRequired ? 'O' : 'X'}</TableCell>
                            <TableCell>{mapping.description || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    등록된 테이블 매핑 정보가 없습니다.
                  </Typography>
                )}

                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  연동 쿼리
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5 }}>
                      사용자 연동 쿼리
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {sourceData.hrIntegration.userSyncQuery || '-'}
                    </Paper>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5 }}>
                      부서 연동 쿼리
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {sourceData.hrIntegration.departmentSyncQuery || '-'}
                    </Paper>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default CustomerSourceManagementDetailPage;
