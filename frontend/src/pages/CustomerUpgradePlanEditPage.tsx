import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Divider,
  TextField,
  IconButton,
  Checkbox,
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Save, Add, Delete, ExpandMore } from '@mui/icons-material';
import apiClient from '@/api/axios';
import { getApiErrorMessage } from '@/utils/api-error';

type ConsiderationCategory = '클라이언트' | '관리서버' | '커스텀';
type PlanStatus = '예정' | '미정' | '완료';

interface Consideration {
  id?: number;
  category: ConsiderationCategory;
  feature: string;
  description: string;
  checked: boolean;
  note: string;
  checkedBy?: { id: number; name: string } | null;
  checkedByName?: string | null;
  displayOrder: number;
}

interface UpgradePlanFormData {
  id: number | null;
  status: PlanStatus;
  currentVersion: string;
  targetVersion: string;
  scheduleEstimate: string;
  considerations: Consideration[];
}

const createConsideration = (category: ConsiderationCategory, displayOrder: number): Consideration => ({
  category,
  feature: '',
  description: '',
  checked: false,
  note: '',
  displayOrder,
});

const CustomerUpgradePlanEditPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UpgradePlanFormData>({
    id: null,
    status: '미정',
    currentVersion: '',
    targetVersion: '',
    scheduleEstimate: '',
    considerations: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const customerResponse = await apiClient.get(`/customers/${customerId}`);
        setCustomerName(customerResponse.data.name);

        const planResponse = await apiClient.get(`/customers/${customerId}/upgrade-plan`);
        if (planResponse.data) {
          setFormData({
            id: planResponse.data.id,
            status: planResponse.data.status || '미정',
            currentVersion: planResponse.data.currentVersion || '',
            targetVersion: planResponse.data.targetVersion || '',
            scheduleEstimate: planResponse.data.scheduleEstimate || '',
            considerations: planResponse.data.considerations || [],
          });
        }
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

  const handleAddConsideration = (category: ConsiderationCategory) => {
    setFormData({
      ...formData,
      considerations: [...formData.considerations, createConsideration(category, formData.considerations.length)],
    });
  };

  const handleConsiderationChange = <K extends keyof Consideration>(
    index: number,
    field: K,
    value: Consideration[K],
  ) => {
    const considerations = [...formData.considerations];
    considerations[index] = { ...considerations[index], [field]: value };
    setFormData({ ...formData, considerations });
  };

  const handleRemoveConsideration = (index: number) => {
    setFormData({
      ...formData,
      considerations: formData.considerations.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const dataToSend = {
        status: formData.status,
        currentVersion: formData.currentVersion.trim() || undefined,
        targetVersion: formData.targetVersion.trim() || undefined,
        scheduleEstimate: formData.scheduleEstimate.trim() || undefined,
        considerations: formData.considerations
          .filter((item) => item.feature.trim())
          .map((item, displayOrder) => ({
            id: item.id,
            category: item.category,
            feature: item.feature.trim(),
            description: item.description.trim() || undefined,
            checked: item.checked,
            note: item.note.trim() || undefined,
            displayOrder,
          })),
      };

      if (formData.id) {
        await apiClient.put(`/customers/${customerId}/upgrade-plan`, dataToSend);
      } else {
        await apiClient.post(`/customers/${customerId}/upgrade-plan`, dataToSend);
      }
      alert('저장되었습니다.');
      navigate(`/customers/${customerId}/upgrade-plan`);
    } catch (error) {
      console.error('저장 실패:', error);
      alert(getApiErrorMessage(error, '저장에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  const renderConsiderationTable = (category: ConsiderationCategory, title: string) => {
    const items = formData.considerations
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.category === category);

    return (
      <Box>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 160, whiteSpace: 'nowrap' }}>기능</TableCell>
                <TableCell sx={{ minWidth: 220 }}>설명</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }} align="center">확인여부</TableCell>
                <TableCell sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>확인자</TableCell>
                <TableCell sx={{ minWidth: 180 }}>비고</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(({ item, originalIndex }) => (
                <TableRow key={item.id || originalIndex}>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.feature}
                      onChange={(e) => handleConsiderationChange(originalIndex, 'feature', e.target.value)}
                      placeholder="예: 로그인 방식 변경"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      value={item.description}
                      onChange={(e) => handleConsiderationChange(originalIndex, 'description', e.target.value)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={item.checked}
                      onChange={(e) => handleConsiderationChange(originalIndex, 'checked', e.target.checked)}
                      inputProps={{ 'aria-label': `${item.feature || '항목'} 확인여부` }}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {item.checked ? (item.checkedBy?.name || item.checkedByName || '저장 시 로그인 계정') : '-'}
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.note}
                      onChange={(e) => handleConsiderationChange(originalIndex, 'note', e.target.value)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveConsideration(originalIndex)}
                      aria-label={`${title} ${originalIndex + 1}번째 항목 삭제`}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button size="small" startIcon={<Add />} onClick={() => handleAddConsideration(category)} sx={{ mt: 1 }}>
          항목 추가
        </Button>
      </Box>
    );
  };

  const considerationCount = (category: ConsiderationCategory) =>
    formData.considerations.filter((item) => item.category === category).length;

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/customers/${customerId}/upgrade-plan`)}
        >
          목록으로
        </Button>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {customerName || '고객사'} - 업그레이드 계획 {formData.id ? '수정' : '등록'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          업그레이드 일정 상태
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <ToggleButtonGroup
          exclusive
          value={formData.status}
          onChange={(_, value) => value && setFormData({ ...formData, status: value })}
        >
          <ToggleButton
            value="예정"
            sx={{ '&.Mui-selected': { color: '#fff', bgcolor: '#f59e0b', '&:hover': { bgcolor: '#f59e0b' } } }}
          >
            예정
          </ToggleButton>
          <ToggleButton value="미정">미정</ToggleButton>
          <ToggleButton
            value="완료"
            sx={{ '&.Mui-selected': { color: '#fff', bgcolor: '#16a34a', '&:hover': { bgcolor: '#16a34a' } } }}
          >
            완료
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          버전 관리 및 일정
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="현재 버전"
              value={formData.currentVersion}
              onChange={(e) => setFormData({ ...formData, currentVersion: e.target.value })}
              placeholder="예: 6.1.20260916"
            />
          </Grid>
          <Grid xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="업그레이드 버전"
              value={formData.targetVersion}
              onChange={(e) => setFormData({ ...formData, targetVersion: e.target.value })}
              placeholder="예: 7.0.0"
            />
          </Grid>
          <Grid xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="예상 일정"
              value={formData.scheduleEstimate}
              onChange={(e) => setFormData({ ...formData, scheduleEstimate: e.target.value })}
              placeholder="예: 26/09 또는 3/4분기"
            />
          </Grid>
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          공통 고려 사항에 해당하지 않는, 이 고객사만의 개별 고려 사항을 입력하세요.
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {renderConsiderationTable('커스텀', '커스텀 항목')}
      </Paper>
    </Box>
  );
};

export default CustomerUpgradePlanEditPage;
