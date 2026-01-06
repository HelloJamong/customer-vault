import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '@/api/customers.api';
import { documentsAPI } from '@/api/documents.api';
import type { Customer } from '@/types/customer.types';
import type { InspectionTarget, UploadInspectionDocumentDto } from '@/api/documents.api';
import { useAuthStore } from '@/store/authStore';

dayjs.locale('ko');

const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // 사용자 계정이 아니면 접근 불가 메시지 표시
  if (user?.role !== 'user') {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          점검서 업로드
        </Typography>
        <Alert severity="info">이 페이지는 사용자 계정만 접근할 수 있습니다.</Alert>
      </Box>
    );
  }

  const [formData, setFormData] = useState({
    customerId: '',
    inspectionTargetId: '',
    inspectionType: '',
  });
  const [inspectionDate, setInspectionDate] = useState<Dayjs>(dayjs());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 담당 고객사 목록 조회
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['myCustomers'],
    queryFn: customersAPI.getMyCustomers,
  });

  // 선택된 고객사의 점검 대상 조회
  const { data: inspectionTargets = [], isLoading: isLoadingTargets } = useQuery<InspectionTarget[]>({
    queryKey: ['inspectionTargets', formData.customerId],
    queryFn: () => documentsAPI.getInspectionTargets(parseInt(formData.customerId)),
    enabled: !!formData.customerId,
  });

  // 고객사 변경 시 점검 대상 초기화
  useEffect(() => {
    setFormData((prev) => ({ ...prev, inspectionTargetId: '' }));
  }, [formData.customerId]);

  // 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: (dto: UploadInspectionDocumentDto) => documentsAPI.uploadInspectionDocument(dto),
    onSuccess: (data) => {
      setSuccess(data.message || '점검서가 업로드되었습니다.');
      setError('');
      // 고객사 목록 및 대시보드 갱신 (점검 상태 업데이트 반영)
      queryClient.invalidateQueries({ queryKey: ['customers'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['myCustomers'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
      // 폼 초기화
      setFormData({
        customerId: '',
        inspectionTargetId: '',
        inspectionType: '',
      });
      setInspectionDate(dayjs());
      setSelectedFile(null);
      // 파일 입력 초기화
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || '업로드에 실패했습니다.');
      setSuccess('');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 유효성 검사
    if (!formData.customerId) {
      setError('고객사를 선택해주세요.');
      return;
    }
    if (!formData.inspectionTargetId) {
      setError('점검 대상을 선택해주세요.');
      return;
    }
    if (!formData.inspectionType) {
      setError('점검 방식을 선택해주세요.');
      return;
    }
    if (!selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }

    uploadMutation.mutate({
      customerId: parseInt(formData.customerId),
      inspectionTargetId: parseInt(formData.inspectionTargetId),
      inspectionDate: inspectionDate.format('YYYY-MM-DD'),
      inspectionType: formData.inspectionType,
      file: selectedFile,
    });
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        점검서 업로드
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        담당 고객사의 점검서를 업로드합니다
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
          <Box component="form" onSubmit={handleSubmit}>
          {/* 고객사 선택 */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel>고객사</InputLabel>
            <Select
              value={formData.customerId}
              label="고객사"
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              disabled={isLoadingCustomers}
            >
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 점검 대상 선택 */}
          <FormControl fullWidth margin="normal" required disabled={!formData.customerId}>
            <InputLabel>점검 대상</InputLabel>
            <Select
              value={formData.inspectionTargetId}
              label="점검 대상"
              onChange={(e) => setFormData({ ...formData, inspectionTargetId: e.target.value })}
              disabled={isLoadingTargets || !formData.customerId}
            >
              {inspectionTargets.length === 0 && formData.customerId && !isLoadingTargets ? (
                <MenuItem disabled value="">
                  점검 대상이 없습니다. 고객사 상세 페이지에서 추가해주세요.
                </MenuItem>
              ) : (
                inspectionTargets.map((target) => (
                  <MenuItem key={target.id} value={target.id}>
                    {target.productName || target.customName || target.targetType}
                    {target.productName && ` (${target.targetType})`}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* 점검 방식 선택 */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel>점검 방식</InputLabel>
            <Select
              value={formData.inspectionType}
              label="점검 방식"
              onChange={(e) => setFormData({ ...formData, inspectionType: e.target.value })}
            >
              <MenuItem value="방문">방문 점검</MenuItem>
              <MenuItem value="원격">원격 점검</MenuItem>
            </Select>
          </FormControl>

          {/* 점검일 */}
          <Box sx={{ mt: 2, mb: 1 }}>
            <DatePicker
              label="점검일"
              value={inspectionDate}
              onChange={(newValue) => {
                if (newValue) {
                  setInspectionDate(newValue);
                }
              }}
              format="YYYY-MM-DD"
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  helperText: '누락된 점검서를 업로드할 경우 실제 점검일을 선택해주세요',
                },
              }}
            />
          </Box>

          {/* 파일 선택 (PDF만) */}
          <Box mt={2}>
            <Button variant="outlined" component="label" fullWidth>
              PDF 파일 선택
              <input
                id="file-upload"
                type="file"
                hidden
                onChange={handleFileChange}
                accept=".pdf"
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                선택된 파일: {selectedFile.name}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              * PDF 파일만 업로드 가능합니다
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              * 파일명은 자동으로 "고객사명_제품명_N월_정기점검보고서.pdf" 형식으로 저장됩니다
            </Typography>
          </Box>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            startIcon={uploadMutation.isPending ? <CircularProgress size={20} /> : <UploadIcon />}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? '업로드 중...' : '업로드'}
          </Button>
          </Box>
        </LocalizationProvider>
      </Paper>
    </Box>
  );
};

export default DocumentsPage;
