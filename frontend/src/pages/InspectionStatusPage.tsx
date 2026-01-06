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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useInspectionStatus } from '../hooks/useInspectionStatus';
import type { CustomerMissingInspection } from '../types/inspection-status.types';
import dayjs from 'dayjs';

export const InspectionStatusPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const { data, isLoading, error } = useInspectionStatus(selectedYear);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerMissingInspection | null>(null);

  const years = Array.from(
    { length: currentYear - 2024 + 1 },
    (_, i) => 2024 + i,
  );

  const handleOpenDetail = (customer: CustomerMissingInspection) => {
    setSelectedCustomer(customer);
  };

  const handleCloseDetail = () => {
    setSelectedCustomer(null);
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '고객사명',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'lastInspectionDate',
      headerName: '마지막 점검일',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        return params.value
          ? dayjs(params.value).format('YYYY-MM-DD')
          : '점검 이력 없음';
      },
    },
    {
      field: 'missingCount',
      headerName: '누락된 점검서 수',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => `${params.value}개`,
    },
    {
      field: 'actions',
      headerName: '자세히 보기',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Button size="small" onClick={() => handleOpenDetail(params.row)}>
          자세히 보기
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">점검 현황</Typography>

        <FormControl sx={{ minWidth: 150 }}>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value as number)}
            size="small"
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}년
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ p: 2 }}>
        {data?.customers && data.customers.length > 0 ? (
          <DataGrid
            rows={data.customers}
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
          <Alert severity="info">누락된 점검서가 없습니다.</Alert>
        )}
      </Paper>

      <Dialog
        open={Boolean(selectedCustomer)}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedCustomer?.name} - 누락된 점검서
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              담당 엔지니어
            </Typography>
            <Typography variant="body1">
              정담당자:{' '}
              {selectedCustomer?.engineer?.name || '미지정'}
            </Typography>
            <Typography variant="body1">
              부담당자:{' '}
              {selectedCustomer?.engineerSub?.name || '미지정'}
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>점검 대상</TableCell>
                  <TableCell>누락된 점검 기간</TableCell>
                  <TableCell>예상 점검서명</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCustomer?.missingTargets.map((target) => (
                  <TableRow key={target.targetId}>
                    <TableCell>
                      {target.customName || target.productName || target.targetType}
                    </TableCell>
                    <TableCell>
                      {target.missingPeriod}
                    </TableCell>
                    <TableCell>{target.expectedLabel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
