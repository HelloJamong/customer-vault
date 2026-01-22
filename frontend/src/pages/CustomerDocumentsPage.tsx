import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack,
  Visibility,
  Search,
  Clear,
  Upload,
  Download,
  ArrowDropDown,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';
import { documentsAPI, type InspectionTarget } from '@/api/documents.api';

interface Document {
  id: number;
  title: string;
  filename: string;
  inspectionDate: string;
  inspectionType: string;
  inspectionTarget?: {
    productName: string;
  };
  uploader: {
    name: string;
  };
  uploadedAt: string;
}

interface Customer {
  id: number;
  name: string;
  contactName?: string;
  contactDepartment?: string;
  contactPhone?: string;
  inspectionCycleType?: string;
}

const CustomerDocumentsPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inspectionTargets, setInspectionTargets] = useState<InspectionTarget[]>([]);

  // 날짜 필터 상태
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  // 드롭다운 메뉴
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);

  // 점검서 양식 업로드 모달
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // 알림
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchDocuments = async (start?: string, end?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const url = `/documents/customer/${customerId}${params.toString() ? `?${params.toString()}` : ''}`;
      const docsResponse = await apiClient.get(url);
      setDocuments(docsResponse.data);
    } catch (error) {
      console.error('문서 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInspectionTargets = async () => {
    if (!customerId) return;
    try {
      const targets = await documentsAPI.getInspectionTargets(parseInt(customerId));
      setInspectionTargets(targets);
    } catch (error) {
      console.error('점검 항목 로드 실패:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [docsResponse, customerResponse] = await Promise.all([
          apiClient.get(`/documents/customer/${customerId}`),
          apiClient.get(`/customers/${customerId}`),
        ]);
        setDocuments(docsResponse.data);
        setCustomer(customerResponse.data);

        // 점검 항목 불러오기
        await fetchInspectionTargets();
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  const handleSearch = () => {
    if (startDate && endDate) {
      fetchDocuments(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    }
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    fetchDocuments();
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
    setSelectedTargetId(null);
    setUploadFile(null);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedTargetId(null);
    setUploadFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 확장자 검증
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.hwp', '.hwpx', '.ppt', '.pptx'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      setSnackbar({
        open: true,
        message: '허용된 파일 형식만 업로드 가능합니다. (pdf, doc, docx, hwp, hwpx, ppt, pptx)',
        severity: 'error',
      });
      event.target.value = '';
      return;
    }

    setUploadFile(file);
  };

  const checkExistingTemplate = async (targetId: number): Promise<boolean> => {
    try {
      // 해당 점검 항목에 이미 업로드된 양식이 있는지 확인
      const response = await apiClient.get(`/inspection-targets/${targetId}/template`);
      return response.data?.exists || false;
    } catch (error) {
      return false;
    }
  };

  const handleSubmitUpload = async () => {
    try {
      if (!selectedTargetId) {
        setSnackbar({
          open: true,
          message: '점검 항목을 선택해주세요.',
          severity: 'error',
        });
        return;
      }

      if (!uploadFile) {
        setSnackbar({
          open: true,
          message: '파일을 선택해주세요.',
          severity: 'error',
        });
        return;
      }

      // 기존 템플릿 존재 여부 확인
      const exists = await checkExistingTemplate(selectedTargetId);

      if (exists) {
        // 확인 다이얼로그 표시
        const confirmed = window.confirm('이미 업로드된 점검서 양식이 존재합니다. 변경하시겠습니까?');
        if (!confirmed) {
          return;
        }
      }

      // 선택된 점검 항목 찾기
      const selectedTarget = inspectionTargets.find(t => t.id === selectedTargetId);
      if (!selectedTarget) {
        throw new Error('점검 항목을 찾을 수 없습니다.');
      }

      // FormData 생성
      const formData = new FormData();
      formData.append('inspectionTargetId', selectedTargetId.toString());
      formData.append('customerName', customer?.name || '');
      formData.append('productName', selectedTarget.customName || selectedTarget.productName || '');
      formData.append('file', uploadFile);

      // 업로드 실행
      await apiClient.post('/inspection-targets/template/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSnackbar({
        open: true,
        message: '점검서 양식이 업로드되었습니다.',
        severity: 'success',
      });

      // 점검 항목 목록 새로고침
      await fetchInspectionTargets();

      handleCloseUploadDialog();
    } catch (error: any) {
      console.error('점검서 양식 업로드 실패:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '점검서 양식 업로드에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleDownloadTemplate = async (targetId: number) => {
    try {
      const response = await apiClient.get(`/inspection-targets/${targetId}/template/download`, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = '점검서_양식.pdf';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: '점검서 양식 다운로드를 시작합니다.',
        severity: 'success',
      });
    } catch (error) {
      console.error('점검서 양식 다운로드 실패:', error);
      setSnackbar({
        open: true,
        message: '점검서 양식 다운로드에 실패했습니다.',
        severity: 'error',
      });
    }
    setDownloadAnchorEl(null);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/customers')}
          >
            목록으로
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              점검서 보기
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {customer?.name}
            </Typography>
          </Box>
        </Box>

        {/* 2개 버튼 */}
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={handleOpenUploadDialog}
          >
            점검서 양식 업로드
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            endIcon={<ArrowDropDown />}
            onClick={(e) => setDownloadAnchorEl(e.currentTarget)}
            disabled={inspectionTargets.filter(t => t.templatePath).length === 0}
          >
            점검서 다운로드
          </Button>
          <Menu
            anchorEl={downloadAnchorEl}
            open={Boolean(downloadAnchorEl)}
            onClose={() => setDownloadAnchorEl(null)}
          >
            {inspectionTargets
              .filter((target) => target.templatePath)
              .map((target) => (
                <MenuItem
                  key={target.id}
                  onClick={() => handleDownloadTemplate(target.id)}
                >
                  {target.customName || target.productName} - 점검서 양식
                </MenuItem>
              ))}
          </Menu>
        </Box>
      </Box>

      {/* 날짜 필터 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          기간별 검색
        </Typography>
        <Box
          display="flex"
          gap={2}
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-end' }}
        >
          <Box flex={1}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
              <DatePicker
                label="시작 날짜"
                value={startDate}
                onChange={(newValue: Dayjs | null) => setStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box flex={1}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
              <DatePicker
                label="종료 날짜"
                value={endDate}
                onChange={(newValue: Dayjs | null) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box display="flex" gap={1} flex={1}>
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleSearch}
              disabled={!startDate || !endDate}
              fullWidth
            >
              검색
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClear}
              fullWidth
            >
              초기화
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : documents.length === 0 ? (
          <Box textAlign="center" py={5}>
            <Typography variant="body1" color="text.secondary">
              업로드된 점검서가 없습니다.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>파일명</TableCell>
                  <TableCell>점검달</TableCell>
                  <TableCell>점검자</TableCell>
                  <TableCell>점검제품</TableCell>
                  <TableCell>점검방식</TableCell>
                  <TableCell align="center">PDF 보기</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} hover>
                    <TableCell>{doc.filename}</TableCell>
                    <TableCell>
                      {new Date(doc.inspectionDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </TableCell>
                    <TableCell>{doc.uploader.name}</TableCell>
                    <TableCell>{doc.inspectionTarget?.productName || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={doc.inspectionType}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/documents/${doc.id}/view`)}
                      >
                        보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 점검서 양식 업로드 모달 */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>점검서 양식 업로드</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>점검 항목</InputLabel>
              <Select
                value={selectedTargetId || ''}
                label="점검 항목"
                onChange={(e) => setSelectedTargetId(Number(e.target.value))}
              >
                {inspectionTargets.map((target) => (
                  <MenuItem key={target.id} value={target.id}>
                    {target.customName || target.productName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<Upload />}
            >
              파일 선택 (pdf, doc, docx, hwp, hwpx, ppt, pptx)
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx"
                onChange={handleFileChange}
              />
            </Button>

            {uploadFile && (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                선택된 파일: {uploadFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>취소</Button>
          <Button variant="contained" onClick={handleSubmitUpload}>
            업로드
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerDocumentsPage;
