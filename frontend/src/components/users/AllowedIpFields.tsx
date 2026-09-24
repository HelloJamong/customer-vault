import { Alert, Box, TextField } from '@mui/material';

interface AllowedIpFieldsProps {
  value: string;
  onValueChange: (value: string) => void;
  maxIps: number;
}

export function AllowedIpFields({
  value,
  onValueChange,
  maxIps,
}: AllowedIpFieldsProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <TextField
        label="허용 IP"
        fullWidth
        margin="normal"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={'192.168.10.25\n2001:db8::25'}
        helperText={`IP를 줄바꿈 또는 쉼표로 구분해 입력하세요. 최대 ${maxIps}개까지 등록할 수 있습니다.`}
        multiline
        minRows={2}
      />
      <Alert severity="info" sx={{ mt: 1 }}>
        시스템 설정에서 IP 제한이 켜져 있을 때만 접속 제한에 사용됩니다. IP를 변경하면 기존 세션이 종료됩니다.
      </Alert>
    </Box>
  );
}
