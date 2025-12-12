import { Box, Typography, Paper, Card, CardContent } from '@mui/material';
import { Business, People, Description, CheckCircle } from '@mui/icons-material';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth.types';

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  const getDashboardContent = () => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        return <SuperAdminDashboard />;
      case UserRole.ADMIN:
        return <AdminDashboard />;
      case UserRole.USER:
        return <UserDashboard />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        대시보드
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {user?.username}님, 환영합니다!
      </Typography>
      {getDashboardContent()}
    </Box>
  );
};

// 슈퍼관리자용 대시보드
const SuperAdminDashboard = () => {
  const stats = [
    { title: '전체 고객사', value: '142', icon: <Business />, color: '#1976d2' },
    { title: '활성 사용자', value: '28', icon: <People />, color: '#2e7d32' },
    { title: '이번 달 점검', value: '15', icon: <CheckCircle />, color: '#ed6c02' },
    { title: '전체 문서', value: '1,234', icon: <Description />, color: '#9c27b0' },
  ];

  return (
    <Box>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={3} mb={3}>
        {stats.map((stat) => (
          <Card key={stat.title} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: stat.color,
                    color: 'white',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          최근 활동
        </Typography>
        <Typography variant="body2" color="text.secondary">
          최근 활동 내역이 여기에 표시됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

// 관리자용 대시보드
const AdminDashboard = () => {
  const stats = [
    { title: '담당 고객사', value: '25', icon: <Business />, color: '#1976d2' },
    { title: '이번 달 점검', value: '8', icon: <CheckCircle />, color: '#ed6c02' },
    { title: '대기 중인 문서', value: '3', icon: <Description />, color: '#9c27b0' },
  ];

  return (
    <Box>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={3} mb={3}>
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: stat.color,
                    color: 'white',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          다가오는 점검 일정
        </Typography>
        <Typography variant="body2" color="text.secondary">
          예정된 점검 일정이 여기에 표시됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

// 일반 사용자용 대시보드
const UserDashboard = () => {
  return (
    <Box>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              내 고객사
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary">
              5
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              담당 고객사 수
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              업로드한 문서
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="secondary">
              23
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              전체 문서 수
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          내 고객사 목록
        </Typography>
        <Typography variant="body2" color="text.secondary">
          담당 고객사 목록이 여기에 표시됩니다.
        </Typography>
      </Paper>
    </Box>
  );
};

export default DashboardPage;
