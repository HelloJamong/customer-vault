import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supportLogsAPI } from '@/api/support-logs.api';
import { useAuthStore } from '@/store/authStore';

const NotificationBell = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 진행 중인 지원 현황 조회 (사용자별 캐시)
  const { data: notifications = [] } = useQuery({
    queryKey: ['pending-notifications', user?.id],
    queryFn: supportLogsAPI.getPendingNotifications,
    refetchInterval: 60000, // 1분마다 자동 갱신
    enabled: !!user, // 사용자 정보가 있을 때만 실행
  });

  // 총 알림 개수 (진행 중 + 진행 불가 + 보류)
  const totalCount = notifications.reduce(
    (sum, n) => sum + n.inProgressCount + n.impossibleCount + n.onHoldCount,
    0
  );

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (customerId: number) => {
    handleClose();
    navigate(`/customers/${customerId}/support-logs`);
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          color: '#64748b',
          '&:hover': {
            bgcolor: '#f8fafc',
          },
        }}
      >
        <Badge
          badgeContent={totalCount}
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              height: '18px',
              minWidth: '18px',
            },
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiPaper-root': {
            mt: 1.5,
            minWidth: 320,
            maxWidth: 400,
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0f172a',
            }}
          >
            진행 중인 지원 현황
          </Typography>
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#94a3b8',
              }}
            >
              현재 진행 중인 지원이 없습니다
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.customerId}
                onClick={() => handleNotificationClick(notification.customerId)}
                sx={{
                  px: 2,
                  py: 1.5,
                  fontSize: '0.875rem',
                  color: '#334155',
                  whiteSpace: 'normal',
                  '&:hover': {
                    bgcolor: '#f8fafc',
                  },
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#0f172a',
                      mb: 0.5,
                    }}
                  >
                    {notification.customerName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}
                  >
                    진행 중 {notification.inProgressCount} / 진행 불가 {notification.impossibleCount} / 보류 {notification.onHoldCount}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
