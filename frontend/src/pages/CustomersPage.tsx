import { useState } from 'react';
import { Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Visibility, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import type { Customer } from '@/types/customer.types';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { customers, isLoading, createCustomer } = useCustomers();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('고객사명을 입력해주세요.');
      return;
    }

    try {
      await createCustomer({ name: newCustomerName.trim() });
      setOpenAddDialog(false);
      setNewCustomerName('');
    } catch (error) {
      console.error('고객사 추가 실패:', error);
    }
  };

  const getInspectionCycleText = (customer: Customer) => {
    if (customer.inspectionCycleType === '매월') return '매월';
    if (customer.inspectionCycleType === '분기') return `분기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '반기') return `반기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '연1회') return `연1회(${customer.inspectionCycleMonth}월)`;
    return customer.inspectionCycleType || '-';
  };

  const getStatusColor = (status: string | undefined) => {
    if (status === '점검 완료') return 'success';
    if (status === '미완료') return 'error';
    return 'default';
  };

  const columns: GridColDef<Customer>[] = [
    {
      field: 'name',
      headerName: '고객사명',
      width: 200,
      flex: 1,
    },
    {
      field: 'inspectionCycleType',
      headerName: '점검주기',
      width: 150,
      renderCell: (params) => getInspectionCycleText(params.row),
    },
    {
      field: 'inspectionStatus',
      headerName: '상태',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || '대상아님'}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'contractType',
      headerName: '계약 상태',
      width: 120,
      renderCell: (params) => params.value || '미계약',
    },
    {
      field: 'viewDocuments',
      headerName: '점검서보기',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Visibility />}
          onClick={() => navigate(`/customers/${params.row.id}/documents`)}
        >
          보기
        </Button>
      ),
    },
    {
      field: 'viewDetails',
      headerName: '세부사항보기',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Info />}
          onClick={() => navigate(`/customers/${params.row.id}`)}
        >
          세부사항
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            고객사 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            전체 고객사 목록을 관리합니다
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenAddDialog(true)}
        >
          고객사 추가
        </Button>
      </Box>

      <Box sx={{ height: 600, width: '100%', bgcolor: 'white', borderRadius: 1 }}>
        <DataGrid
          rows={customers}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Box>

      {/* 고객사 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>고객사 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="고객사명"
            fullWidth
            required
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddCustomer();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>취소</Button>
          <Button onClick={handleAddCustomer} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomersPage;
