import { Box, Typography, Button, Container } from '@mui/material';
import { Block } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Block sx={{ fontSize: 100, color: 'error.main', mb: 2 }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          403
        </Typography>
        <Typography variant="h5" color="text.secondary" mb={4}>
          접근 권한이 없습니다
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          해당 페이지에 접근할 권한이 없습니다. 관리자에게 문의하세요.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          대시보드로 돌아가기
        </Button>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;
