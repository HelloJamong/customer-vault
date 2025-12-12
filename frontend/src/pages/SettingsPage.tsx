import { Box, Typography, Paper } from '@mui/material';

const SettingsPage = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        시스템 설정
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        시스템 전반적인 설정을 관리합니다
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          설정 기능은 곧 구현됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
