import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { PendingVerification } from '@/api/dashboard.api';
import { VIRTUAL_PC_CHECKLIST_LABELS } from '@/utils/virtual-pc-checklist';

interface PendingVerificationsDialogProps {
  open: boolean;
  onClose: () => void;
  pendingVerifications: PendingVerification[];
}

const TYPE_INFO = {
  virtualPcChecklist: { label: '가상PC 체크리스트', path: 'source-management' },
  upgradePlan: { label: '업그레이드 계획', path: 'upgrade-plan' },
} as const;

const PendingVerificationsDialog = ({ open, onClose, pendingVerifications }: PendingVerificationsDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>검증 대기 항목</Typography>
        <IconButton onClick={onClose} size="small" aria-label="닫기">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {pendingVerifications.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            검증 대기 중인 항목이 없습니다.
          </Typography>
        ) : (
          <List disablePadding>
            {pendingVerifications.map((group, index) => {
              const info = TYPE_INFO[group.type];
              return (
                <ListItemButton
                  key={`${group.type}-${group.customerId}-${index}`}
                  divider
                  onClick={() => navigate(`/customers/${group.customerId}/${info.path}`)}
                  sx={{ alignItems: 'flex-start', py: 2 }}
                >
                  <ListItemText
                    primary={(
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography fontWeight={600}>{group.customerName}</Typography>
                        <Chip size="small" label={info.label} />
                        {group.documentName && (
                          <Typography variant="body2" color="text.secondary">{group.documentName}</Typography>
                        )}
                        <Chip size="small" color="warning" label={`${group.items.length}개 항목`} />
                      </Box>
                    )}
                    secondary={(
                      <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                        {group.items.map((item) => (
                          <li key={item.key}>
                            {VIRTUAL_PC_CHECKLIST_LABELS[item.key] || item.key}
                            {item.checkedByName && ` (검토: ${item.checkedByName})`}
                          </li>
                        ))}
                      </Box>
                    )}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PendingVerificationsDialog;
