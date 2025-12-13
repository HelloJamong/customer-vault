import { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, CircularProgress, Divider, Chip } from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import type { Customer } from '@/types/customer.types';

const CustomerDetailPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await apiClient.get(`/customers/${customerId}`);
        setCustomer(response.data);
      } catch (error) {
        console.error('고객사 정보 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const InfoItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={3}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={9}>
        <Typography variant="body1">
          {value || '-'}
        </Typography>
      </Grid>
    </Grid>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box>
        <Typography variant="h5" color="error">
          고객사를 찾을 수 없습니다.
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/customers')}
          sx={{ mt: 2 }}
        >
          목록으로
        </Button>
      </Box>
    );
  }

  const getInspectionCycleText = () => {
    if (customer.inspectionCycleType === '매월') return '매월';
    if (customer.inspectionCycleType === '분기') return `분기 (${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '반기') return `반기 (${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '연1회') return `연1회 (${customer.inspectionCycleMonth}월)`;
    return customer.inspectionCycleType || '-';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/customers')}
          >
            목록으로
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {customer.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              고객사 세부 정보
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => alert('편집 기능은 곧 구현됩니다')}
        >
          수정
        </Button>
      </Box>

      {/* 기본 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          기본 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <InfoItem label="고객사명" value={customer.name} />
        <InfoItem label="위치" value={customer.location} />
      </Paper>

      {/* 담당자 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          담당자 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <InfoItem label="담당자명" value={customer.contactName} />
        <InfoItem label="직책" value={customer.contactPosition} />
        <InfoItem label="부서" value={customer.contactDepartment} />
        <InfoItem label="휴대전화" value={customer.contactMobile} />
        <InfoItem label="유선전화" value={customer.contactPhone} />
        <InfoItem label="이메일" value={customer.contactEmail} />
      </Paper>

      {/* 계약 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          계약 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <InfoItem label="계약 상태" value={customer.contractType} />
        <InfoItem label="계약 시작일" value={customer.contractStartDate} />
        <InfoItem label="계약 종료일" value={customer.contractEndDate} />
      </Paper>

      {/* 점검 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          점검 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <InfoItem label="점검 주기" value={getInspectionCycleText()} />
        <InfoItem label="최근 점검일" value={customer.lastInspectionDate} />
        {customer.inspectionStatus && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                점검 상태
              </Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Chip
                label={customer.inspectionStatus}
                color={
                  customer.inspectionStatus === '점검 완료' ? 'success' :
                  customer.inspectionStatus === '미완료' ? 'error' :
                  'default'
                }
                size="small"
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* 사내 담당자 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          사내 담당자
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <InfoItem label="엔지니어" value={customer.engineer?.name} />
        <InfoItem label="부 엔지니어" value={customer.engineerSub?.name} />
        <InfoItem label="영업 담당" value={customer.sales?.name} />
      </Paper>

      {/* 비고 */}
      {customer.notes && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            비고
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {customer.notes}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default CustomerDetailPage;
