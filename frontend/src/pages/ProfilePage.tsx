import { Box, Typography, Paper, Avatar, Chip } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/constants';
import dayjs from 'dayjs';

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        내 정보
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        내 계정 정보를 확인합니다
      </Typography>

      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={3} mb={4}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              fontSize: 32,
            }}
          >
            {user.username[0].toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user.username}
            </Typography>
            <Chip
              label={ROLE_LABELS[user.role] || user.role}
              color="primary"
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              이메일
            </Typography>
            <Typography variant="body1">
              {user.email || '등록된 이메일이 없습니다'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              계정 상태
            </Typography>
            <Typography variant="body1">
              {user.is_active ? '활성' : '비활성'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              가입일
            </Typography>
            <Typography variant="body1">
              {dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              최종 수정일
            </Typography>
            <Typography variant="body1">
              {dayjs(user.updated_at).format('YYYY-MM-DD HH:mm')}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProfilePage;
