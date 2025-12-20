import { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, CircularProgress, Divider, Chip } from '@mui/material';
import { ArrowBack, Edit, Download } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import type { Customer } from '@/types/customer.types';
import * as XLSX from 'xlsx';
import { logsApi } from '@/api/logs.api';

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

  const handleExportToExcel = async () => {
    if (!customer) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `${customer.name}_세부사항_${dateStr}.xlsx`;

    const data: (string | number)[][] = [];

    // 헤더
    data.push(['고객사 세부사항']);
    data.push([]);

    // 기본 정보
    data.push(['[기본 정보]']);
    data.push(['고객사명', customer.name || '']);
    data.push(['위치', customer.location || '']);
    data.push([]);

    // 담당자 정보
    data.push(['[담당자 정보]']);
    data.push(['담당자명', customer.contactName || '']);
    data.push(['직책', customer.contactPosition || '']);
    data.push(['부서', customer.contactDepartment || '']);
    data.push(['휴대전화', customer.contactMobile || '']);
    data.push(['유선전화', customer.contactPhone || '']);
    data.push(['이메일', customer.contactEmail || '']);
    data.push([]);

    // 부 담당자 1
    if (customer.contactNameSub1) {
      data.push(['[부 담당자 1]']);
      data.push(['담당자명', customer.contactNameSub1 || '']);
      data.push(['직책', customer.contactPositionSub1 || '']);
      data.push(['부서', customer.contactDepartmentSub1 || '']);
      data.push(['휴대전화', customer.contactMobileSub1 || '']);
      data.push(['유선전화', customer.contactPhoneSub1 || '']);
      data.push(['이메일', customer.contactEmailSub1 || '']);
      data.push([]);
    }

    // 부 담당자 2
    if (customer.contactNameSub2) {
      data.push(['[부 담당자 2]']);
      data.push(['담당자명', customer.contactNameSub2 || '']);
      data.push(['직책', customer.contactPositionSub2 || '']);
      data.push(['부서', customer.contactDepartmentSub2 || '']);
      data.push(['휴대전화', customer.contactMobileSub2 || '']);
      data.push(['유선전화', customer.contactPhoneSub2 || '']);
      data.push(['이메일', customer.contactEmailSub2 || '']);
      data.push([]);
    }

    // 부 담당자 3
    if (customer.contactNameSub3) {
      data.push(['[부 담당자 3]']);
      data.push(['담당자명', customer.contactNameSub3 || '']);
      data.push(['직책', customer.contactPositionSub3 || '']);
      data.push(['부서', customer.contactDepartmentSub3 || '']);
      data.push(['휴대전화', customer.contactMobileSub3 || '']);
      data.push(['유선전화', customer.contactPhoneSub3 || '']);
      data.push(['이메일', customer.contactEmailSub3 || '']);
      data.push([]);
    }

    // 계약 정보
    data.push(['[계약 정보]']);
    data.push(['계약 상태', customer.contractType || '']);
    data.push(['계약 시작일', customer.contractStartDate || '']);
    data.push(['계약 종료일', customer.contractEndDate || '']);
    data.push([]);

    // 점검 정보
    data.push(['[점검 정보]']);
    data.push(['점검 주기', getInspectionCycleText()]);
    data.push(['최근 점검일', customer.lastInspectionDate || '']);
    data.push(['점검 상태', customer.inspectionStatus || '']);
    data.push([]);

    // 사내 담당자
    data.push(['[사내 담당자]']);
    data.push(['엔지니어', customer.engineer?.name || '']);
    data.push(['부 엔지니어', customer.engineerSub?.name || '']);
    data.push(['영업 담당', customer.sales?.name || '']);
    data.push([]);

    // 비고
    if (customer.notes) {
      data.push(['[비고]']);
      data.push([customer.notes]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 50 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '세부사항');

    XLSX.writeFile(wb, filename);

    // 로그 기록
    try {
      await logsApi.logExcelExport({
        action: '고객사 세부사항 엑셀 내보내기',
        description: `${customer.name} 고객사 세부사항을 엑셀로 내보냄`,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
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
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportToExcel}
          >
            엑셀로 내보내기
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/customers/${customerId}/edit`)}
          >
            수정
          </Button>
        </Box>
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

      {/* 부 담당자 1 */}
      {customer.contactNameSub1 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            부 담당자 1
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <InfoItem label="담당자명" value={customer.contactNameSub1} />
          <InfoItem label="직책" value={customer.contactPositionSub1} />
          <InfoItem label="부서" value={customer.contactDepartmentSub1} />
          <InfoItem label="휴대전화" value={customer.contactMobileSub1} />
          <InfoItem label="유선전화" value={customer.contactPhoneSub1} />
          <InfoItem label="이메일" value={customer.contactEmailSub1} />
        </Paper>
      )}

      {/* 부 담당자 2 */}
      {customer.contactNameSub2 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            부 담당자 2
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <InfoItem label="담당자명" value={customer.contactNameSub2} />
          <InfoItem label="직책" value={customer.contactPositionSub2} />
          <InfoItem label="부서" value={customer.contactDepartmentSub2} />
          <InfoItem label="휴대전화" value={customer.contactMobileSub2} />
          <InfoItem label="유선전화" value={customer.contactPhoneSub2} />
          <InfoItem label="이메일" value={customer.contactEmailSub2} />
        </Paper>
      )}

      {/* 부 담당자 3 */}
      {customer.contactNameSub3 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            부 담당자 3
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <InfoItem label="담당자명" value={customer.contactNameSub3} />
          <InfoItem label="직책" value={customer.contactPositionSub3} />
          <InfoItem label="부서" value={customer.contactDepartmentSub3} />
          <InfoItem label="휴대전화" value={customer.contactMobileSub3} />
          <InfoItem label="유선전화" value={customer.contactPhoneSub3} />
          <InfoItem label="이메일" value={customer.contactEmailSub3} />
        </Paper>
      )}

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
