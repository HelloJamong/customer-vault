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
import ExcelJS from 'exceljs';

interface CustomerSummary {
  id: number;
  name: string;
  version?: string;
  inspectionCycleType: string;
  inspectionCycleMonth: number | null;
  contractType: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  hardwareIncluded: boolean;
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
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  const getInspectionCycleText = (customer: CustomerSummary) => {
    // 미계약, POC, 만료인 경우 점검 주기를 "-"로 표시
    if (['미계약', 'POC', '만료'].includes(customer.contractType || '')) {
      return '-';
    }
    if (customer.inspectionCycleType === '매월') return '매월';
    if (customer.inspectionCycleType === '분기') return `분기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '반기') return `반기(${customer.inspectionCycleMonth}월)`;
    if (customer.inspectionCycleType === '연1회') return `연1회(${customer.inspectionCycleMonth}월)`;
    return customer.inspectionCycleType || '-';
  };

  const getContractPeriodText = (customer: CustomerSummary) => {
    if (!customer.contractStartDate && !customer.contractEndDate) return '-';
    const start = formatDate(customer.contractStartDate);
    const end = formatDate(customer.contractEndDate);
    return `${start} ~ ${end}`;
  };

  const handleExportExcel = async () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `전체고객사요약_${dateStr}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('전체 고객사 요약');

    worksheet.columns = [
      { width: 25 },
      { width: 10 },
      { width: 15 },
      { width: 12 },
      { width: 25 },
      { width: 14 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];

    const sheetData: any[][] = [
      [
        '고객사명',
        '버전',
        '점검주기',
        '계약 상태',
        '계약 기간',
        '하드웨어 포함',
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
        getContractPeriodText(customer),
        customer.hardwareIncluded ? '포함' : '미포함',
        customer.clientVersion || '-',
        customer.engineer?.name || '-',
        customer.engineerSub?.name || '-',
        customer.sales?.name || '-',
      ]);
    });

    // 데이터 추가
    sheetData.forEach(row => worksheet.addRow(row));

    // 중단 정렬 적용
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
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
      valueGetter: (value: string | undefined) => value || '',
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
      valueGetter: (value: string | undefined) => value || '',
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'contractStartDate',
      headerName: '계약 기간',
      width: 200,
      valueGetter: (value: string | null) => value || '',
      renderCell: (params) => getContractPeriodText(params.row),
    },
    {
      field: 'hardwareIncluded',
      headerName: '하드웨어 포함',
      width: 120,
      renderCell: (params) => params.value ? '포함' : '미포함',
    },
    {
      field: 'clientVersion',
      headerName: '클라이언트 버전',
      width: 180,
      valueGetter: (value: string | null) => value || '',
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'engineer',
      headerName: '정 담당자',
      width: 120,
      valueGetter: (_value: { id: number; name: string } | null | undefined, row: CustomerSummary) => row.engineer?.name || '',
      renderCell: (params) => params.row.engineer?.name || '-',
    },
    {
      field: 'engineerSub',
      headerName: '부 담당자',
      width: 120,
      valueGetter: (_value: { id: number; name: string } | null | undefined, row: CustomerSummary) => row.engineerSub?.name || '',
      renderCell: (params) => params.row.engineerSub?.name || '-',
    },
    {
      field: 'sales',
      headerName: '영업 담당자',
      width: 120,
      valueGetter: (_value: { id: number; name: string } | null | undefined, row: CustomerSummary) => row.sales?.name || '',
      renderCell: (params) => params.row.sales?.name || '-',
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
