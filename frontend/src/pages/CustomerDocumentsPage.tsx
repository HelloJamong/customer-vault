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
import { ArrowBack, Visibility } from '@mui/icons-material';
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
