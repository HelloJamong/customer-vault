import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface DuplicateLoginDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DuplicateLoginDialog = ({ open, onConfirm, onCancel }: DuplicateLoginDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          pt: 4,
          pb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <WarningAmberIcon
            sx={{
              fontSize: 64,
              color: '#f59e0b', // amber-500
            }}
          />
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: '#0f172a', // slate-900
          }}
        >
          중복 로그인 감지
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          textAlign: 'center',
          px: 4,
          pb: 2,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: '#475569', // slate-600
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {`이미 로그인된 계정입니다.\n로그인 하시겠습니까?\n(로그인 시 기존 계정이 로그아웃됩니다)`}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: 'center',
          gap: 2,
          px: 4,
          pb: 4,
        }}
      >
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{
            minWidth: 100,
            borderColor: '#cbd5e1', // slate-300
            color: '#475569', // slate-600
            '&:hover': {
              borderColor: '#94a3b8', // slate-400
              bgcolor: '#f8fafc', // slate-50
            },
          }}
        >
          아니요
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            minWidth: 100,
            bgcolor: '#6366f1', // indigo-600
            '&:hover': {
              bgcolor: '#4f46e5', // indigo-700
            },
          }}
        >
          예
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DuplicateLoginDialog;
