import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';

interface IncompleteInspectionsDialogProps {
  open: boolean;
  onClose: () => void;
}

const IncompleteInspectionsDialog = ({ open, onClose }: IncompleteInspectionsDialogProps) => {
  const {
    data: incompleteInspections,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard', 'incomplete-inspections'],
    queryFn: dashboardApi.getIncompleteInspections,
    enabled: open, // 팝업이 열려있을 때만 API 호출
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Typography
          sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          점검 미완료 고객사 목록
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#64748b',
            '&:hover': {
              bgcolor: '#f1f5f9',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2, px: 3 }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
              gap: 2,
            }}
          >
            <Typography variant="h6" color="error">
              데이터를 불러오는데 실패했습니다.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
            </Typography>
          </Box>
        ) : incompleteInspections && incompleteInspections.length > 0 ? (
          <>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#64748b',
                mb: 2,
              }}
            >
              총 <strong>{incompleteInspections.length}개</strong>의 고객사가 점검을 완료하지 않았습니다.
            </Typography>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: 2,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: '#475569',
                        fontSize: '0.875rem',
                      }}
                    >
                      고객사
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: '#475569',
                        fontSize: '0.875rem',
                      }}
                    >
                      정 엔지니어
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: '#475569',
                        fontSize: '0.875rem',
                      }}
                    >
                      부 엔지니어
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incompleteInspections.map((inspection) => (
                    <TableRow
                      key={inspection.id}
                      sx={{
                        '&:hover': {
                          bgcolor: '#f8fafc',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontSize: '0.875rem',
                          color: '#0f172a',
                          fontWeight: 500,
                        }}
                      >
                        {inspection.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.875rem',
                          color: '#475569',
                        }}
                      >
                        {inspection.primaryEngineer}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.875rem',
                          color: '#475569',
                        }}
                      >
                        {inspection.subEngineer}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
              bgcolor: '#f8fafc',
              borderRadius: 2,
              border: '1px dashed #cbd5e1',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#64748b',
              }}
            >
              모든 고객사의 점검이 완료되었습니다.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#2563eb',
            '&:hover': {
              bgcolor: '#1d4ed8',
            },
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncompleteInspectionsDialog;
