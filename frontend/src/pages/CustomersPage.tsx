import { Box, Typography, Button, Chip } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useCustomers } from '@/hooks/useCustomers';
import type { Customer } from '@/types/customer.types';
import dayjs from 'dayjs';

const CustomersPage = () => {
  const { customers, isLoading, deleteCustomer } = useCustomers();

  const handleDelete = (id: number, name: string) => {
    if (confirm(`"${name}" 고객사를 삭제하시겠습니까?`)) {
      deleteCustomer(id);
    }
  };

  const columns: GridColDef<Customer>[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
    },
    {
      field: 'name',
      headerName: '고객사명',
      width: 200,
      flex: 1,
    },
    {
      field: 'contact_person',
      headerName: '담당자',
      width: 130,
    },
    {
      field: 'contact_phone',
      headerName: '연락처',
      width: 150,
    },
    {
      field: 'contact_email',
      headerName: '이메일',
      width: 200,
    },
    {
      field: 'inspection_cycle_months',
      headerName: '점검주기',
      width: 100,
      renderCell: (params) => `${params.value}개월`,
    },
    {
      field: 'last_inspection_date',
      headerName: '최근점검일',
      width: 130,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format('YYYY-MM-DD') : '-',
    },
    {
      field: 'next_inspection_date',
      headerName: '다음점검일',
      width: 130,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format('YYYY-MM-DD') : '-',
    },
    {
      field: 'is_active',
      headerName: '상태',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? '활성' : '비활성'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: '작업',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => alert(`편집 기능은 곧 구현됩니다: ${params.row.name}`)}
          >
            편집
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<Delete />}
            onClick={() => handleDelete(params.row.id, params.row.name)}
          >
            삭제
          </Button>
        </Box>
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
          onClick={() => alert('고객사 추가 기능은 곧 구현됩니다')}
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
    </Box>
  );
};

export default CustomersPage;
