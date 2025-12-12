import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import {
  Dashboard,
  People,
  Business,
  AccountCircle,
  Settings,
  Logout,
  Description,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { text: '대시보드', icon: <Dashboard />, path: '/dashboard', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER] },
    { text: '고객사 관리', icon: <Business />, path: '/customers', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { text: '사용자 관리', icon: <People />, path: '/users', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { text: '문서 관리', icon: <Description />, path: '/documents', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER] },
    { text: '내 정보', icon: <AccountCircle />, path: '/profile', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER] },
    { text: '설정', icon: <Settings />, path: '/settings', roles: [UserRole.SUPER_ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  );

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
          <ListItemButton onClick={() => logout()}>
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
