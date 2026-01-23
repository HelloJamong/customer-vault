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
  CircularProgress,
} from '@mui/material';
import { Add, MoreVert } from '@mui/icons-material';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { noticesApi, type Notice } from '@/api/notices.api';
import { useAuthStore } from '@/store/authStore';

const NoticesPage = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 다이얼로그 상태
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({ title: '', content: '' });

  // 권한 확인
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // React Quill 모듈 설정
  const quillModules = {
    toolbar: [['bold', 'underline']],
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const data = await noticesApi.getAll();
      setNotices(data);
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
      alert('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 메뉴 핸들러
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notice: Notice) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotice(notice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 작성 다이얼로그
  const handleOpenCreateDialog = () => {
    setFormData({ title: '', content: '' });
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setFormData({ title: '', content: '' });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }
    if (!formData.content.trim()) {
      alert('내용을 입력하세요.');
      return;
    }

    try {
      await noticesApi.create(formData);
      alert('공지사항이 작성되었습니다.');
      handleCloseCreateDialog();
      fetchNotices();
    } catch (error) {
      console.error('공지사항 작성 실패:', error);
      alert('공지사항 작성에 실패했습니다.');
    }
  };

  // 상세보기 다이얼로그
  const handleViewNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    // selectedNotice는 여기서 null로 설정하지 않음 (수정/삭제 버튼에서 사용)
  };

  // 수정 다이얼로그
  const handleOpenEditDialog = () => {
    if (selectedNotice) {
      setFormData({
        title: selectedNotice.title,
        content: selectedNotice.content,
      });
      handleMenuClose();
      setEditDialogOpen(true);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setFormData({ title: '', content: '' });
    setSelectedNotice(null);
  };

  const handleUpdate = async () => {
    if (!selectedNotice) return;

    if (!formData.title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }
    if (!formData.content.trim()) {
      alert('내용을 입력하세요.');
      return;
    }

    try {
      await noticesApi.update(selectedNotice.id, formData);
      alert('공지사항이 수정되었습니다.');
      handleCloseEditDialog();
      fetchNotices();
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      alert('공지사항 수정에 실패했습니다.');
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedNotice) return;

    if (!window.confirm(`"${selectedNotice.title}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await noticesApi.delete(selectedNotice.id);
      alert('공지사항이 삭제되었습니다.');
      handleMenuClose();
      setSelectedNotice(null);
      fetchNotices();
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      alert('공지사항 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          공지사항
        </Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreateDialog}>
            공지사항 작성
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>날짜</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>제목</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>작성자</TableCell>
              {isAdmin && <TableCell sx={{ fontWeight: 600, width: 100 }}>관리</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {notices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} align="center">
                  등록된 공지사항이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              notices.map((notice) => (
                <TableRow
                  key={notice.id}
                  hover
                  onClick={() => handleViewNotice(notice)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatDate(notice.createdAt)}</TableCell>
                  <TableCell>{notice.title}</TableCell>
                  <TableCell>{notice.creator.name}</TableCell>
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, notice)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 메뉴 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOpenEditDialog}>수정</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          삭제
        </MenuItem>
      </Menu>

      {/* 작성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>공지사항 작성</DialogTitle>
        <DialogContent>
          <TextField
            label="제목"
            fullWidth
            margin="normal"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              내용
            </Typography>
            <ReactQuill
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              modules={quillModules}
              style={{ height: '300px', marginBottom: '50px' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>취소</Button>
          <Button variant="contained" onClick={handleCreate}>
            작성
          </Button>
        </DialogActions>
      </Dialog>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedNotice?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              작성자: {selectedNotice?.creator.name} | 작성일: {selectedNotice && formatDate(selectedNotice.createdAt)}
            </Typography>
          </Box>
          <Box
            sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, minHeight: 200 }}
            dangerouslySetInnerHTML={{ __html: selectedNotice?.content || '' }}
          />
        </DialogContent>
        <DialogActions>
          {isAdmin && selectedNotice && (
            <>
              <Button
                onClick={() => {
                  setViewDialogOpen(false);
                  handleOpenEditDialog();
                }}
              >
                수정
              </Button>
              <Button
                color="error"
                onClick={() => {
                  setViewDialogOpen(false);
                  handleDelete();
                }}
              >
                삭제
              </Button>
            </>
          )}
          <Button onClick={() => {
            setViewDialogOpen(false);
            setSelectedNotice(null);
          }}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>공지사항 수정</DialogTitle>
        <DialogContent>
          <TextField
            label="제목"
            fullWidth
            margin="normal"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              내용
            </Typography>
            <ReactQuill
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              modules={quillModules}
              style={{ height: '300px', marginBottom: '50px' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>취소</Button>
          <Button variant="contained" onClick={handleUpdate}>
            수정
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NoticesPage;
