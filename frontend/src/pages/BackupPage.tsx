import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Pagination,
} from '@mui/material';
import { Download, Refresh, PlayArrow } from '@mui/icons-material';
import { backupApi } from '@/api/backup.api';
import type { BackupLog } from '@/types/backup.types';
import dayjs from 'dayjs';

const statusLabel: Record<string, { label: string; color: 'success' | 'error' | 'info' | 'warning' }> = {
  success: { label: '성공', color: 'success' },
  failed: { label: '실패', color: 'error' },
  running: { label: '실행 중', color: 'info' },
};

const typeLabel: Record<string, string> = {
  auto: '자동',
  manual: '수동',
};

function formatTargets(targets: string): string {
  return targets
    .split(',')
    .map((t) => (t.trim() === 'db' ? 'DB' : '점검서'))
    .join(', ');
}

function formatDestinations(destinations: string): string {
  return destinations
    .split(',')
    .map((d) => (d.trim() === 'local' ? '로컬' : '원격'))
    .join(', ');
}

function formatFileSize(size: string | null): string {
  if (!size) return '-';
  const bytes = parseInt(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const BackupPage = () => {
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchLogs = useCallback(async (p: number = 1) => {
    try {
      setLoading(true);
      const result = await backupApi.getLogs(p, 20);
      setLogs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setSnackbar({ open: true, message: '백업 이력을 불러오는데 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const handleRunBackup = async () => {
    try {
      setRunning(true);
      await backupApi.runBackup();
      setSnackbar({ open: true, message: '백업이 완료되었습니다.', severity: 'success' });
      await fetchLogs(1);
      setPage(1);
    } catch (err: any) {
      const msg = err.response?.data?.message || '백업 실행에 실패했습니다.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      setDownloading(id);
      await backupApi.downloadBackup(id);
    } catch {
      setSnackbar({ open: true, message: '파일 다운로드에 실패했습니다.', severity: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">백업 관리</Typography>
          <Typography variant="body2" color="text.secondary">
            데이터베이스 및 점검서 파일 백업 이력을 조회하고 즉시 백업을 실행합니다.
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="새로고침">
            <IconButton onClick={() => fetchLogs(page)} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
            onClick={handleRunBackup}
            disabled={running}
          >
            {running ? '백업 실행 중...' : '즉시 백업 실행'}
          </Button>
        </Box>
      </Box>

      <Paper>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            전체 {total}개
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell width={60}>번호</TableCell>
                <TableCell width={80}>유형</TableCell>
                <TableCell width={120}>대상</TableCell>
                <TableCell width={120}>저장 경로</TableCell>
                <TableCell width={90}>상태</TableCell>
                <TableCell width={100}>크기</TableCell>
                <TableCell width={160}>시작 시각</TableCell>
                <TableCell width={160}>완료 시각</TableCell>
                <TableCell width={80} align="center">다운로드</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">백업 이력이 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => {
                  const statusInfo = statusLabel[log.status] ?? { label: log.status, color: 'warning' as const };
                  const hasLocalFile = log.filePath && log.destinations.includes('local');
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell>{(page - 1) * 20 + idx + 1}</TableCell>
                      <TableCell>
                        <Chip
                          label={typeLabel[log.type] ?? log.type}
                          size="small"
                          variant="outlined"
                          color={log.type === 'auto' ? 'default' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>{formatTargets(log.targets)}</TableCell>
                      <TableCell>{formatDestinations(log.destinations)}</TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color}
                        />
                        {log.status === 'failed' && log.errorMessage && (
                          <Tooltip title={log.errorMessage}>
                            <Typography variant="caption" color="error" sx={{ display: 'block', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.errorMessage}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(log.fileSize)}</TableCell>
                      <TableCell>
                        {dayjs(log.startedAt).format('YYYY-MM-DD HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.completedAt
                          ? dayjs(log.completedAt).format('YYYY-MM-DD HH:mm:ss')
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {hasLocalFile ? (
                          <Tooltip title="파일 다운로드">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(log.id)}
                              disabled={downloading === log.id}
                              color="primary"
                            >
                              {downloading === log.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Download fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BackupPage;
