import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Close, Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface CustomerSummary {
  id: number;
  name: string;
  version?: string;
  inspectionCycleType: string;
  inspectionCycleMonth: number | null;
  contractType: string;
  clientVersion: string | null;
  engineer?: { id: number; name: string } | null;
  engineerSub?: { id: number; name: string } | null;
  sales?: { id: number; name: string } | null;
}

interface CustomerSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  customers: CustomerSummary[];
}

const CustomerSummaryDialog = ({ open, onClose, customers }: CustomerSummaryDialogProps) => {
  const getInspectionCycleText = (customer: CustomerSummary) => {
    if (customer.inspectionCycleType === '매월') return '매월';
    if (customer.inspectionCycleType === '분기') return `분기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '반기') return `반기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '연1회') return `연1회(${customer.inspectionCycleMonth}월)`;
    return customer.inspectionCycleType || '-';
  };

  const handleExportExcel = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `전체고객사요약_${dateStr}.xlsx`;

    const sheetData: any[][] = [
      [
        '고객사명',
        '버전',
        '점검주기',
        '계약 상태',
        '클라이언트 버전',
        '정 담당자',
        '부 담당자',
        '영업 담당자',
      ],
    ];

    customers.forEach((customer) => {
      sheetData.push([
        customer.name,
        customer.version || '-',
        getInspectionCycleText(customer),
        customer.contractType || '-',
        customer.clientVersion || '-',
        customer.engineer?.name || '-',
        customer.engineerSub?.name || '-',
        customer.sales?.name || '-',
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '전체 고객사 요약');
    XLSX.writeFile(wb, filename);
  };

  const columns: GridColDef<CustomerSummary>[] = [
    {
      field: 'name',
      headerName: '고객사명',
      width: 200,
      flex: 1,
    },
    {
      field: 'version',
      headerName: '버전',
      width: 100,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'inspectionCycleType',
      headerName: '점검주기',
      width: 150,
      renderCell: (params) => getInspectionCycleText(params.row),
    },
    {
      field: 'contractType',
      headerName: '계약 상태',
      width: 120,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'clientVersion',
      headerName: '클라이언트 버전',
      width: 180,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'engineer',
      headerName: '정 담당자',
      width: 120,
      renderCell: (params) => params.value?.name || '-',
    },
    {
      field: 'engineerSub',
      headerName: '부 담당자',
      width: 120,
      renderCell: (params) => params.value?.name || '-',
    },
    {
      field: 'sales',
      headerName: '영업 담당자',
      width: 120,
      renderCell: (params) => params.value?.name || '-',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            전체 고객사 요약
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportExcel}
              size="small"
            >
              엑셀 내보내기
            </Button>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={customers}
            columns={columns}
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
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSummaryDialog;
