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
} from '@mui/material';
import { ArrowBack, Visibility, Search, Clear } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';

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
}

const CustomerDocumentsPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // 날짜 필터 상태
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

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

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/customers')}
        >
          고객사 관리
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
                        month: 'long'
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
    </Box>
  );
};

export default CustomerDocumentsPage;
