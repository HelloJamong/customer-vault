import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Add, MoreVert } from '@mui/icons-material';
import apiClient from '@/api/axios';
import { useAuthStore } from '@/store/authStore';

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  description?: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

const SuperAdminsPage = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await apiClient.get('/users?role=super_admin');
      setUsers(data);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
      alert('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDialog = () => {
    setSelectedUser(null); // 생성 모드를 위해 선택된 사용자 초기화
    setFormData({ username: '', name: '', description: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({ username: '', name: '', description: '' });
  };

  const handleEdit = () => {
    if (selectedUser) {
      setFormData({
        username: selectedUser.username,
        name: selectedUser.name,
        description: selectedUser.description || '',
      });
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const handleCreate = async () => {
    if (!formData.username.trim() || !formData.name.trim()) {
      alert('계정과 이름은 필수입니다.');
      return;
    }

    try {
      const response = await apiClient.post('/users', {
        username: formData.username,
        name: formData.name,
        description: formData.description || null,
        role: 'super_admin',
      });

      alert(`${response.data.message}\n초기 패스워드: ${response.data.defaultPassword}`);
      handleCloseDialog();
      fetchUsers();
    } catch (error: any) {
      console.error('사용자 생성 실패:', error);
      const errorMessage = error.response?.data?.message || '사용자 생성에 실패했습니다.';
      alert(errorMessage);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser || !formData.name.trim()) {
      alert('이름은 필수입니다.');
      return;
    }

    try {
      await apiClient.patch(`/users/${selectedUser.id}`, {
        name: formData.name,
        description: formData.description || null,
      });

      alert('사용자 정보가 수정되었습니다.');
      handleCloseDialog();
      fetchUsers();
    } catch (error: any) {
      console.error('사용자 수정 실패:', error);
      alert('사용자 수정에 실패했습니다.');
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;

    try {
      const response = await apiClient.patch(`/users/${selectedUser.id}/toggle-active`);
      alert(response.data.message);
      fetchUsers();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
    handleMenuClose();
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!confirm('비밀번호를 초기화하시겠습니까?')) {
      handleMenuClose();
      return;
    }

    try {
      const response = await apiClient.post(`/users/${selectedUser.id}/reset-password`);
      setDefaultPassword(response.data.defaultPassword);
      setOpenPasswordDialog(true);
      fetchUsers();
    } catch (error) {
      console.error('비밀번호 초기화 실패:', error);
      alert('비밀번호 초기화에 실패했습니다.');
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    if (!confirm(`${selectedUser.name} 사용자를 삭제하시겠습니까?`)) {
      handleMenuClose();
      return;
    }

    try {
      await apiClient.delete(`/users/${selectedUser.id}`);
      alert('사용자가 삭제되었습니다.');
      fetchUsers();
    } catch (error: any) {
      console.error('사용자 삭제 실패:', error);
      const errorMessage = error.response?.data?.message || '사용자 삭제에 실패했습니다.';
      alert(errorMessage);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '정상':
        return 'success';
      case '비활성':
        return 'default';
      case '잠김':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            슈퍼 관리자
          </Typography>
          <Typography variant="body2" color="text.secondary">
            슈퍼 관리자를 관리합니다 (최대 3명)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
          disabled={users.length >= 3}
        >
          슈퍼 관리자 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>계정</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>설명</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell>마지막 로그인</TableCell>
              <TableCell align="right">관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.description || '-'}</TableCell>
                <TableCell>
                  <Chip label={user.status} color={getStatusColor(user.status)} size="small" />
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => handleMenuOpen(e, user)}>
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  등록된 슈퍼 관리자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 액션 메뉴 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>수정</MenuItem>
        <MenuItem
          onClick={handleToggleActive}
          disabled={selectedUser?.id === currentUser?.id && selectedUser?.isActive}
        >
          {selectedUser?.isActive ? '비활성화' : '활성화'}
          {selectedUser?.id === currentUser?.id && selectedUser?.isActive && ' (본인)'}
        </MenuItem>
        <MenuItem onClick={handleResetPassword}>패스워드 초기화</MenuItem>
        <MenuItem
          onClick={handleDelete}
          disabled={selectedUser?.id === currentUser?.id}
          sx={{ color: 'error.main' }}
        >
          삭제 {selectedUser?.id === currentUser?.id && '(본인)'}
        </MenuItem>
      </Menu>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? '슈퍼 관리자 수정' : '슈퍼 관리자 추가'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="계정"
            fullWidth
            margin="normal"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={!!selectedUser}
            required
          />
          <TextField
            label="이름"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            label="설명"
            fullWidth
            margin="normal"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button
            variant="contained"
            onClick={selectedUser ? handleUpdate : handleCreate}
          >
            {selectedUser ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 패스워드 표시 다이얼로그 */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>패스워드 초기화 완료</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            비밀번호가 초기화되었습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            새 패스워드: <strong>{defaultPassword}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            최초 로그인 시 비밀번호 변경이 필요합니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>확인</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminsPage;
