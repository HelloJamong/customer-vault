import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '@/api/customers.api';
import { documentsAPI } from '@/api/documents.api';
import type { Customer } from '@/types/customer.types';
import type { InspectionTarget, UploadInspectionDocumentDto } from '@/api/documents.api';
import { useAuthStore } from '@/store/authStore';

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
    inspectionDate: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
  });
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
      // 폼 초기화
      setFormData({
        customerId: '',
        inspectionTargetId: '',
        inspectionType: '',
        inspectionDate: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
      });
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
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }

    uploadMutation.mutate({
      customerId: parseInt(formData.customerId),
      inspectionTargetId: parseInt(formData.inspectionTargetId),
      title: formData.title,
      description: formData.description,
      inspectionDate: formData.inspectionDate,
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
              {inspectionTargets.map((target) => (
                <MenuItem key={target.id} value={target.id}>
                  {target.productName || target.customName || target.targetType}
                  {target.productName && ` (${target.targetType})`}
                </MenuItem>
              ))}
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
          <TextField
            fullWidth
            margin="normal"
            label="점검일"
            type="date"
            required
            value={formData.inspectionDate}
            onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          {/* 제목 */}
          <TextField
            fullWidth
            margin="normal"
            label="제목"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="예: 2025년 1월 점검"
          />

          {/* 설명 */}
          <TextField
            fullWidth
            margin="normal"
            label="설명"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="점검 내용에 대한 간단한 설명을 입력하세요"
          />

          {/* 파일 선택 */}
          <Box mt={2}>
            <Button variant="outlined" component="label" fullWidth>
              파일 선택
              <input
                id="file-upload"
                type="file"
                hidden
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp"
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                선택된 파일: {selectedFile.name}
              </Typography>
            )}
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
      </Paper>
    </Box>
  );
};

export default DocumentsPage;
