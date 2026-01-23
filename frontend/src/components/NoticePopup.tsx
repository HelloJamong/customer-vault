import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { Notice } from '@/api/notices.api';

interface NoticePopupProps {
  notice: Notice;
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export const NoticePopup = ({ notice, open, onClose }: NoticePopupProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    onClose(dontShowAgain);
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pr: 6, fontWeight: 600 }}>
        {notice.title}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            작성일: {formatDate(notice.createdAt)} | 작성자: {notice.creator.name}
          </Typography>
        </Box>

        <Box
          sx={{
            mt: 2,
            p: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            minHeight: 200,
            maxHeight: 400,
            overflow: 'auto',
            bgcolor: '#fafafa',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
          dangerouslySetInnerHTML={{ __html: notice.content }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
          }
          label="다시 보지 않기"
        />
        <Button variant="contained" onClick={handleClose}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};
