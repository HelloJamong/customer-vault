import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@/mui-grid2';
import {
  ArrowBack,
  Save,
  Add,
  Delete,
  ExpandMore,
  DeleteForever,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth.types';
import type { Customer, InspectionTarget, UpdateCustomerDto } from '@/types/customer.types';

type UserOption = {
  id: number;
  name: string;
  department?: string;
};

// dayjs 한국어 설정
dayjs.locale('ko');

const CustomerEditPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const { deleteCustomer } = useCustomers();
  const user = useAuthStore((state) => state.user);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState<UpdateCustomerDto>({});

  // 부담당자 표시 상태
  const [showSubContact1, setShowSubContact1] = useState(false);
  const [showSubContact2, setShowSubContact2] = useState(false);
  const [showSubContact3, setShowSubContact3] = useState(false);

  // 점검 대상 관리
  const [inspectionTargets, setInspectionTargets] = useState<InspectionTarget[]>([]);
  const [openTargetDialog, setOpenTargetDialog] = useState(false);
  const [newTarget, setNewTarget] = useState({ targetType: '', productName: '' });

  // 삭제 다이얼로그
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // 사내 담당자 옵션
  const [engineerOptions, setEngineerOptions] = useState<UserOption[]>([]);
  const [salesOptions, setSalesOptions] = useState<UserOption[]>([]);

  useEffect(() => {
    fetchCustomer();
    fetchTeamMembers();
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await apiClient.get(`/customers/${customerId}`);
      const data = response.data;
      setCustomer(data);
      setFormData({
        name: data.name,
        location: data.location || '',
        contactName: data.contactName || '',
        contactPosition: data.contactPosition || '',
        contactDepartment: data.contactDepartment || '',
        contactMobile: data.contactMobile || '',
        contactPhone: data.contactPhone || '',
        contactEmail: data.contactEmail || '',
        contactNameSub1: data.contactNameSub1 || '',
        contactPositionSub1: data.contactPositionSub1 || '',
        contactDepartmentSub1: data.contactDepartmentSub1 || '',
        contactMobileSub1: data.contactMobileSub1 || '',
        contactPhoneSub1: data.contactPhoneSub1 || '',
        contactEmailSub1: data.contactEmailSub1 || '',
        contactNameSub2: data.contactNameSub2 || '',
        contactPositionSub2: data.contactPositionSub2 || '',
        contactDepartmentSub2: data.contactDepartmentSub2 || '',
        contactMobileSub2: data.contactMobileSub2 || '',
        contactPhoneSub2: data.contactPhoneSub2 || '',
        contactEmailSub2: data.contactEmailSub2 || '',
        contactNameSub3: data.contactNameSub3 || '',
        contactPositionSub3: data.contactPositionSub3 || '',
        contactDepartmentSub3: data.contactDepartmentSub3 || '',
        contactMobileSub3: data.contactMobileSub3 || '',
        contactPhoneSub3: data.contactPhoneSub3 || '',
        contactEmailSub3: data.contactEmailSub3 || '',
        contractType: data.contractType || '미계약',
        contractStartDate: data.contractStartDate || '',
        contractEndDate: data.contractEndDate || '',
        hardwareIncluded: data.hardwareIncluded ?? true,
        inspectionCycleType: data.inspectionCycleType || '매월',
        inspectionCycleMonth: data.inspectionCycleMonth || null,
        lastInspectionDate: data.lastInspectionDate || '',
        notes: data.notes || '',
        engineerId: data.engineerId || null,
        engineerSubId: data.engineerSubId || null,
        salesId: data.salesId || null,
      });

      // 부담당자가 있으면 표시
      if (data.contactNameSub1) setShowSubContact1(true);
      if (data.contactNameSub2) setShowSubContact2(true);
      if (data.contactNameSub3) setShowSubContact3(true);

      // 점검 대상 로드
      if (data.inspectionTargets) {
        setInspectionTargets(data.inspectionTargets);
      }
    } catch (error) {
      console.error('고객사 정보 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await apiClient.get('/users/team-members/all');
      const { engineers, sales } = response.data;
      setEngineerOptions(engineers || []);
      setSalesOptions(sales || []);
    } catch (error) {
      console.error('사내 담당자 목록 조회 실패:', error);
    }
  };

  const handleChange = (field: keyof UpdateCustomerDto, value: any) => {
    // 전화번호 필드 검증 (숫자, 하이픈만 허용)
    if (field.includes('Mobile') || field.includes('Phone')) {
      const phoneValue = value.replace(/[^0-9-]/g, '');
      setFormData((prev) => ({ ...prev, [field]: phoneValue }));
      return;
    }

    // 이메일 필드 검증 (한글 입력 방지)
    if (field.includes('Email')) {
      const emailValue = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
      setFormData((prev) => ({ ...prev, [field]: emailValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 이메일 형식 검증
  const isValidEmail = (email: string): boolean => {
    if (!email) return true; // 빈 값은 허용 (선택 필드)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      alert('고객사명은 필수입니다.');
      return;
    }

    // 이메일 형식 검증
    const emailFields = [
      { field: 'contactEmail', label: '주 담당자 이메일' },
      { field: 'contactEmailSub1', label: '부담당자 1 이메일' },
      { field: 'contactEmailSub2', label: '부담당자 2 이메일' },
      { field: 'contactEmailSub3', label: '부담당자 3 이메일' },
    ];

    for (const { field, label } of emailFields) {
      const emailValue = formData[field as keyof UpdateCustomerDto] as string;
      if (emailValue && !isValidEmail(emailValue)) {
        alert(`${label} 형식이 올바르지 않습니다.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const normalizeId = (value: any) =>
        value === '' || value === undefined || value === null ? undefined : value;

      // 빈 문자열을 null로 변환 (날짜 필드)
      const cleanedData: UpdateCustomerDto = {
        ...formData,
        engineerId: normalizeId(formData.engineerId),
        engineerSubId: normalizeId(formData.engineerSubId),
        salesId: normalizeId(formData.salesId),
        contractStartDate: formData.contractStartDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        lastInspectionDate: formData.lastInspectionDate || undefined,
      };

      console.log('저장할 데이터:', cleanedData);
      await apiClient.patch(`/customers/${customerId}`, cleanedData);
      alert('저장되었습니다.');
      navigate(`/customers/${customerId}`);
    } catch (error: any) {
      console.error('저장 실패:', error);
      console.error('에러 응답:', error.response?.data);
      const errorMessage = error.response?.data?.message || '저장에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInspectionTarget = async () => {
    if (!newTarget.targetType.trim()) {
      alert('유형을 입력해주세요.');
      return;
    }

    try {
      const dto: any = {
        customerId: Number(customerId),
        targetType: newTarget.targetType.trim(),
        displayOrder: inspectionTargets.length,
      };

      // productName이 있을 때만 추가
      if (newTarget.productName.trim()) {
        dto.productName = newTarget.productName.trim();
      }

      console.log('Sending DTO:', dto);
      await apiClient.post('/inspection-targets', dto);
      setNewTarget({ targetType: '', productName: '' });
      setOpenTargetDialog(false);
      fetchCustomer(); // 새로고침
    } catch (error: any) {
      console.error('점검 대상 추가 실패:', error);
      console.error('Error response:', error.response?.data);
      alert(`추가에 실패했습니다.\n${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteInspectionTarget = async (targetId: number) => {
    if (!confirm('이 점검 대상을 삭제하시겠습니까?')) return;

    try {
      await apiClient.delete(`/inspection-targets/${targetId}`);
      fetchCustomer(); // 새로고침
    } catch (error) {
      console.error('점검 대상 삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleDeleteCustomer = () => {
    if (deleteConfirmName !== customer?.name) {
      alert('고객사명이 일치하지 않습니다.');
      return;
    }

    deleteCustomer(Number(customerId), {
      onSuccess: () => {
        alert('고객사가 삭제되었습니다.');
        navigate('/customers');
      },
      onError: (error) => {
        console.error('고객사 삭제 실패:', error);
        alert('삭제에 실패했습니다.');
      },
    });
  };

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
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          목록으로
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(`/customers/${customerId}`)}>
            취소
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {customer.name} 수정
            </Typography>
            <Typography variant="body2" color="text.secondary">
              고객사 정보 수정
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </Box>

      {/* 기본 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          기본 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid xs={12} md={6}>
            <TextField
              label="고객사명"
              fullWidth
              required
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <TextField
              label="위치"
              fullWidth
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 주 담당자 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          주 담당자 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid xs={12} md={4}>
            <TextField
              label="담당자명"
              fullWidth
              value={formData.contactName || ''}
              onChange={(e) => handleChange('contactName', e.target.value)}
            />
          </Grid>
          <Grid xs={12} md={4}>
            <TextField
              label="직책"
              fullWidth
              value={formData.contactPosition || ''}
              onChange={(e) => handleChange('contactPosition', e.target.value)}
            />
          </Grid>
          <Grid xs={12} md={4}>
            <TextField
              label="부서"
              fullWidth
              value={formData.contactDepartment || ''}
              onChange={(e) => handleChange('contactDepartment', e.target.value)}
            />
          </Grid>
          <Grid xs={12} md={4}>
            <TextField
              label="휴대전화"
              fullWidth
              value={formData.contactMobile || ''}
              onChange={(e) => handleChange('contactMobile', e.target.value)}
            />
          </Grid>
          <Grid xs={12} md={4}>
            <TextField
              label="유선전화"
              fullWidth
              value={formData.contactPhone || ''}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
            />
          </Grid>
          <Grid xs={12} md={4}>
            <TextField
              label="이메일"
              fullWidth
              type="email"
              value={formData.contactEmail || ''}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 부담당자 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            부담당자 정보
          </Typography>
          <Box>
            {!showSubContact1 && (
              <Button size="small" startIcon={<Add />} onClick={() => setShowSubContact1(true)}>
                부담당자 1 추가
              </Button>
            )}
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* 부담당자 1 */}
        {showSubContact1 && (
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                <Typography>부담당자 1</Typography>
                <Box
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubContact1(false);
                    handleChange('contactNameSub1', '');
                    handleChange('contactPositionSub1', '');
                    handleChange('contactDepartmentSub1', '');
                    handleChange('contactMobileSub1', '');
                    handleChange('contactPhoneSub1', '');
                    handleChange('contactEmailSub1', '');
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: 'error.main',
                    padding: '4px',
                    marginRight: '8px',
                    '&:hover': { opacity: 0.7 },
                  }}
                >
                  <Delete fontSize="small" />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid xs={12} md={4}>
                  <TextField
                    label="담당자명"
                    fullWidth
                    value={formData.contactNameSub1 || ''}
                    onChange={(e) => handleChange('contactNameSub1', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="직책"
                    fullWidth
                    value={formData.contactPositionSub1 || ''}
                    onChange={(e) => handleChange('contactPositionSub1', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="부서"
                    fullWidth
                    value={formData.contactDepartmentSub1 || ''}
                    onChange={(e) => handleChange('contactDepartmentSub1', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="휴대전화"
                    fullWidth
                    value={formData.contactMobileSub1 || ''}
                    onChange={(e) => handleChange('contactMobileSub1', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="유선전화"
                    fullWidth
                    value={formData.contactPhoneSub1 || ''}
                    onChange={(e) => handleChange('contactPhoneSub1', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="이메일"
                    fullWidth
                    type="email"
                    value={formData.contactEmailSub1 || ''}
                    onChange={(e) => handleChange('contactEmailSub1', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* 부담당자 2 */}
        {showSubContact1 && !showSubContact2 && (
          <Button size="small" startIcon={<Add />} onClick={() => setShowSubContact2(true)} sx={{ mb: 2 }}>
            부담당자 2 추가
          </Button>
        )}

        {showSubContact2 && (
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                <Typography>부담당자 2</Typography>
                <Box
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubContact2(false);
                    handleChange('contactNameSub2', '');
                    handleChange('contactPositionSub2', '');
                    handleChange('contactDepartmentSub2', '');
                    handleChange('contactMobileSub2', '');
                    handleChange('contactPhoneSub2', '');
                    handleChange('contactEmailSub2', '');
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: 'error.main',
                    padding: '4px',
                    marginRight: '8px',
                    '&:hover': { opacity: 0.7 },
                  }}
                >
                  <Delete fontSize="small" />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid xs={12} md={4}>
                  <TextField
                    label="담당자명"
                    fullWidth
                    value={formData.contactNameSub2 || ''}
                    onChange={(e) => handleChange('contactNameSub2', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="직책"
                    fullWidth
                    value={formData.contactPositionSub2 || ''}
                    onChange={(e) => handleChange('contactPositionSub2', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="부서"
                    fullWidth
                    value={formData.contactDepartmentSub2 || ''}
                    onChange={(e) => handleChange('contactDepartmentSub2', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="휴대전화"
                    fullWidth
                    value={formData.contactMobileSub2 || ''}
                    onChange={(e) => handleChange('contactMobileSub2', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="유선전화"
                    fullWidth
                    value={formData.contactPhoneSub2 || ''}
                    onChange={(e) => handleChange('contactPhoneSub2', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="이메일"
                    fullWidth
                    type="email"
                    value={formData.contactEmailSub2 || ''}
                    onChange={(e) => handleChange('contactEmailSub2', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* 부담당자 3 */}
        {showSubContact2 && !showSubContact3 && (
          <Button size="small" startIcon={<Add />} onClick={() => setShowSubContact3(true)}>
            부담당자 3 추가
          </Button>
        )}

        {showSubContact3 && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                <Typography>부담당자 3</Typography>
                <Box
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubContact3(false);
                    handleChange('contactNameSub3', '');
                    handleChange('contactPositionSub3', '');
                    handleChange('contactDepartmentSub3', '');
                    handleChange('contactMobileSub3', '');
                    handleChange('contactPhoneSub3', '');
                    handleChange('contactEmailSub3', '');
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: 'error.main',
                    padding: '4px',
                    marginRight: '8px',
                    '&:hover': { opacity: 0.7 },
                  }}
                >
                  <Delete fontSize="small" />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid xs={12} md={4}>
                  <TextField
                    label="담당자명"
                    fullWidth
                    value={formData.contactNameSub3 || ''}
                    onChange={(e) => handleChange('contactNameSub3', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="직책"
                    fullWidth
                    value={formData.contactPositionSub3 || ''}
                    onChange={(e) => handleChange('contactPositionSub3', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="부서"
                    fullWidth
                    value={formData.contactDepartmentSub3 || ''}
                    onChange={(e) => handleChange('contactDepartmentSub3', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="휴대전화"
                    fullWidth
                    value={formData.contactMobileSub3 || ''}
                    onChange={(e) => handleChange('contactMobileSub3', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="유선전화"
                    fullWidth
                    value={formData.contactPhoneSub3 || ''}
                    onChange={(e) => handleChange('contactPhoneSub3', e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    label="이메일"
                    fullWidth
                    type="email"
                    value={formData.contactEmailSub3 || ''}
                    onChange={(e) => handleChange('contactEmailSub3', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>

      {/* 점검 대상 제품 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            점검 대상 제품
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => setOpenTargetDialog(true)}
          >
            추가
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {inspectionTargets.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            등록된 점검 대상 제품이 없습니다.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>유형</TableCell>
                  <TableCell>제품명</TableCell>
                  <TableCell width={100} align="center">
                    작업
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inspectionTargets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell>{target.targetType}</TableCell>
                    <TableCell>{target.productName || '-'}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteInspectionTarget(target.id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 계약 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          계약 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>계약 상태</InputLabel>
              <Select
                value={formData.contractType || '미계약'}
                label="계약 상태"
                onChange={(e) => handleChange('contractType', e.target.value)}
              >
                <MenuItem value="미계약">미계약</MenuItem>
                <MenuItem value="유상">유상</MenuItem>
                <MenuItem value="무상">무상</MenuItem>
                <MenuItem value="만료">만료</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
              <DatePicker
                label="계약 시작일"
                value={formData.contractStartDate ? dayjs(formData.contractStartDate) : null}
                onChange={(newValue: Dayjs | null) => {
                  handleChange('contractStartDate', newValue ? newValue.format('YYYY-MM-DD') : '');
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: 'YYYY-MM-DD',
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
              <DatePicker
                label="계약 종료일"
                value={formData.contractEndDate ? dayjs(formData.contractEndDate) : null}
                onChange={(newValue: Dayjs | null) => {
                  handleChange('contractEndDate', newValue ? newValue.format('YYYY-MM-DD') : '');
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: 'YYYY-MM-DD',
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel shrink>하드웨어 포함</InputLabel>
              <Select
                value={formData.hardwareIncluded ?? true ? 'true' : 'false'}
                label="하드웨어 포함"
                notched
                onChange={(e) => handleChange('hardwareIncluded', e.target.value === 'true')}
              >
                <MenuItem value="true">포함</MenuItem>
                <MenuItem value="false">미포함</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 점검 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          점검 정보
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {['미계약', '만료'].includes(formData.contractType || '') ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            계약 상태가 '{formData.contractType}'인 경우 점검 정보를 설정할 수 없습니다.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>점검 주기</InputLabel>
                <Select
                  value={formData.inspectionCycleType || '매월'}
                  label="점검 주기"
                  onChange={(e) => handleChange('inspectionCycleType', e.target.value)}
                >
                  <MenuItem value="매월">매월</MenuItem>
                  <MenuItem value="분기">분기</MenuItem>
                  <MenuItem value="반기">반기</MenuItem>
                  <MenuItem value="연1회">연1회</MenuItem>
                  <MenuItem value="협력사진행">협력사진행</MenuItem>
                  <MenuItem value="무상기간">무상기간</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.inspectionCycleType === '분기' && (
              <Grid xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>점검 시작 월</InputLabel>
                  <Select
                    value={formData.inspectionCycleMonth || ''}
                    label="점검 시작 월"
                    onChange={(e) => handleChange('inspectionCycleMonth', Number(e.target.value))}
                  >
                    <MenuItem value={1}>1, 4, 7, 10월</MenuItem>
                    <MenuItem value={2}>2, 5, 8, 11월</MenuItem>
                    <MenuItem value={3}>3, 6, 9, 12월</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            {formData.inspectionCycleType === '반기' && (
              <Grid xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>점검 시작 월</InputLabel>
                  <Select
                    value={formData.inspectionCycleMonth || ''}
                    label="점검 시작 월"
                    onChange={(e) => handleChange('inspectionCycleMonth', Number(e.target.value))}
                  >
                    <MenuItem value={1}>1, 7월</MenuItem>
                    <MenuItem value={2}>2, 8월</MenuItem>
                    <MenuItem value={3}>3, 9월</MenuItem>
                    <MenuItem value={4}>4, 10월</MenuItem>
                    <MenuItem value={5}>5, 11월</MenuItem>
                    <MenuItem value={6}>6, 12월</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            {formData.inspectionCycleType === '연1회' && (
              <Grid xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>점검 월</InputLabel>
                  <Select
                    value={formData.inspectionCycleMonth || ''}
                    label="점검 월"
                    onChange={(e) => handleChange('inspectionCycleMonth', Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}월
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="최근 점검일 (자동 반영)"
                  value={formData.lastInspectionDate ? dayjs(formData.lastInspectionDate) : null}
                  disabled
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      placeholder: 'YYYY-MM-DD',
                      helperText: '점검서 업로드 시 자동으로 업데이트됩니다',
                    },
                  }}
                />
              </LocalizationProvider>
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
        <Grid container spacing={2}>
          <Grid xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="engineerId-label">담당 엔지니어</InputLabel>
              <Select
                labelId="engineerId-label"
                label="담당 엔지니어"
                  value={formData.engineerId != null ? String(formData.engineerId) : ''}
                  onChange={(e) =>
                    handleChange('engineerId', e.target.value === '' ? null : Number(e.target.value))
                  }
              >
                <MenuItem value="">
                  <em>선택 안 함</em>
                </MenuItem>
                {engineerOptions.map((engineer) => (
                  <MenuItem key={engineer.id} value={engineer.id}>
                    {engineer.name} {engineer.department ? `(${engineer.department})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="engineerSubId-label">부 엔지니어</InputLabel>
              <Select
                labelId="engineerSubId-label"
                label="부 엔지니어"
                  value={formData.engineerSubId != null ? String(formData.engineerSubId) : ''}
                  onChange={(e) =>
                    handleChange('engineerSubId', e.target.value === '' ? null : Number(e.target.value))
                  }
              >
                <MenuItem value="">
                  <em>선택 안 함</em>
                </MenuItem>
                {engineerOptions.map((engineer) => (
                  <MenuItem key={engineer.id} value={engineer.id}>
                    {engineer.name} {engineer.department ? `(${engineer.department})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="salesId-label">담당 영업</InputLabel>
              <Select
                labelId="salesId-label"
                label="담당 영업"
                  value={formData.salesId != null ? String(formData.salesId) : ''}
                  onChange={(e) =>
                    handleChange('salesId', e.target.value === '' ? null : Number(e.target.value))
                  }
              >
                <MenuItem value="">
                  <em>선택 안 함</em>
                </MenuItem>
                {salesOptions.map((sales) => (
                  <MenuItem key={sales.id} value={sales.id}>
                    {sales.name} {sales.department ? `(${sales.department})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 비고 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          비고
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="기타 참고 사항을 입력하세요"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
        />
      </Paper>

      {/* 고객사 삭제 - SUPER_ADMIN과 ADMIN만 표시 */}
      {user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff5f5', border: '1px solid #ffcccc' }}>
          <Typography variant="h6" fontWeight="bold" color="error" gutterBottom>
            위험 구역
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="body2" color="text.secondary" mb={2}>
            이 고객사를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForever />}
            onClick={() => setOpenDeleteDialog(true)}
          >
            고객사 삭제
          </Button>
        </Paper>
      )}

      {/* 점검 대상 추가 다이얼로그 */}
      <Dialog open={openTargetDialog} onClose={() => setOpenTargetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>점검 대상 제품 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <TextField
                label="유형"
                fullWidth
                required
                value={newTarget.targetType}
                onChange={(e) => setNewTarget({ ...newTarget, targetType: e.target.value })}
                placeholder="예: 망분리 솔루션"
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="제품명"
                fullWidth
                value={newTarget.productName}
                onChange={(e) => setNewTarget({ ...newTarget, productName: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTargetDialog(false)}>취소</Button>
          <Button onClick={handleAddInspectionTarget} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>고객사 삭제</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            삭제하려면 아래에 고객사명 <strong>"{customer.name}"</strong>을 정확히 입력하세요.
          </Typography>
          <TextField
            fullWidth
            label="고객사명 확인"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder={customer.name}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDeleteDialog(false);
            setDeleteConfirmName('');
          }}>
            취소
          </Button>
          <Button
            onClick={handleDeleteCustomer}
            color="error"
            variant="contained"
            disabled={deleteConfirmName !== customer.name}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerEditPage;
