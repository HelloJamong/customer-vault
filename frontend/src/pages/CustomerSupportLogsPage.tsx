import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import { ArrowBack, Add, ExpandMore, Search, Refresh, Download } from '@mui/icons-material';
import { supportLogsAPI } from '@/api/support-logs.api';
import { customersAPI } from '@/api/customers.api';
import { logsApi } from '@/api/logs.api';
import type { SupportLog, CreateSupportLogDto, UpdateSupportLogDto } from '@/types/support-log.types';
import type { Customer } from '@/types/customer.types';
import ExcelJS from 'exceljs';

dayjs.locale('ko');

const CustomerSupportLogsPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [supportLogs, setSupportLogs] = useState<SupportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SupportLog | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateSupportLogDto>>({
    supportDate: '',
    inquirer: '',
    target: '',
    category: '',
    userInfo: '',
    actionStatus: '',
    inquiryContent: '',
    actionContent: '',
    actionResult: '',
    remarks: '',
  });
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  // Filter states
  const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);
  const [filterTarget, setFilterTarget] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterActionStatus, setFilterActionStatus] = useState<string>('');
  const [filterEngineer, setFilterEngineer] = useState<string>('');
  const [filteredLogs, setFilteredLogs] = useState<SupportLog[]>([]);

  useEffect(() => {
    if (!customerId) return;
    fetchData();
  }, [customerId]);

  useEffect(() => {
    setFilteredLogs(supportLogs);
  }, [supportLogs]);

  const fetchData = async () => {
    if (!customerId) return;
    try {
      setIsLoading(true);
      const [customerData, logsData] = await Promise.all([
        customersAPI.getById(Number(customerId)),
        supportLogsAPI.getAllByCustomer(Number(customerId)),
      ]);
      setCustomer(customerData);
      setSupportLogs(logsData);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const handleApplyFilter = () => {
    let filtered = [...supportLogs];

    // 시작일 필터
    if (filterStartDate) {
      filtered = filtered.filter(log =>
        dayjs(log.supportDate).isAfter(filterStartDate) ||
        dayjs(log.supportDate).isSame(filterStartDate, 'day')
      );
    }

    // 종료일 필터
    if (filterEndDate) {
      filtered = filtered.filter(log =>
        dayjs(log.supportDate).isBefore(filterEndDate) ||
        dayjs(log.supportDate).isSame(filterEndDate, 'day')
      );
    }

    // 대상 필터
    if (filterTarget) {
      filtered = filtered.filter(log => log.target === filterTarget);
    }

    // 구분 필터
    if (filterCategory) {
      filtered = filtered.filter(log => log.category === filterCategory);
    }

    // 조치 여부 필터
    if (filterActionStatus) {
      filtered = filtered.filter(log => log.actionStatus === filterActionStatus);
    }

    // 지원 엔지니어 필터
    if (filterEngineer) {
      filtered = filtered.filter(log => log.creator?.name === filterEngineer);
    }

    setFilteredLogs(filtered);
  };

  const handleResetFilter = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setFilterTarget('');
    setFilterCategory('');
    setFilterActionStatus('');
    setFilterEngineer('');
    setFilteredLogs(supportLogs);
  };

  // 고유한 엔지니어 목록 추출
  const uniqueEngineers = Array.from(
    new Set(supportLogs.map(log => log.creator?.name).filter(Boolean))
  ) as string[];

  // 통계 계산
  const getStatistics = () => {
    const inProgressCount = filteredLogs.filter(log => log.actionStatus === '진행 중').length;

    const stats = {
      inProgress: inProgressCount,
      client: {
        issue: filteredLogs.filter(log => log.target === '클라이언트' && log.category === '이슈').length,
        inquiry: filteredLogs.filter(log => log.target === '클라이언트' && log.category === '문의').length,
      },
      server: {
        issue: filteredLogs.filter(log => log.target === '서버' && log.category === '이슈').length,
        inquiry: filteredLogs.filter(log => log.target === '서버' && log.category === '문의').length,
      },
      etc: {
        issue: filteredLogs.filter(log => log.target === '기타' && log.category === '이슈').length,
        inquiry: filteredLogs.filter(log => log.target === '기타' && log.category === '문의').length,
      },
    };

    return stats;
  };

  const statistics = getStatistics();

  const handleExportToExcel = async () => {
    if (!customer) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `${customer.name}_지원목록_${dateStr}.xlsx`;

    // ExcelJS 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('지원목록');

    // 컬럼 너비 설정
    worksheet.columns = [
      { width: 12 },  // 지원날짜
      { width: 12 },  // 문의자
      { width: 12 },  // 대상
      { width: 10 },  // 구분
      { width: 15 },  // 사용자 정보
      { width: 12 },  // 조치 여부
      { width: 12 },  // 지원 엔지니어
      { width: 40 },  // 문의 내용
      { width: 40 },  // 진척 사항
      { width: 40 },  // 조치 결과
      { width: 30 },  // 비고
    ];

    // 헤더
    worksheet.addRow(['지원 목록']);
    worksheet.addRow([]);
    worksheet.addRow(['고객사', customer.name || '']);
    worksheet.addRow(['진행 중인 문의 사항', `${statistics.inProgress}개`]);
    worksheet.addRow([]);

    // 통계 표
    worksheet.addRow(['대상', '이슈', '문의', '합계']);
    worksheet.addRow([
      '클라이언트',
      `${statistics.client.issue}개`,
      `${statistics.client.inquiry}개`,
      `${statistics.client.issue + statistics.client.inquiry}개`,
    ]);
    worksheet.addRow([
      '서버',
      `${statistics.server.issue}개`,
      `${statistics.server.inquiry}개`,
      `${statistics.server.issue + statistics.server.inquiry}개`,
    ]);
    worksheet.addRow([
      '기타',
      `${statistics.etc.issue}개`,
      `${statistics.etc.inquiry}개`,
      `${statistics.etc.issue + statistics.etc.inquiry}개`,
    ]);
    worksheet.addRow([]);

    // 지원 로그 테이블 헤더
    worksheet.addRow([
      '지원날짜',
      '문의자',
      '대상',
      '구분',
      '사용자 정보',
      '조치 여부',
      '지원 엔지니어',
      '문의 내용',
      '진척 사항',
      '조치 결과',
      '비고',
    ]);

    // 데이터 행
    filteredLogs.forEach(log => {
      worksheet.addRow([
        dayjs(log.supportDate).format('YYYY-MM-DD'),
        log.inquirer || '',
        log.target || '',
        log.category || '',
        log.userInfo || '',
        log.actionStatus || '',
        log.creator?.name || '',
        log.inquiryContent || '',
        log.actionContent || '',
        log.actionResult || '',
        log.remarks || '',
      ]);
    });

    // 모든 셀에 중단 정렬 및 자동 줄바꿈 적용
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // 파일 다운로드
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
        action: '지원 목록 엑셀 내보내기',
        description: `${customer.name} 고객사 지원 목록을 엑셀로 내보냄 (${filteredLogs.length}건)`,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
  };

  const handleViewDetails = (log: SupportLog) => {
    setSelectedLog(log);
    setViewDialogOpen(true);
  };

  const handleAddClick = () => {
    setFormData({
      supportDate: '',
      inquirer: '',
      target: '',
      category: '',
      userInfo: '',
      actionStatus: '',
      inquiryContent: '',
      actionContent: '',
      remarks: '',
    });
    setSelectedDate(null);
    setAddDialogOpen(true);
  };

  const handleEditClick = (log: SupportLog) => {
    setSelectedLog(log);
    setFormData({
      supportDate: log.supportDate.split('T')[0],
      inquirer: log.inquirer || '',
      target: log.target || '',
      category: log.category || '',
      userInfo: log.userInfo || '',
      actionStatus: log.actionStatus || '',
      inquiryContent: log.inquiryContent || '',
      actionContent: log.actionContent || '',
      actionResult: log.actionResult || '',
      remarks: log.remarks || '',
    });
    setSelectedDate(dayjs(log.supportDate));
    setEditDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!customerId) return;
    if (!selectedDate) {
      alert('지원날짜를 선택해주세요.');
      return;
    }

    try {
      const createDto: CreateSupportLogDto = {
        customerId: Number(customerId),
        supportDate: selectedDate.format('YYYY-MM-DD'),
        inquirer: formData.inquirer,
        target: formData.target,
        category: formData.category,
        userInfo: formData.userInfo,
        actionStatus: formData.actionStatus,
        inquiryContent: formData.inquiryContent,
        actionContent: formData.actionContent,
        actionResult: formData.actionResult,
        remarks: formData.remarks,
      };

      await supportLogsAPI.create(createDto);
      setAddDialogOpen(false);
      await fetchData();
      alert('지원 로그가 추가되었습니다.');
    } catch (error) {
      console.error('추가 실패:', error);
      alert('지원 로그 추가에 실패했습니다.');
    }
  };

  const handleUpdate = async () => {
    if (!selectedLog) return;
    if (!selectedDate) {
      alert('지원날짜를 선택해주세요.');
      return;
    }

    try {
      const updateDto: UpdateSupportLogDto = {
        supportDate: selectedDate.format('YYYY-MM-DD'),
        inquirer: formData.inquirer,
        target: formData.target,
        category: formData.category,
        userInfo: formData.userInfo,
        actionStatus: formData.actionStatus,
        inquiryContent: formData.inquiryContent,
        actionContent: formData.actionContent,
        actionResult: formData.actionResult,
        remarks: formData.remarks,
      };

      await supportLogsAPI.update(selectedLog.id, updateDto);
      setEditDialogOpen(false);
      await fetchData();
      alert('지원 로그가 수정되었습니다.');
    } catch (error) {
      console.error('수정 실패:', error);
      alert('지원 로그 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (log: SupportLog) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      await supportLogsAPI.delete(log.id);
      await fetchData();
      alert('지원 로그가 삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('지원 로그 삭제에 실패했습니다.');
    }
  };

  const columns: GridColDef<SupportLog>[] = [
    {
      field: 'supportDate',
      headerName: '지원날짜',
      width: 120,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'inquirer',
      headerName: '문의자',
      width: 120,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'target',
      headerName: '대상',
      width: 180,
      flex: 1,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'category',
      headerName: '구분',
      width: 120,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'userInfo',
      headerName: '사용자 정보',
      width: 180,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'actionStatus',
      headerName: '조치 여부',
      width: 120,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'creator',
      headerName: '지원 엔지니어',
      width: 120,
      renderCell: (params) => params.row.creator?.name || '-',
    },
    {
      field: 'actions',
      headerName: '작업',
      width: 320,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1} alignItems="center" height="100%">
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleViewDetails(params.row)}
          >
            세부내용
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => handleEditClick(params.row)}
          >
            수정
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleDelete(params.row)}
          >
            삭제
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
      <Box>
        {/* 헤더 */}
        <Box display="flex" alignItems="center" mb={3} gap={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/customers')}
          >
            목록으로
          </Button>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {customer?.name || '고객사'} - 지원 목록
            </Typography>
            <Typography variant="body2" color="text.secondary">
              고객사 이슈 처리 내용을 관리합니다
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportToExcel}
            sx={{ mr: 1 }}
          >
            엑셀로 내보내기
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddClick}>
            지원 로그 추가
          </Button>
        </Box>

        {/* 지원 현황 통계 */}
        <Accordion elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              bgcolor: 'primary.light',
              '&:hover': {
                bgcolor: 'primary.main',
              },
            }}
          >
            <Typography variant="body1" fontWeight="medium" color="primary.contrastText">
              진행 중인 문의 사항: {statistics.inProgress}개
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                '& td, & th': {
                  border: '1px solid',
                  borderColor: 'divider',
                  padding: 1,
                  textAlign: 'center',
                },
                '& th': {
                  bgcolor: 'grey.100',
                  fontWeight: 'bold',
                }
              }}
            >
              <thead>
                <tr>
                  <th>대상</th>
                  <th>이슈</th>
                  <th>문의</th>
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>클라이언트</td>
                  <td>{statistics.client.issue}개</td>
                  <td>{statistics.client.inquiry}개</td>
                  <td>{statistics.client.issue + statistics.client.inquiry}개</td>
                </tr>
                <tr>
                  <td>서버</td>
                  <td>{statistics.server.issue}개</td>
                  <td>{statistics.server.inquiry}개</td>
                  <td>{statistics.server.issue + statistics.server.inquiry}개</td>
                </tr>
                <tr>
                  <td>기타</td>
                  <td>{statistics.etc.issue}개</td>
                  <td>{statistics.etc.inquiry}개</td>
                  <td>{statistics.etc.issue + statistics.etc.inquiry}개</td>
                </tr>
              </tbody>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* 필터 섹션 */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            필터
          </Typography>
          <Stack spacing={2}>
            <Box display="flex" gap={2}>
              <DatePicker
                label="시작일"
                value={filterStartDate}
                onChange={(newValue) => setFilterStartDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { flex: 1 },
                  },
                }}
              />
              <DatePicker
                label="종료일"
                value={filterEndDate}
                onChange={(newValue) => setFilterEndDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { flex: 1 },
                  },
                }}
              />
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>대상</InputLabel>
                <Select
                  value={filterTarget}
                  label="대상"
                  onChange={(e) => setFilterTarget(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="서버">서버</MenuItem>
                  <MenuItem value="클라이언트">클라이언트</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>구분</InputLabel>
                <Select
                  value={filterCategory}
                  label="구분"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="이슈">이슈</MenuItem>
                  <MenuItem value="문의">문의</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>조치 여부</InputLabel>
                <Select
                  value={filterActionStatus}
                  label="조치 여부"
                  onChange={(e) => setFilterActionStatus(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="조치 완료">조치 완료</MenuItem>
                  <MenuItem value="진행 중">진행 중</MenuItem>
                  <MenuItem value="보류">보류</MenuItem>
                  <MenuItem value="진행 불가">진행 불가</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>지원 엔지니어</InputLabel>
                <Select
                  value={filterEngineer}
                  label="지원 엔지니어"
                  onChange={(e) => setFilterEngineer(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  {uniqueEngineers.map((engineer) => (
                    <MenuItem key={engineer} value={engineer}>
                      {engineer}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleApplyFilter}
                  fullWidth
                >
                  검색
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleResetFilter}
                  fullWidth
                >
                  초기화
                </Button>
              </Box>
            </Box>
          </Stack>
        </Paper>

        {/* 데이터 그리드 */}
        <Paper elevation={0} sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredLogs}
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
        </Paper>

        {/* 세부 내용 보기 Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>지원 로그 세부 내용</DialogTitle>
          <DialogContent>
          {selectedLog && (
            <Stack spacing={2} sx={{ pt: 2 }}>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    지원날짜
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedLog.supportDate)}
                  </Typography>
                </Box>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    문의자
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.inquirer || '-'}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    대상
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.target || '-'}
                  </Typography>
                </Box>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    구분
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.category || '-'}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    사용자 정보
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.userInfo || '-'}
                  </Typography>
                </Box>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    조치 여부
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.actionStatus || '-'}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  문의 내용
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {selectedLog.inquiryContent || '-'}
                  </Typography>
                </Paper>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  진척 사항
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {selectedLog.actionContent || '-'}
                  </Typography>
                </Paper>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  조치 결과
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {selectedLog.actionResult || '-'}
                  </Typography>
                </Paper>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  비고
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {selectedLog.remarks || '-'}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>닫기</Button>
          </DialogActions>
        </Dialog>

        {/* 추가 Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>지원 로그 추가</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
            <Box display="flex" gap={2}>
              <DatePicker
                label="지원날짜"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
              <TextField
                fullWidth
                label="문의자"
                value={formData.inquirer}
                onChange={(e) => setFormData({ ...formData, inquirer: e.target.value })}
              />
            </Box>
            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>대상</InputLabel>
                <Select
                  value={formData.target || ''}
                  label="대상"
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                >
                  <MenuItem value="서버">서버</MenuItem>
                  <MenuItem value="클라이언트">클라이언트</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>구분</InputLabel>
                <Select
                  value={formData.category || ''}
                  label="구분"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="이슈">이슈</MenuItem>
                  <MenuItem value="문의">문의</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="사용자 정보"
                value={formData.userInfo}
                onChange={(e) => setFormData({ ...formData, userInfo: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>조치 여부</InputLabel>
                <Select
                  value={formData.actionStatus || ''}
                  label="조치 여부"
                  onChange={(e) => setFormData({ ...formData, actionStatus: e.target.value })}
                >
                  <MenuItem value="조치 완료">조치 완료</MenuItem>
                  <MenuItem value="진행 중">진행 중</MenuItem>
                  <MenuItem value="보류">보류</MenuItem>
                  <MenuItem value="진행 불가">진행 불가</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="문의 내용"
              placeholder="ex) 가상PC 구동 시 종료되는 증상 발생"
              value={formData.inquiryContent}
              onChange={(e) => setFormData({ ...formData, inquiryContent: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="진척 사항"
              placeholder="ex) [26-00-00]
- VT-x 활성화 확인을 위해 관련 툴 전달드림

[26-00-00]
- 확인결과 가상화 상태가 비활성화라 활성화 방법 메일로 안내드림"
              value={formData.actionContent}
              onChange={(e) => setFormData({ ...formData, actionContent: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="조치 결과"
              placeholder="ex) VT-x 활성화 후 정상 구동 확인됨"
              value={formData.actionResult}
              onChange={(e) => setFormData({ ...formData, actionResult: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="비고"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>취소</Button>
            <Button onClick={handleAdd} variant="contained">
              추가
            </Button>
          </DialogActions>
        </Dialog>

        {/* 수정 Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>지원 로그 수정</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
            <Box display="flex" gap={2}>
              <DatePicker
                label="지원날짜"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
              <TextField
                fullWidth
                label="문의자"
                value={formData.inquirer}
                onChange={(e) => setFormData({ ...formData, inquirer: e.target.value })}
              />
            </Box>
            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>대상</InputLabel>
                <Select
                  value={formData.target || ''}
                  label="대상"
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                >
                  <MenuItem value="서버">서버</MenuItem>
                  <MenuItem value="클라이언트">클라이언트</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>구분</InputLabel>
                <Select
                  value={formData.category || ''}
                  label="구분"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="이슈">이슈</MenuItem>
                  <MenuItem value="문의">문의</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="사용자 정보"
                value={formData.userInfo}
                onChange={(e) => setFormData({ ...formData, userInfo: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>조치 여부</InputLabel>
                <Select
                  value={formData.actionStatus || ''}
                  label="조치 여부"
                  onChange={(e) => setFormData({ ...formData, actionStatus: e.target.value })}
                >
                  <MenuItem value="조치 완료">조치 완료</MenuItem>
                  <MenuItem value="진행 중">진행 중</MenuItem>
                  <MenuItem value="보류">보류</MenuItem>
                  <MenuItem value="진행 불가">진행 불가</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="문의 내용"
              placeholder="ex) 가상PC 구동 시 종료되는 증상 발생"
              value={formData.inquiryContent}
              onChange={(e) => setFormData({ ...formData, inquiryContent: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="진척 사항"
              placeholder="ex) [26-00-00]
- VT-x 활성화 확인을 위해 관련 툴 전달드림

[26-00-00]
- 확인결과 가상화 상태가 비활성화라 활성화 방법 메일로 안내드림"
              value={formData.actionContent}
              onChange={(e) => setFormData({ ...formData, actionContent: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="조치 결과"
              placeholder="ex) VT-x 활성화 후 정상 구동 확인됨"
              value={formData.actionResult}
              onChange={(e) => setFormData({ ...formData, actionResult: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="비고"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
            <Button onClick={handleUpdate} variant="contained">
              수정
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default CustomerSupportLogsPage;
