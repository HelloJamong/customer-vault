import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, type UserAssignmentStatus } from '../api/users.api';
import EditIcon from '@mui/icons-material/Edit';

export const AssignmentStatusPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserAssignmentStatus | null>(null);
  const [description, setDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assignment-status'],
    queryFn: usersAPI.getAssignmentStatus,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, description }: { userId: number; description: string }) =>
      usersAPI.updateDescription(userId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-status'] });
      setDialogOpen(false);
      setSelectedUser(null);
      setDescription('');
    },
  });

  const handleOpenDialog = (user: UserAssignmentStatus) => {
    setSelectedUser(user);
    setDescription(user.description || '');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    setDescription('');
  };

  const handleSave = () => {
    if (selectedUser) {
      updateMutation.mutate({
        userId: selectedUser.id,
        description,
      });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '이름',
      width: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'primaryCustomerCount',
      headerName: '정 고객사 수',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => `${params.value}개`,
    },
    {
      field: 'secondaryCustomerCount',
      headerName: '부 고객사 수',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => `${params.value}개`,
    },
    {
      field: 'description',
      headerName: '비고',
      flex: 1,
      minWidth: 300,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'actions',
      headerName: '수정',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => handleOpenDialog(params.row)}
        >
          수정
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          데이터를 불러오는 중 오류가 발생했습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          고객사 담당 현황
        </Typography>
        <Typography variant="body2" color="text.secondary">
          기술팀 담당자별 고객사 배정 현황을 확인하고 관리합니다
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        {data?.users && data.users.length > 0 ? (
          <DataGrid
            rows={data.users}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            autoHeight
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
            }}
          />
        ) : (
          <Alert severity="info">기술팀 담당자가 없습니다.</Alert>
        )}
      </Paper>

      {/* 비고 수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>비고 수정 - {selectedUser?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="비고"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="담당자에 대한 메모를 입력하세요"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={updateMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
