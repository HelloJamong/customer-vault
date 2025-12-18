import { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { ArrowBack, Delete } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { documentsAPI } from '@/api/documents.api';
import { useAuthStore } from '@/store/authStore';

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
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: () => documentsAPI.deleteDocument(Number(documentId)),
    onSuccess: () => {
      // 삭제 성공 시 점검서 목록으로 이동
      if (document?.customer.id) {
        navigate(`/customers/${document.customer.id}/documents`, {
          state: { message: '점검서가 삭제되었습니다.' },
        });
      } else {
        navigate(-1);
      }
    },
    onError: (error: any) => {
      console.error('점검서 삭제 실패:', error);
      setError(error.response?.data?.message || '점검서 삭제에 실패했습니다.');
      setDeleteDialogOpen(false);
    },
  });

  useEffect(() => {
    const fetchDocumentAndPdf = async () => {
      try {
        setIsLoading(true);

        // 1. 문서 정보 가져오기
        const docResponse = await apiClient.get(`/documents/${documentId}`);
        setDocument(docResponse.data);

        // 2. PDF 파일 가져오기 (Blob으로)
        const pdfResponse = await apiClient.get(`/documents/${documentId}/view`, {
          responseType: 'blob',
        });

        // 3. Blob URL 생성
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        console.log('[DocumentViewerPage] PDF loaded successfully');
      } catch (error) {
        console.error('문서 로드 실패:', error);
        setError('문서를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocumentAndPdf();
    }

    // Cleanup: Blob URL 해제
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId]);

  console.log('[DocumentViewerPage] PDF URL:', pdfUrl);
  console.log('[DocumentViewerPage] Document:', document);

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

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

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

        {/* 관리자만 삭제 버튼 표시 */}
        {isAdmin && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteClick}
            disabled={deleteMutation.isPending}
          >
            삭제
          </Button>
        )}
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

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          점검서 삭제
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            정말로 이 점검서를 삭제하시겠습니까?
            <br />
            <strong>{document.filename}</strong>
            <br />
            <br />
            이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            autoFocus
          >
            {deleteMutation.isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentViewerPage;
