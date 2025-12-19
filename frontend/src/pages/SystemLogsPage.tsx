import { useState, useEffect, Fragment } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Chip,
  Pagination,
  IconButton,
  Collapse,
  Button,
} from '@mui/material';
import { ExpandMore, ExpandLess, Search, Refresh, Download } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import { logsApi } from '@/api/logs.api';
import type { SystemLogEntry } from '@/api/logs.api';

const SystemLogsPage = () => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // 적용된 필터 상태 (실제 API 호출에 사용)
  const [appliedFilters, setAppliedFilters] = useState({
    username: '',
    logType: '',
    searchText: '',
    ipAddress: '',
    startDate: '',
    endDate: '',
  });

  // 임시 필터 상태 (사용자 입력)
  const [filters, setFilters] = useState({
    username: '',
    logType: '',
    searchText: '',
    ipAddress: '',
    startDate: '',
    endDate: '',
  });

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [appliedFilters, page, limit]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await logsApi.getSystemLogs({
        ...appliedFilters,
        page,
        limit,
      });
      setLogs(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('시스템 이력 조회 실패:', error);
      alert('시스템 이력을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPage(1); // 검색 시 첫 페이지로 이동
  };

  const handleReset = () => {
    const emptyFilters = {
      username: '',
      logType: '',
      searchText: '',
      ipAddress: '',
      startDate: '',
      endDate: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1); // 초기화 시 첫 페이지로 이동
  };

  const handleExport = async () => {
    try {
      const blob = await logsApi.exportSystemLogs(appliedFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      alert('엑셀 파일 다운로드에 실패했습니다.');
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
  };

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case '정상':
        return 'success';
      case '경고':
        return 'warning';
      case '오류':
        return 'error';
      case '정보':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          시스템 이력
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            전체 {total}건
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            size="small"
          >
            엑셀 다운로드
          </Button>
        </Box>
      </Box>

      {/* 필터 섹션 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 첫 번째 행: 날짜 필터 */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="시작일"
                  value={filters.startDate ? dayjs(filters.startDate) : null}
                  onChange={(newValue: Dayjs | null) => {
                    handleFilterChange('startDate', newValue ? newValue.format('YYYY-MM-DD') : '');
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      placeholder: 'YYYY-MM-DD',
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="종료일"
                  value={filters.endDate ? dayjs(filters.endDate) : null}
                  onChange={(newValue: Dayjs | null) => {
                    handleFilterChange('endDate', newValue ? newValue.format('YYYY-MM-DD') : '');
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      placeholder: 'YYYY-MM-DD',
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="계정 검색"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="계정명을 입력하세요"
                size="small"
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>구분</InputLabel>
                <Select
                  value={filters.logType}
                  label="구분"
                  onChange={(e) => handleFilterChange('logType', e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="정상">정상</MenuItem>
                  <MenuItem value="경고">경고</MenuItem>
                  <MenuItem value="오류">오류</MenuItem>
                  <MenuItem value="정보">정보</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* 두 번째 행: 로그 및 IP 검색 */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="로그 검색"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                placeholder="로그 내용을 입력하세요"
                size="small"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="IP 검색"
                value={filters.ipAddress}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                placeholder="IP 주소를 입력하세요"
                size="small"
              />
            </Box>
          </Box>

          {/* 세 번째 행: 버튼 */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleReset}
              size="small"
            >
              초기화
            </Button>
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleSearch}
              size="small"
            >
              검색
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="40px"></TableCell>
              <TableCell width="180px">이력 발생 시간</TableCell>
              <TableCell width="120px">계정</TableCell>
              <TableCell width="100px">구분</TableCell>
              <TableCell>세부 정보</TableCell>
              <TableCell width="140px">IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  조회된 이력이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow hover>
                    <TableCell>
                      {(log.beforeValue || log.afterValue) && (
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(log.id)}
                        >
                          {expandedRow === log.id ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.username}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.logType}
                        color={getLogTypeColor(log.logType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {log.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                  </TableRow>
                  {/* 변경 내역 확장 행 */}
                  {(log.beforeValue || log.afterValue) && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, borderBottom: expandedRow === log.id ? undefined : 'none' }}>
                        <Collapse in={expandedRow === log.id} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 3, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              변경 내역
                            </Typography>
                            {log.beforeValue && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  변경 전:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 2 }}>
                                  {log.beforeValue}
                                </Typography>
                              </Box>
                            )}
                            {log.afterValue && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  변경 후:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 2 }}>
                                  {log.afterValue}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 및 페이지 크기 선택 */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl size="small">
          <Select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            <MenuItem value={30}>30개씩 보기</MenuItem>
            <MenuItem value={50}>50개씩 보기</MenuItem>
            <MenuItem value={100}>100개씩 보기</MenuItem>
          </Select>
        </FormControl>

        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );
};

export default SystemLogsPage;
