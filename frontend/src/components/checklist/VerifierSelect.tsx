import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/axios';

interface TeamMember {
  id: number;
  name: string;
}

interface VerifierSelectProps {
  value: number | null | undefined;
  currentName?: string | null;
  onChange: (verifierUserId: number | null) => void;
}

// 체크리스트 검증 담당자 선택. 후보는 기술팀 소속 활성 사용자.
const VerifierSelect = ({ value, currentName, onChange }: VerifierSelectProps) => {
  const { data: engineers = [] } = useQuery({
    queryKey: ['users', 'team-members'],
    queryFn: async () => (await apiClient.get<{ engineers: TeamMember[] }>('/users/team-members/all')).data.engineers,
    staleTime: 60000,
  });

  // 이미 지정된 담당자가 기술팀 목록에서 빠졌더라도 선택값이 사라지지 않게 유지한다.
  const options = value && !engineers.some((user) => user.id === value)
    ? [...engineers, { id: value, name: currentName || `사용자 #${value}` }]
    : engineers;

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>검증 담당자</InputLabel>
      <Select<number | ''>
        label="검증 담당자"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <MenuItem value="">미지정</MenuItem>
        {options.map((user) => (
          <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default VerifierSelect;
