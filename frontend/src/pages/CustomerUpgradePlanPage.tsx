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
} from '@mui/material';
import Grid from '@/mui-grid2';
import { ArrowBack, Edit, ExpandMore } from '@mui/icons-material';
import apiClient from '@/api/axios';
import type { Customer } from '@/types/customer.types';

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

interface UpgradePlan {
  id: number | null;
  status: '예정' | '미정' | '완료';
  currentVersion: string | null;
  targetVersion: string | null;
  scheduleEstimate: string | null;
  considerations: Consideration[];
}

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

  const considerationCount = (category: ConsiderationCategory) =>
    (upgradePlan?.considerations || []).filter((item) => item.category === category).length;

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3} gap={2}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/customers')}>
          목록으로
        </Button>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {customer?.name || '고객사'} - 업그레이드 계획
          </Typography>
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
    </Box>
  );
};

export default CustomerUpgradePlanPage;
