import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  IconButton,
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Edit, ExpandMore, Delete, Save, Close } from '@mui/icons-material';
import apiClient from '@/api/axios';
import type { Customer } from '@/types/customer.types';
import { useAuthStore } from '@/store/authStore';

type ConsiderationCategory = '클라이언트' | '관리서버' | '커스텀';

interface Consideration {
  id: number;
  category: ConsiderationCategory;
  feature: string;
  description: string | null;
  checked: boolean;
  note: string | null;
  checkedBy?: { id: number; name: string } | null;
  checkedByName?: string | null;
  verified: boolean;
  verifiedBy?: { id: number; name: string } | null;
  verifiedByName?: string | null;
  displayOrder: number;
}

interface ProgressLog {
  id: number;
  logDate: string;
  authorName: string;
  content: string;
  createdByUserId: number | null;
}

interface ProgressLogForm {
  logDate: string;
  authorName: string;
  content: string;
}

interface UpgradePlan {
  id: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  status: '예정' | '미정' | '완료';
  currentVersion: string | null;
  targetVersion: string | null;
  scheduleEstimate: string | null;
  verifierName: string | null;
  considerations: Consideration[];
  progressLogs: ProgressLog[];
}

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD (로컬 기준)

const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <Grid xs={12} sm={4}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1">{value || '-'}</Typography>
  </Grid>
);

const CustomerUpgradePlanPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<UpgradePlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const isAdmin = ['admin', 'super_admin'].includes(user?.role?.toLowerCase() || '');
  const [newLog, setNewLog] = useState<ProgressLogForm>({ logDate: today(), authorName: user?.name || '', content: '' });
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLog, setEditLog] = useState<ProgressLogForm>({ logDate: '', authorName: '', content: '' });
  const [isSavingLog, setIsSavingLog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerResponse, planResponse] = await Promise.all([
          apiClient.get(`/customers/${customerId}`),
          apiClient.get(`/customers/${customerId}/upgrade-plan`),
        ]);
        setCustomer(customerResponse.data);
        setUpgradePlan(planResponse.data);
      } catch (error) {
        console.error('업그레이드 계획 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  const renderConsiderationTable = (category: ConsiderationCategory, title: string) => {
    const items = (upgradePlan?.considerations || []).filter((item) => item.category === category);

    if (items.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          등록된 {title} 고려 사항이 없습니다.
        </Typography>
      );
    }

    return (
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1040 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 160, whiteSpace: 'nowrap' }}>기능</TableCell>
              <TableCell sx={{ minWidth: 220 }}>설명</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }} align="center">검토</TableCell>
              <TableCell sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>검토자</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }} align="center">검증</TableCell>
              <TableCell sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>검증자</TableCell>
              <TableCell sx={{ minWidth: 180 }}>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.feature}</TableCell>
                <TableCell>{item.description || '-'}</TableCell>
                <TableCell align="center">
                  <Checkbox checked={item.checked} disabled size="small" inputProps={{ 'aria-label': `${item.feature} 검토 여부` }} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {item.checked ? (item.checkedBy?.name || item.checkedByName || '-') : '-'}
                </TableCell>
                <TableCell align="center">
                  <Checkbox checked={item.verified} disabled size="small" inputProps={{ 'aria-label': `${item.feature} 검증 여부` }} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {item.verified ? (item.verifiedBy?.name || item.verifiedByName || '-') : '-'}
                </TableCell>
                <TableCell>{item.note || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const progressLogsUrl = `/customers/${customerId}/upgrade-plan/progress-logs`;

  const handleAddLog = async () => {
    if (!newLog.content.trim()) { alert('내용을 입력해주세요.'); return; }
    setIsSavingLog(true);
    try {
      const response = await apiClient.post(progressLogsUrl, newLog);
      setUpgradePlan(response.data);
      setNewLog({ logDate: today(), authorName: user?.name || '', content: '' });
    } catch (error) {
      alert(apiErrorMessage(error, '진척 현황 추가에 실패했습니다.'));
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleUpdateLog = async (logId: number) => {
    if (!editLog.content.trim()) { alert('내용을 입력해주세요.'); return; }
    setIsSavingLog(true);
    try {
      const response = await apiClient.put(`${progressLogsUrl}/${logId}`, editLog);
      setUpgradePlan(response.data);
      setEditingLogId(null);
    } catch (error) {
      alert(apiErrorMessage(error, '진척 현황 수정에 실패했습니다.'));
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleDeleteLog = async (logId: number) => {
    if (!window.confirm('이 진척 현황 기록을 삭제하시겠습니까?')) return;
    try {
      const response = await apiClient.delete(`${progressLogsUrl}/${logId}`);
      setUpgradePlan(response.data);
    } catch (error) {
      alert(apiErrorMessage(error, '진척 현황 삭제에 실패했습니다.'));
    }
  };

  const canModifyLog = (log: ProgressLog) => isAdmin || log.createdByUserId === user?.id;

  const considerationCount = (category: ConsiderationCategory) =>
    (upgradePlan?.considerations || []).filter((item) => item.category === category).length;

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/customers')}>
          목록으로
        </Button>
        <Box flex={1}>
          <Box display="flex" alignItems="baseline" gap={2} flexWrap="wrap">
            <Typography variant="h4" fontWeight="bold">
              {customer?.name || '고객사'} - 업그레이드 계획
            </Typography>
            <Typography variant="body2" color="text.secondary">
              최종 수정: {formatDateTime(upgradePlan?.updatedAt)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            메이저 버전 업그레이드 시 고려해야 할 항목을 관리합니다
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => navigate(`/customers/${customerId}/upgrade-plan/edit`)}
        >
          수정
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          업그레이드 일정 상태
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Chip
          label={upgradePlan?.status || '미정'}
          sx={
            upgradePlan?.status === '예정'
              ? { bgcolor: '#f59e0b', color: '#fff' }
              : upgradePlan?.status === '완료'
                ? { bgcolor: '#16a34a', color: '#fff' }
                : undefined
          }
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          버전 관리 및 일정
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <InfoItem label="현재 버전" value={upgradePlan?.currentVersion} />
          <InfoItem label="업그레이드 버전" value={upgradePlan?.targetVersion} />
          <InfoItem label="예상 일정" value={upgradePlan?.scheduleEstimate} />
          <InfoItem label="검증 담당자" value={upgradePlan?.verifierName || '미지정'} />
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          공통 고려 사항
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Stack spacing={2}>
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" fontWeight="bold">
                클라이언트 ({considerationCount('클라이언트')})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>{renderConsiderationTable('클라이언트', '클라이언트')}</AccordionDetails>
          </Accordion>
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" fontWeight="bold">
                관리서버(관리웹) ({considerationCount('관리서버')})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>{renderConsiderationTable('관리서버', '관리서버')}</AccordionDetails>
          </Accordion>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          고객사별 커스텀 항목
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {renderConsiderationTable('커스텀', '커스텀 항목')}
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          진척 현황
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="flex-start">
          <TextField
            label="날짜"
            type="date"
            size="small"
            value={newLog.logDate}
            onChange={(e) => setNewLog({ ...newLog, logDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="작성자"
            size="small"
            value={newLog.authorName}
            onChange={(e) => setNewLog({ ...newLog, authorName: e.target.value })}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="내용"
            size="small"
            multiline
            minRows={1}
            sx={{ flex: 1, minWidth: 240 }}
            value={newLog.content}
            onChange={(e) => setNewLog({ ...newLog, content: e.target.value })}
            inputProps={{ maxLength: 5000 }}
          />
          <Button variant="contained" onClick={handleAddLog} disabled={isSavingLog || !newLog.logDate}>
            추가
          </Button>
        </Box>
        {(upgradePlan?.progressLogs || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            등록된 진척 현황이 없습니다.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 150, whiteSpace: 'nowrap' }}>날짜</TableCell>
                  <TableCell sx={{ width: 140, whiteSpace: 'nowrap' }}>작성자</TableCell>
                  <TableCell>내용</TableCell>
                  <TableCell sx={{ width: 100 }} align="center" />
                </TableRow>
              </TableHead>
              <TableBody>
                {(upgradePlan?.progressLogs || []).map((log) =>
                  editingLogId === log.id ? (
                    <TableRow key={log.id}>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={editLog.logDate}
                          onChange={(e) => setEditLog({ ...editLog, logDate: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editLog.authorName}
                          onChange={(e) => setEditLog({ ...editLog, authorName: e.target.value })}
                          inputProps={{ maxLength: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          multiline
                          fullWidth
                          value={editLog.content}
                          onChange={(e) => setEditLog({ ...editLog, content: e.target.value })}
                          inputProps={{ maxLength: 5000 }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton size="small" aria-label="저장" onClick={() => handleUpdateLog(log.id)} disabled={isSavingLog || !editLog.logDate}>
                          <Save fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="취소" onClick={() => setEditingLogId(null)}>
                          <Close fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={log.id}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{log.logDate}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{log.authorName}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{log.content}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        {canModifyLog(log) && (
                          <>
                            <IconButton
                              size="small"
                              aria-label="수정"
                              onClick={() => {
                                setEditingLogId(log.id);
                                setEditLog({ logDate: log.logDate, authorName: log.authorName, content: log.content });
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" aria-label="삭제" onClick={() => handleDeleteLog(log.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerUpgradePlanPage;
