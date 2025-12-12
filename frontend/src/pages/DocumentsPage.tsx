import { Box, Typography, Paper } from '@mui/material';

const DocumentsPage = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        문서 관리
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        점검 문서를 업로드하고 관리합니다
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          문서 관리 기능은 곧 구현됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

export default DocumentsPage;
