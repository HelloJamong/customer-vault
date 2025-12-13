import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

const CustomerDocumentsPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();

  // TODO: 실제 API 연동 필요
  const isLoading = false;
  const documents: any[] = [];

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
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
            고객사 ID: {customerId}
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
          <Box>
            {/* TODO: 점검서 목록 표시 */}
            <Typography>점검서 목록 (구현 예정)</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerDocumentsPage;
