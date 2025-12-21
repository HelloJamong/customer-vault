import { useState } from 'react';
import { Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Visibility, Info, Code, SupportAgent, Download } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import type { Customer } from '@/types/customer.types';
import apiClient from '@/api/axios';
import { logsApi } from '@/api/logs.api';
import * as XLSX from 'xlsx';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { customers, isLoading, createCustomer } = useCustomers();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('고객사명을 입력해주세요.');
      return;
    }

    try {
      await createCustomer({ name: newCustomerName.trim() });
      setOpenAddDialog(false);
      setNewCustomerName('');
    } catch (error) {
      console.error('고객사 추가 실패:', error);
    }
  };

  const getInspectionCycleText = (customer: Customer) => {
    if (customer.inspectionCycleType === '매월') return '매월';
    if (customer.inspectionCycleType === '분기') return `분기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '반기') return `반기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '연1회') return `연1회(${customer.inspectionCycleMonth}월)`;
    return customer.inspectionCycleType || '-';
  };

  const getStatusColor = (status: string | undefined) => {
    if (status === '점검 완료') return 'success';
    if (status === '미완료') return 'error';
    return 'default';
  };

  const handleExportFullData = async (customer: Customer) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `${customer.name}_전체정보_${dateStr}.xlsx`;

    const wb = XLSX.utils.book_new();

    // === 1. 형상관리 시트 ===
    try {
      const sourceResponse = await apiClient.get(`/customers/${customer.id}/source-management`);
      const sourceData = sourceResponse.data;

      const sourceSheetData: any[][] = [
        ['형상 관리 정보', ''],
        ['고객사명', customer.name],
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
        ['관리웹 소스 릴리즈 날짜', sourceData.adminWebReleaseDate ? `Release ${sourceData.adminWebReleaseDate}` : '-'],
        ['관리웹 커스텀 정보', sourceData.adminWebCustomInfo || '-'],
        ['', ''],
        ['서버 구성', ''],
        ['이중화 구성', sourceData.redundancyType || '-'],
        ['', ''],
      ];

      // 서버 정보 테이블 추가
      if (sourceData.servers && sourceData.servers.length > 0) {
        sourceSheetData.push(['서버 정보', '', '', '', '', '', '', '', '', '', '', '']);
        sourceSheetData.push([
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
        sourceData.servers.forEach((server: any) => {
          sourceSheetData.push([
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

      sourceSheetData.push(['', '']);
      sourceSheetData.push(['인사연동', '']);
      sourceSheetData.push(['인사연동 사용 여부', sourceData.hrIntegration.enabled ? '사용' : '미사용']);
      sourceSheetData.push(['인사 DB 종류', sourceData.hrIntegration.dbType || '-']);
      sourceSheetData.push(['인사 DB 버전', sourceData.hrIntegration.dbVersion || '-']);

      const sourceWs = XLSX.utils.aoa_to_sheet(sourceSheetData);
      sourceWs['!cols'] = [{ wch: 25 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, sourceWs, '형상관리');
    } catch (error) {
      // 형상관리 데이터가 없는 경우 빈 시트 추가
      const emptySourceData = [['형상 관리 정보'], [''], ['등록된 형상 관리 정보가 없습니다.']];
      const emptySourceWs = XLSX.utils.aoa_to_sheet(emptySourceData);
      XLSX.utils.book_append_sheet(wb, emptySourceWs, '형상관리');
    }

    // === 2. 지원목록 시트 ===
    try {
      const supportResponse = await apiClient.get(`/customers/${customer.id}/support-logs`);
      const supportLogs = supportResponse.data;

      const supportSheetData: any[][] = [
        ['지원 목록', '', '', '', '', '', '', ''],
        ['고객사명', customer.name, '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        [
          '지원일자',
          '문의자',
          '대상',
          '구분',
          '내용',
          '처리 내용',
          '작성자',
          '등록일',
        ],
      ];

      if (supportLogs && supportLogs.length > 0) {
        supportLogs.forEach((log: any) => {
          supportSheetData.push([
            log.supportDate || '-',
            log.inquirer || '-',
            log.target || '-',
            log.category || '-',
            log.content || '-',
            log.resolution || '-',
            log.creator?.name || '-',
            log.createdAt ? new Date(log.createdAt).toLocaleDateString('ko-KR') : '-',
          ]);
        });
      } else {
        supportSheetData.push(['등록된 지원 내역이 없습니다.', '', '', '', '', '', '', '']);
      }

      const supportWs = XLSX.utils.aoa_to_sheet(supportSheetData);
      supportWs['!cols'] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, supportWs, '지원목록');
    } catch (error) {
      // 지원목록 데이터가 없는 경우 빈 시트 추가
      const emptySupportData = [['지원 목록'], [''], ['등록된 지원 내역이 없습니다.']];
      const emptySupportWs = XLSX.utils.aoa_to_sheet(emptySupportData);
      XLSX.utils.book_append_sheet(wb, emptySupportWs, '지원목록');
    }

    // === 3. 세부사항 시트 ===
    const getInspectionCycleText = () => {
      if (customer.inspectionCycleType === '매월') return '매월';
      if (customer.inspectionCycleType === '분기') return `분기 (${customer.inspectionCycleMonth}월)`;
      if (customer.inspectionCycleType === '반기') return `반기 (${customer.inspectionCycleMonth}월)`;
      if (customer.inspectionCycleType === '연1회') return `연1회 (${customer.inspectionCycleMonth}월)`;
      return customer.inspectionCycleType || '-';
    };

    const detailSheetData: (string | number)[][] = [
      ['고객사 세부사항'],
      [],
      ['[기본 정보]'],
      ['고객사명', customer.name || ''],
      ['위치', customer.location || ''],
      [],
      ['[담당자 정보]'],
      ['담당자명', customer.contactName || ''],
      ['직책', customer.contactPosition || ''],
      ['부서', customer.contactDepartment || ''],
      ['휴대전화', customer.contactMobile || ''],
      ['유선전화', customer.contactPhone || ''],
      ['이메일', customer.contactEmail || ''],
      [],
    ];

    // 부 담당자 1
    if (customer.contactNameSub1) {
      detailSheetData.push(
        ['[부 담당자 1]'],
        ['담당자명', customer.contactNameSub1 || ''],
        ['직책', customer.contactPositionSub1 || ''],
        ['부서', customer.contactDepartmentSub1 || ''],
        ['휴대전화', customer.contactMobileSub1 || ''],
        ['유선전화', customer.contactPhoneSub1 || ''],
        ['이메일', customer.contactEmailSub1 || ''],
        []
      );
    }

    // 부 담당자 2
    if (customer.contactNameSub2) {
      detailSheetData.push(
        ['[부 담당자 2]'],
        ['담당자명', customer.contactNameSub2 || ''],
        ['직책', customer.contactPositionSub2 || ''],
        ['부서', customer.contactDepartmentSub2 || ''],
        ['휴대전화', customer.contactMobileSub2 || ''],
        ['유선전화', customer.contactPhoneSub2 || ''],
        ['이메일', customer.contactEmailSub2 || ''],
        []
      );
    }

    // 부 담당자 3
    if (customer.contactNameSub3) {
      detailSheetData.push(
        ['[부 담당자 3]'],
        ['담당자명', customer.contactNameSub3 || ''],
        ['직책', customer.contactPositionSub3 || ''],
        ['부서', customer.contactDepartmentSub3 || ''],
        ['휴대전화', customer.contactMobileSub3 || ''],
        ['유선전화', customer.contactPhoneSub3 || ''],
        ['이메일', customer.contactEmailSub3 || ''],
        []
      );
    }

    // 계약 정보
    detailSheetData.push(
      ['[계약 정보]'],
      ['계약 상태', customer.contractType || ''],
      ['계약 시작일', customer.contractStartDate || ''],
      ['계약 종료일', customer.contractEndDate || ''],
      []
    );

    // 점검 정보
    detailSheetData.push(
      ['[점검 정보]'],
      ['점검 주기', getInspectionCycleText()],
      ['최근 점검일', customer.lastInspectionDate || ''],
      ['점검 상태', customer.inspectionStatus || ''],
      []
    );

    // 사내 담당자
    detailSheetData.push(
      ['[사내 담당자]'],
      ['엔지니어', customer.engineer?.name || ''],
      ['부 엔지니어', customer.engineerSub?.name || ''],
      ['영업 담당', customer.sales?.name || ''],
      []
    );

    // 비고
    if (customer.notes) {
      detailSheetData.push(['[비고]'], [customer.notes]);
    }

    const detailWs = XLSX.utils.aoa_to_sheet(detailSheetData);
    detailWs['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, detailWs, '세부사항');

    // 파일 다운로드
    XLSX.writeFile(wb, filename);

    // 로그 기록
    try {
      await logsApi.logExcelExport({
        action: '고객사 전체정보 엑셀 내보내기',
        description: `${customer.name} 고객사 전체정보(형상관리, 지원목록, 세부사항)를 엑셀로 내보냄`,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
  };

  const columns: GridColDef<Customer>[] = [
    {
      field: 'name',
      headerName: '고객사명',
      width: 200,
      flex: 1,
    },
    {
      field: 'inspectionCycleType',
      headerName: '점검주기',
      width: 150,
      renderCell: (params) => getInspectionCycleText(params.row),
    },
    {
      field: 'inspectionStatus',
      headerName: '상태',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || '대상아님'}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'contractType',
      headerName: '계약 상태',
      width: 120,
      renderCell: (params) => params.value || '미계약',
    },
    {
      field: 'exportFullData',
      headerName: '전체 정보',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="contained"
          startIcon={<Download />}
          onClick={() => handleExportFullData(params.row)}
        >
          내보내기
        </Button>
      ),
    },
    {
      field: 'viewDocuments',
      headerName: '점검서보기',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Visibility />}
          onClick={() => navigate(`/customers/${params.row.id}/documents`)}
        >
          보기
        </Button>
      ),
    },
    {
      field: 'sourceManagement',
      headerName: '형상 관리',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Code />}
          onClick={() => navigate(`/customers/${params.row.id}/source-management`)}
        >
          형상 관리
        </Button>
      ),
    },
    {
      field: 'supportList',
      headerName: '지원 목록',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<SupportAgent />}
          onClick={() => navigate(`/customers/${params.row.id}/support-logs`)}
        >
          지원 목록
        </Button>
      ),
    },
    {
      field: 'viewDetails',
      headerName: '세부사항보기',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Info />}
          onClick={() => navigate(`/customers/${params.row.id}`)}
        >
          세부사항
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            고객사 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            전체 고객사 목록을 관리합니다
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenAddDialog(true)}
        >
          고객사 추가
        </Button>
      </Box>

      <Box sx={{ height: 600, width: '100%', bgcolor: 'white', borderRadius: 1 }}>
        <DataGrid
          rows={customers}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Box>

      {/* 고객사 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>고객사 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="고객사명"
            fullWidth
            required
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddCustomer();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>취소</Button>
          <Button onClick={handleAddCustomer} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomersPage;
