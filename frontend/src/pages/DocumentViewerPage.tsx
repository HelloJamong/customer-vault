import { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/api/axios';

interface Document {
  id: number;
  filename: string;
  customer: {
    id: number;
    name: string;
  };
}

const DocumentViewerPage = () => {
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [document, setDocument] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/documents/${documentId}`);
        setDocument(response.data);
      } catch (error) {
        console.error('문서 정보 로드 실패:', error);
        setError('문서를 찾을 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const pdfUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/documents/${documentId}/view`;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !document) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
          >
            돌아가기
          </Button>
        </Box>
        <Alert severity="error">{error || '문서를 찾을 수 없습니다.'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/customers/${document.customer.id}/documents`)}
          >
            점검서 목록
          </Button>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {document.filename}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {document.customer.name}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'hidden',
          minHeight: '80vh',
        }}
      >
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          style={{ border: 'none', minHeight: '80vh' }}
          title={document.filename}
        />
      </Box>
    </Box>
  );
};

export default DocumentViewerPage;
