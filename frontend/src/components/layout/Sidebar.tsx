import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import {
  Dashboard,
  People,
  Business,
  AccountCircle,
  Settings,
  Logout,
  Description,
  AdminPanelSettings,
  SupervisorAccount,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // 디버깅: 현재 사용자 role 확인
  console.log('=== SIDEBAR DEBUG ===');
  console.log('Current user:', user);
  console.log('Current user role:', user?.role);
  console.log('UserRole.USER:', UserRole.USER);
  console.log('Role match:', user?.role === UserRole.USER);

  const menuItems = [
    { text: '대시보드', icon: <Dashboard />, path: '/dashboard', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER] },
    { text: '고객사 관리', icon: <Business />, path: '/customers', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { text: '슈퍼 관리자', icon: <SupervisorAccount />, path: '/super-admins', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { text: '일반 관리자', icon: <AdminPanelSettings />, path: '/admins', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { text: '일반 사용자', icon: <People />, path: '/users', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { text: '점검서 업로드', icon: <Description />, path: '/documents', roles: [UserRole.USER] },
    { text: '내 정보', icon: <AccountCircle />, path: '/profile', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER] },
    { text: '설정', icon: <Settings />, path: '/settings', roles: [UserRole.SUPER_ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    user?.role ? item.roles.includes(user.role as UserRole) : false
  );

  // 디버깅: 필터링된 메뉴 확인
  console.log('Filtered menu items:', filteredMenuItems.map(item => item.text));

  return (
    <>
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => logout({})}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="로그아웃" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );
};

export default Sidebar;
