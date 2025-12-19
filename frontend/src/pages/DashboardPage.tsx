import { Box, Typography, CircularProgress, Button, Chip, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  Business,
  People,
  PeopleOutline,
  Shield,
  Memory,
  Storage,
  Computer,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import { customersAPI } from '@/api/customers.api';

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

type DashboardContentProps = {
  hideUserCounts?: boolean;
  hideSystemResources?: boolean;
};

const DashboardContent = ({ hideUserCounts = false, hideSystemResources = false }: DashboardContentProps) => {
  const { stats, isLoading, error } = useDashboard();

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <Typography variant="h6" color="error">
          대시보드 데이터를 불러오는데 실패했습니다.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
        </Typography>
      </Box>
    );
  }

  if (isLoading || !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const userStats = [
    {
      key: 'totalUsers',
      title: '전체 사용자 수',
      value: stats.totalUsers.toLocaleString(),
      icon: <People />,
      bgColor: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      key: 'adminUsers',
      title: '관리자 수',
      value: stats.adminUsers.toLocaleString(),
      icon: <Shield />,
      bgColor: '#ccfbf1',
      iconColor: '#14b8a6',
    },
    {
      key: 'regularUsers',
      title: '일반 사용자 수',
      value: stats.regularUsers.toLocaleString(),
      icon: <PeopleOutline />,
      bgColor: '#e0f2fe',
      iconColor: '#0ea5e9',
    },
    {
      key: 'totalCustomers',
      title: '고객사 수',
      value: stats.totalCustomers.toLocaleString(),
      icon: <Business />,
      bgColor: '#e0e7ff',
      iconColor: '#6366f1',
    },
  ];

  const filteredUserStats = userStats.filter((stat) => {
    if (hideUserCounts && (stat.key === 'totalUsers' || stat.key === 'adminUsers')) {
      return false;
    }
    return true;
  });

  const statColumns = Math.min(4, Math.max(1, filteredUserStats.length));

  return (
    <Box>
      {/* Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${statColumns}, 1fr)`,
          gap: 3,
        }}
      >
        {filteredUserStats.map((stat) => (
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

      {!hideSystemResources && (
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
      )}
    </Box>
  );
};

const SuperAdminDashboard = () => <DashboardContent />;

const AdminDashboard = () => <DashboardContent hideUserCounts hideSystemResources />;

// 일반 사용자용 대시보드
const UserDashboard = () => {
  const navigate = useNavigate();

  const {
    data: myCustomers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customers', 'my'],
    queryFn: customersAPI.getMyCustomers,
    staleTime: 10000,
    gcTime: 60000,
    refetchOnWindowFocus: false,
  });

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <Typography variant="h6" color="error">
          담당 고객사 정보를 불러오는데 실패했습니다.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
        </Typography>
      </Box>
    );
  }

  if (isLoading || !myCustomers) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // 점검 대상 고객사만 필터링 (대상아님 제외)
  const inspectionTargetCustomers = myCustomers.filter((customer) => customer.inspectionStatus !== '대상아님');
  const totalMyCustomers = inspectionTargetCustomers.length;
  const completedCount = inspectionTargetCustomers.filter((customer) => customer.inspectionStatus === '점검 완료').length;
  const incompleteCount = inspectionTargetCustomers.filter((customer) => customer.inspectionStatus === '미완료').length;
  const completionRate = totalMyCustomers > 0 ? Math.round((completedCount / totalMyCustomers) * 100) : 0;

  const inspectionStats = [
    {
      title: '점검 대상 고객사',
      value: totalMyCustomers.toLocaleString(),
      icon: <Business />,
      bgColor: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      title: '점검 완료',
      value: completedCount.toLocaleString(),
      icon: <Shield />,
      bgColor: '#dcfce7',
      iconColor: '#16a34a',
    },
    {
      title: '미완료 점검',
      value: incompleteCount.toLocaleString(),
      icon: <PeopleOutline />,
      bgColor: '#fee2e2',
      iconColor: '#ef4444',
    },
  ];

  const handleGoDetail = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  const handleGoDocuments = (customerId: number) => {
    navigate(`/customers/${customerId}/documents`);
  };

  const renderStatusChip = (status?: string) => {
    if (!status) return null;

    const color =
      status === '점검 완료'
        ? 'success'
        : status === '미완료'
          ? 'error'
          : 'default';

    return <Chip label={status} color={color} size="small" />;
  };

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
        {inspectionStats.map((stat) => (
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
            내 담당 고객사 점검 현황
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              mt: 0.5,
            }}
          >
            현재 담당 고객사 기준
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
                점검 완료
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  mt: 1,
                }}
              >
                {completedCount}{' '}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: '#64748b',
                  }}
                >
                  / {totalMyCustomers}
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
                {incompleteCount}{' '}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: '#64748b',
                  }}
                >
                  / {totalMyCustomers}
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
            담당 고객사 점검 완료율
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
                strokeDasharray={`${completionRate}, 100`}
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
                {completionRate}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* My Customers List */}
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
          담당 고객사 목록
        </Typography>
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#64748b',
            mt: 0.5,
          }}
        >
          세부정보 또는 점검서를 바로 확인하세요.
        </Typography>

        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {myCustomers.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed #cbd5e1',
                borderRadius: 2,
                p: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                bgcolor: '#f8fafc',
              }}
            >
              현재 담당 고객사가 없습니다.
            </Box>
          ) : (
            myCustomers.map((customer) => (
              <Box
                key={customer.id}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  bgcolor: '#f8fafc',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {customer.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                      }}
                    >
                      {customer.location || '지역 정보 없음'}
                    </Typography>
                  </Box>
                  {renderStatusChip(customer.inspectionStatus)}
                </Box>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => handleGoDetail(customer.id)}>
                    세부정보
                  </Button>
                  <Button variant="contained" size="small" onClick={() => handleGoDocuments(customer.id)}>
                    점검서 보기
                  </Button>
                </Stack>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
