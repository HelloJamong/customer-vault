import { Box, Typography, Paper } from '@mui/material';

const UsersPage = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        사용자 관리
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        시스템 사용자를 관리합니다
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          사용자 관리 기능은 곧 구현됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

export default UsersPage;
