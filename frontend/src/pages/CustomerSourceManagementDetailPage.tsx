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
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Edit, Download } from '@mui/icons-material';
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
  osType?: string;
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

const CustomerSourceManagementDetailPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [customerName, setCustomerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [sourceData, setSourceData] = useState<SourceManagement | null>(null);

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

  const formatReleaseDate = (value: string) => {
    if (!value) return '-';
    return `Release ${value}`;
  };

  const handleExportToExcel = async () => {
    if (!sourceData) return;

    // 현재 날짜를 YYYYMMDD 형식으로 포맷
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `${customerName}_운영정보_${dateStr}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('형상 관리');
    worksheet.columns = [{ width: 25 }, { width: 50 }];

    // 엑셀 데이터 준비
    const data: any[][] = [
      ['형상 관리 정보', ''],
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
      ['관리웹 소스 릴리즈 날짜', formatReleaseDate(sourceData.adminWebReleaseDate)],
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
        'OS 종류',
        'OS 버전',
        'CPU 종류',
        '메모리 용량',
        '디스크 용량',
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
          server.osType || '-',
          server.osVersion || '-',
          server.cpuType || '-',
          server.memoryCapacity || '-',
          server.diskCapacity || '-',
          server.nicFiberCount || 0,
          server.nicUtpCount || 0,
          server.powerSupplyCount || 0,
        ]);
      });
    }

    data.push(['', '']);
    data.push(['인사연동', '']);
    data.push(['인사연동 사용 여부', sourceData.hrIntegration.enabled ? '사용' : '미사용']);
    data.push(['인사 DB 종류', sourceData.hrIntegration.dbType || '-']);
    data.push(['인사 DB 버전', sourceData.hrIntegration.dbVersion || '-']);

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
        action: '형상 관리 정보 엑셀 내보내기',
        description: `${customerName} 고객사 형상 관리 정보를 엑셀로 내보냄`,
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
              형상 관리
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
            형상 관리 정보가 등록되지 않았습니다.
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

          {/* 가상PC 정보 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              가상PC 정보
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  버전 정보
                </Typography>
              </Grid>
              <Grid xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      OS 버전
                    </Typography>
                    <Typography variant="body1">{sourceData.virtualPcOsVersion || '-'}</Typography>
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      빌드 버전
                    </Typography>
                    <Typography variant="body1">{sourceData.virtualPcBuildVersion || '-'}</Typography>
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      GuestAddition 버전
                    </Typography>
                    <Typography variant="body1">{sourceData.virtualPcGuestAddition || '-'}</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  가상PC 이미지 정보
                </Typography>
              </Grid>
              <Grid xs={12} sm={9}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {sourceData.virtualPcImageInfo || '-'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* 관리웹 정보 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              관리웹 정보
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <InfoItem
              label="관리웹 소스 릴리즈 날짜"
              value={formatReleaseDate(sourceData.adminWebReleaseDate)}
            />
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
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>OS 종류</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>OS 버전</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>CPU 종류</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>메모리</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>디스크</TableCell>
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
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.osType || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.osVersion || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.cpuType || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.memoryCapacity || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{server.diskCapacity || '-'}</TableCell>
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
                <InfoItem label="인사DB 종류" value={sourceData.hrIntegration.dbType} />
                <InfoItem label="인사DB 버전" value={sourceData.hrIntegration.dbVersion} />
              </>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default CustomerSourceManagementDetailPage;
