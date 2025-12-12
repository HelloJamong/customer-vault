import { Box, Typography, CircularProgress } from '@mui/material';
import {
  Business,
  People,
  PeopleOutline,
  Shield,
  Memory,
  Storage,
  Computer,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useDashboard';

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  const getDashboardContent = () => {
    const role = user?.role?.toLowerCase();

    if (role === 'super_admin') {
      return <SuperAdminDashboard />;
    } else if (role === 'admin') {
      return <AdminDashboard />;
    } else if (role === 'user') {
      return <UserDashboard />;
    }

    return null;
  };

  return <Box>{getDashboardContent()}</Box>;
};

// 슈퍼관리자용 대시보드
const SuperAdminDashboard = () => {
  const { stats, isLoading } = useDashboard();

  if (isLoading || !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const userStats = [
    {
      title: '전체 사용자 수',
      value: stats.totalUsers.toLocaleString(),
      icon: <People />,
      bgColor: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      title: '관리자 수',
      value: stats.adminUsers.toLocaleString(),
      icon: <Shield />,
      bgColor: '#ccfbf1',
      iconColor: '#14b8a6',
    },
    {
      title: '일반 사용자 수',
      value: stats.regularUsers.toLocaleString(),
      icon: <PeopleOutline />,
      bgColor: '#e0f2fe',
      iconColor: '#0ea5e9',
    },
    {
      title: '고객사 수',
      value: stats.totalCustomers.toLocaleString(),
      icon: <Business />,
      bgColor: '#e0e7ff',
      iconColor: '#6366f1',
    },
  ];

  return (
    <Box>
      {/* Stat Cards - 4 column grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 3,
        }}
      >
        {userStats.map((stat) => (
          <Box
            key={stat.title}
            sx={{
              bgcolor: 'white',
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                {stat.title}
              </Typography>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: stat.bgColor,
                  borderRadius: 2,
                  '& svg': {
                    color: stat.iconColor,
                  },
                }}
              >
                {stat.icon}
              </Box>
            </Box>
            <Typography
              sx={{
                fontSize: '2.25rem',
                fontWeight: 700,
                color: '#1e293b',
                mt: 1.5,
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Inspection Status Section - 2+1 column layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 3,
          mt: 3,
        }}
      >
        {/* Inspection Details - 2 columns */}
        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <Typography
            sx={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            이번달 점검 고객사
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              mt: 0.5,
            }}
          >
            {stats.inspection.currentMonth} 기준
          </Typography>
          <Box
            sx={{
              mt: 3,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 3,
            }}
          >
            <Box
              sx={{
                bgcolor: '#f8fafc',
                p: 2.5,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                완료
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  mt: 1,
                }}
              >
                {stats.inspection.completed}{' '}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: '#64748b',
                  }}
                >
                  / {stats.inspection.totalCustomers}
                </Typography>
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: '#f8fafc',
                p: 2.5,
                borderRadius: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                미완료
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  mt: 1,
                }}
              >
                {stats.inspection.incomplete}{' '}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: '#64748b',
                  }}
                >
                  / {stats.inspection.totalCustomers}
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Completion Rate - 1 column */}
        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b',
              textAlign: 'center',
            }}
          >
            이번달 점검 완료율
          </Typography>
          <Box
            sx={{
              position: 'relative',
              width: 160,
              height: 160,
              mt: 2,
            }}
          >
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeDasharray={`${stats.inspection.completionRate}, 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                {stats.inspection.completionRate}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* System Resources Section */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 3,
          mt: 3,
        }}
      >
        {/* Storage Status */}
        <Box
          sx={{
            bgcolor: 'white',
            p: 4,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <Storage sx={{ color: '#64748b', fontSize: '1.25rem' }} />
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              운영서버 스토리지 용량
            </Typography>
          </Box>
          <Box>
            <Box
              sx={{
                width: '100%',
                height: 16,
                bgcolor: '#e2e8f0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${stats.systemResources.storage.usagePercent}%`,
                  height: '100%',
                  bgcolor: stats.systemResources.storage.usagePercent > 80 ? '#ef4444' : '#2563eb',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 1.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                사용량 / 전체용량:{' '}
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                  }}
                >
                  {stats.systemResources.storage.used}{stats.systemResources.storage.unit} / {stats.systemResources.storage.total}{stats.systemResources.storage.unit}
                </Typography>
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                여유용량:{' '}
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: '#14b8a6',
                  }}
                >
                  {(stats.systemResources.storage.total - stats.systemResources.storage.used).toFixed(2)}{stats.systemResources.storage.unit}
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Memory Usage */}
        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Memory sx={{ color: '#64748b', fontSize: '1.25rem' }} />
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1e293b',
                textAlign: 'center',
              }}
            >
              메모리 점유율
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'relative',
              width: 140,
              height: 140,
            }}
          >
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={stats.systemResources.memory.usagePercent > 80 ? '#ef4444' : '#8b5cf6'}
                strokeWidth="3"
                strokeDasharray={`${stats.systemResources.memory.usagePercent}, 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                {stats.systemResources.memory.usagePercent}%
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  mt: 0.5,
                }}
              >
                {stats.systemResources.memory.used}{stats.systemResources.memory.unit} / {stats.systemResources.memory.total}{stats.systemResources.memory.unit}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* CPU Usage */}
        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Computer sx={{ color: '#64748b', fontSize: '1.25rem' }} />
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1e293b',
                textAlign: 'center',
              }}
            >
              CPU 점유율
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'relative',
              width: 140,
              height: 140,
            }}
          >
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={stats.systemResources.cpu.usagePercent > 80 ? '#ef4444' : '#10b981'}
                strokeWidth="3"
                strokeDasharray={`${stats.systemResources.cpu.usagePercent}, 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                {stats.systemResources.cpu.usagePercent}%
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  mt: 0.5,
                }}
              >
                {stats.systemResources.cpu.cores} Cores
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// 관리자용 대시보드
const AdminDashboard = () => {
  const { stats, isLoading } = useDashboard();

  if (isLoading || !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const adminStats = [
    {
      title: '담당 고객사',
      value: stats.totalCustomers.toLocaleString(),
      icon: <Business />,
      bgColor: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      title: '이번 달 점검',
      value: stats.inspection.completed.toLocaleString(),
      icon: <Shield />,
      bgColor: '#fed7aa',
      iconColor: '#f59e0b',
    },
    {
      title: '미완료 점검',
      value: stats.inspection.incomplete.toLocaleString(),
      icon: <PeopleOutline />,
      bgColor: '#e0e7ff',
      iconColor: '#6366f1',
    },
  ];

  return (
    <Box>
      {/* Stat Cards - 3 column grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3,
        }}
      >
        {adminStats.map((stat) => (
          <Box
            key={stat.title}
            sx={{
              bgcolor: 'white',
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                {stat.title}
              </Typography>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: stat.bgColor,
                  borderRadius: 2,
                  '& svg': {
                    color: stat.iconColor,
                  },
                }}
              >
                {stat.icon}
              </Box>
            </Box>
            <Typography
              sx={{
                fontSize: '2.25rem',
                fontWeight: 700,
                color: '#1e293b',
                mt: 1.5,
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Upcoming Schedule */}
      <Box
        sx={{
          mt: 3,
          bgcolor: 'white',
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        }}
      >
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          다가오는 점검 일정
        </Typography>
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#64748b',
            mt: 1,
          }}
        >
          예정된 점검 일정이 여기에 표시됩니다.
        </Typography>
      </Box>
    </Box>
  );
};

// 일반 사용자용 대시보드
const UserDashboard = () => {
  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 3,
          mb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <Typography
            sx={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            내 고객사
          </Typography>
          <Typography
            sx={{
              fontSize: '1.875rem',
              fontWeight: 700,
              color: '#2563eb',
              mt: 1,
            }}
          >
            5
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              mt: 0.5,
            }}
          >
            담당 고객사 수
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <Typography
            sx={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            업로드한 문서
          </Typography>
          <Typography
            sx={{
              fontSize: '1.875rem',
              fontWeight: 700,
              color: '#c026d3',
              mt: 1,
            }}
          >
            23
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              mt: 0.5,
            }}
          >
            전체 문서 수
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: 'white',
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        }}
      >
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          내 고객사 목록
        </Typography>
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#64748b',
            mt: 1,
          }}
        >
          담당 고객사 목록이 여기에 표시됩니다.
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardPage;
