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
import { ArrowBack, Save, Add, Delete, ExpandMore, PlaylistAddCheck } from '@mui/icons-material';
import apiClient from '@/api/axios';
import { getApiErrorMessage } from '@/utils/api-error';
import { useAuthStore } from '@/store/authStore';
import { UPGRADE_PLAN_DEFAULT_CONSIDERATIONS } from '@/utils/upgrade-plan-template';

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
  verified: boolean;
  verifiedBy?: { id: number; name: string } | null;
  verifiedByName?: string | null;
  displayOrder: number;
}

type ApiConsideration = Omit<Consideration, 'description' | 'note'> & {
  description?: string | null;
  note?: string | null;
};

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
  verified: false,
  note: '',
  displayOrder,
});

const CustomerUpgradePlanEditPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
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
            considerations: (planResponse.data.considerations || []).map((item: ApiConsideration) => ({
              ...item,
              description: item.description ?? '',
              note: item.note ?? '',
              verified: !!item.verified,
            })),
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
    const invalidatesReview = field === 'category' || field === 'feature' || field === 'description';
    considerations[index] = {
      ...considerations[index],
      [field]: value,
      ...(invalidatesReview ? { checked: false, verified: false } : {}),
    };
    setFormData({ ...formData, considerations });
  };

  const handleRemoveConsideration = (index: number) => {
    setFormData({
      ...formData,
      considerations: formData.considerations.filter((_, i) => i !== index),
    });
  };

  const handleReviewChange = (index: number, checked: boolean) => {
    const considerations = [...formData.considerations];
    considerations[index] = {
      ...considerations[index],
      checked,
      verified: checked ? considerations[index].verified : false,
    };
    setFormData({ ...formData, considerations });
  };

  const handleUseDefaultTemplate = () => {
    const hasCommonItems = formData.considerations.some((item) => item.category !== '커스텀');
    if (hasCommonItems && !window.confirm('기존 공통 고려 사항을 기본 양식으로 교체하시겠습니까? 고객사별 커스텀 항목은 유지됩니다.')) {
      return;
    }

    const customItems = formData.considerations.filter((item) => item.category === '커스텀');
    const defaultItems: Consideration[] = UPGRADE_PLAN_DEFAULT_CONSIDERATIONS.map((item) => ({
      ...item,
      checked: false,
      verified: false,
      note: '',
      displayOrder: 0,
    }));
    const considerations = [...defaultItems, ...customItems]
      .map((item, displayOrder) => ({ ...item, displayOrder }));

    setFormData({ ...formData, considerations });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const dataToSend = {
        status: formData.status,
        // 빈 문자열로 명시 전송해야 기존 값을 지울 수 있다 (undefined는 "값 유지"로 해석됨)
        currentVersion: formData.currentVersion.trim(),
        targetVersion: formData.targetVersion.trim(),
        scheduleEstimate: formData.scheduleEstimate.trim(),
        considerations: formData.considerations
          .filter((item) => item.feature.trim())
          .map((item, displayOrder) => ({
            id: item.id,
            category: item.category,
            feature: item.feature.trim(),
            description: item.description?.trim() || undefined,
            checked: item.checked,
            verified: item.verified,
            note: item.note?.trim() || undefined,
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
                <TableCell sx={{ minWidth: 360 }}>설명</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }} align="center">검토</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }} align="center">검증</TableCell>
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
                      onChange={(e) => handleReviewChange(originalIndex, e.target.checked)}
                      inputProps={{ 'aria-label': `${item.feature || '항목'} 검토 여부` }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={item.verified}
                      disabled={
                        !item.checked
                        || !(item.checkedBy?.name || item.checkedByName)
                        || item.checkedBy?.id === currentUser?.id
                      }
                      onChange={(e) => handleConsiderationChange(originalIndex, 'verified', e.target.checked)}
                      inputProps={{ 'aria-label': `${item.feature || '항목'} 검증 여부` }}
                    />
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
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={1}>
          <Typography variant="h6" fontWeight="bold">
            공통 고려 사항
          </Typography>
          <Button variant="outlined" size="small" startIcon={<PlaylistAddCheck />} onClick={handleUseDefaultTemplate}>
            기본 양식 사용하기
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          검토 저장 후 검토자와 다른 사용자가 검증할 수 있습니다.
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
