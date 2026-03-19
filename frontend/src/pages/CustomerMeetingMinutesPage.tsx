import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Grid,
} from '@mui/material';
import { Add, ArrowBack, RemoveCircleOutline } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingMinutesApi, type MeetingMinutes, type CreateMeetingMinutesData } from '@/api/meetingMinutes.api';
import { customersAPI } from '@/api/customers.api';
import dayjs, { Dayjs } from 'dayjs';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const MAX_ATTENDEES = 10;

// ─── MeetingForm: 컴포넌트 외부 선언 (내부 선언 시 리렌더마다 재마운트로 포커스 소실) ───
interface MeetingFormProps {
  formData: Omit<CreateMeetingMinutesData, 'attendees'> & { meetingDate: string };
  setFormData: React.Dispatch<React.SetStateAction<Omit<CreateMeetingMinutesData, 'attendees'> & { meetingDate: string }>>;
  selectedDate: Dayjs;
  setSelectedDate: (d: Dayjs) => void;
  attendeesList: string[];
  addAttendee: () => void;
  removeAttendee: (idx: number) => void;
  updateAttendee: (idx: number, value: string) => void;
}

const MeetingForm = ({
  formData, setFormData, selectedDate, setSelectedDate,
  attendeesList, addAttendee, removeAttendee, updateAttendee,
}: MeetingFormProps) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DatePicker
            label="날짜"
            value={selectedDate}
            onChange={(val) => { if (val) setSelectedDate(val); }}
            format="YYYY-MM-DD"
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            label="위치"
            fullWidth
            size="small"
            value={formData.location}
            onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
          />
        </Grid>
      </Grid>

      <TextField
        label="회의 주제"
        fullWidth
        size="small"
        required
        value={formData.subject}
        onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
      />

      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="caption" color="text.secondary">
            참석자 ({attendeesList.length}/{MAX_ATTENDEES})
          </Typography>
          {attendeesList.length < MAX_ATTENDEES && (
            <Button size="small" startIcon={<Add />} onClick={addAttendee} sx={{ fontSize: '0.75rem' }}>
              참석자 추가
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {attendeesList.map((attendee, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                placeholder="예) 삼성전자 홍길동 대리"
                fullWidth
                size="small"
                value={attendee}
                onChange={(e) => updateAttendee(idx, e.target.value)}
              />
              <IconButton
                size="small"
                onClick={() => removeAttendee(idx)}
                sx={{ color: 'text.disabled', flexShrink: 0 }}
              >
                <RemoveCircleOutline fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          회의 내용
        </Typography>
        <ReactQuill
          theme="snow"
          modules={quillModules}
          value={formData.content}
          onChange={(val) => setFormData((p) => ({ ...p, content: val }))}
          style={{ height: 180, marginBottom: 42 }}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          회의 결정 사항
        </Typography>
        <ReactQuill
          theme="snow"
          modules={quillModules}
          value={formData.decisions}
          onChange={(val) => setFormData((p) => ({ ...p, decisions: val }))}
          style={{ height: 180, marginBottom: 42 }}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          비고
        </Typography>
        <ReactQuill
          theme="snow"
          modules={quillModules}
          value={formData.remarks}
          onChange={(val) => setFormData((p) => ({ ...p, remarks: val }))}
          style={{ height: 120, marginBottom: 42 }}
        />
      </Box>
    </Box>
  </LocalizationProvider>
);

// ─── 메인 페이지 ───
const emptyFormBase: Omit<CreateMeetingMinutesData, 'attendees'> & { meetingDate: string } = {
  meetingDate: dayjs().format('YYYY-MM-DD'),
  location: '',
  subject: '',
  content: '',
  decisions: '',
  remarks: '',
};

const attendeesToLines = (raw: string | null) =>
  raw ? raw.split('\n').filter(Boolean) : [];

const CustomerMeetingMinutesPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [minutes, setMinutes] = useState<MeetingMinutes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<MeetingMinutes | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [formData, setFormData] = useState(emptyFormBase);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [attendeesList, setAttendeesList] = useState<string[]>(['']);

  const id = Number(customerId);

  useEffect(() => {
    fetchAll();
    customersAPI.getById(id).then((c) => setCustomerName(c.name ?? '')).catch(() => {});
  }, [id]);

  const fetchAll = async () => {
    try {
      const data = await meetingMinutesApi.getAll(id);
      setMinutes(data);
    } catch (e) {
      console.error(e);
      alert('회의록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (item: MeetingMinutes) => {
    setSelected(item);
    setViewOpen(true);
  };

  const handleEdit = (item: MeetingMinutes) => {
    setSelected(item);
    setFormData({
      meetingDate: dayjs(item.meetingDate).format('YYYY-MM-DD'),
      location: item.location ?? '',
      subject: item.subject,
      content: item.content ?? '',
      decisions: item.decisions ?? '',
      remarks: item.remarks ?? '',
    });
    setSelectedDate(dayjs(item.meetingDate));
    const parsed = attendeesToLines(item.attendees);
    setAttendeesList(parsed.length > 0 ? parsed : ['']);
    setEditOpen(true);
  };

  const handleDelete = async (item: MeetingMinutes) => {
    if (!window.confirm(`"${item.subject}" 회의록을 삭제하시겠습니까?`)) return;
    try {
      await meetingMinutesApi.remove(item.id);
      await fetchAll();
    } catch (e) { alert('삭제에 실패했습니다.'); }
  };

  const handleCreateOpen = () => {
    setFormData(emptyFormBase);
    setSelectedDate(dayjs());
    setAttendeesList(['']);
    setCreateOpen(true);
  };

  const buildPayload = (): CreateMeetingMinutesData => ({
    ...formData,
    meetingDate: selectedDate.format('YYYY-MM-DD'),
    attendees: attendeesList.filter((a) => a.trim()).join('\n'),
  });

  const handleCreate = async () => {
    if (!formData.subject.trim()) { alert('회의 주제를 입력해주세요.'); return; }
    try {
      await meetingMinutesApi.create(id, buildPayload());
      setCreateOpen(false);
      await fetchAll();
    } catch (e) { alert('저장에 실패했습니다.'); }
  };

  const handleUpdate = async () => {
    if (!selected || !formData.subject.trim()) { alert('회의 주제를 입력해주세요.'); return; }
    try {
      await meetingMinutesApi.update(selected.id, buildPayload());
      setEditOpen(false);
      await fetchAll();
    } catch (e) { alert('수정에 실패했습니다.'); }
  };

  const addAttendee = () => {
    if (attendeesList.length < MAX_ATTENDEES) setAttendeesList((p) => [...p, '']);
  };
  const removeAttendee = (idx: number) => {
    setAttendeesList((p) => p.length === 1 ? [''] : p.filter((_, i) => i !== idx));
  };
  const updateAttendee = (idx: number, value: string) => {
    setAttendeesList((p) => p.map((a, i) => i === idx ? value : a));
  };

  const formProps: MeetingFormProps = {
    formData, setFormData, selectedDate, setSelectedDate,
    attendeesList, addAttendee, removeAttendee, updateAttendee,
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate(-1)} size="small"><ArrowBack /></IconButton>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {customerName ? `${customerName} - 회의록` : '회의록'}
            </Typography>
            <Typography variant="body2" color="text.secondary">고객사 회의록 목록</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateOpen}>
          회의록 작성
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, width: 110 }}>날짜</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>회의록 주제</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }}>작성자</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 220 }} align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {minutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    등록된 회의록이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                minutes.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{dayjs(item.meetingDate).format('YYYY-MM-DD')}</TableCell>
                    <TableCell>{item.subject}</TableCell>
                    <TableCell>{item.creator?.name ?? '-'}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Button size="small" variant="outlined" onClick={() => handleView(item)}>
                          보기
                        </Button>
                        <Button size="small" variant="outlined" color="primary" onClick={() => handleEdit(item)}>
                          수정
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(item)}>
                          삭제
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 작성 다이얼로그 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>회의록 작성</DialogTitle>
        <DialogContent dividers><MeetingForm {...formProps} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleCreate}>저장</Button>
        </DialogActions>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>회의록 수정</DialogTitle>
        <DialogContent dividers><MeetingForm {...formProps} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleUpdate}>저장</Button>
        </DialogActions>
      </Dialog>

      {/* 보기 다이얼로그 */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selected?.subject}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">날짜</Typography>
                  <Typography>{dayjs(selected.meetingDate).format('YYYY-MM-DD')}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">위치</Typography>
                  <Typography>{selected.location ?? '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">참석자</Typography>
                  {attendeesToLines(selected.attendees).length > 0 ? (
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {attendeesToLines(selected.attendees).map((a, i) => (
                        <li key={i}><Typography variant="body2">{a}</Typography></li>
                      ))}
                    </Box>
                  ) : (
                    <Typography>-</Typography>
                  )}
                </Grid>
              </Grid>
              {selected.content && (
                <Box>
                  <Typography variant="caption" color="text.secondary">회의 내용</Typography>
                  <Box sx={{ mt: 0.5, p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1 }}
                    dangerouslySetInnerHTML={{ __html: selected.content }} className="ql-editor" />
                </Box>
              )}
              {selected.decisions && (
                <Box>
                  <Typography variant="caption" color="text.secondary">회의 결정 사항</Typography>
                  <Box sx={{ mt: 0.5, p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1 }}
                    dangerouslySetInnerHTML={{ __html: selected.decisions }} className="ql-editor" />
                </Box>
              )}
              {selected.remarks && (
                <Box>
                  <Typography variant="caption" color="text.secondary">비고</Typography>
                  <Box sx={{ mt: 0.5, p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1 }}
                    dangerouslySetInnerHTML={{ __html: selected.remarks }} className="ql-editor" />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerMeetingMinutesPage;
