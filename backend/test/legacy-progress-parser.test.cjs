const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLegacyProgress } = require('../src/support-logs/legacy-progress-parser');

test('다양한 머리줄 형식을 날짜/이름/내용으로 나눈다', () => {
  const text = [
    '@고석준-[26-08-25]',
    '- 이미지 원격제공드림',
    '- 원인 확인 중',
    '',
    '@안용욱 [26-08-26] 당일 추가 확인',
    '- 재제공',
    '@송어진[2026.8.27]',
    '- 방문',
    '[26-08-28]',
    '- 이름 없는 머리줄',
    '26-08-29',
    '- 날짜만 있는 줄',
  ].join('\n');

  const { entries, warnings } = parseLegacyProgress(text, '2026-08-25');

  assert.deepEqual(warnings, []);
  assert.deepEqual(entries, [
    { entryDate: '2026-08-25', label: '고석준', content: '- 이미지 원격제공드림\n- 원인 확인 중' },
    { entryDate: '2026-08-26', label: '안용욱', content: '당일 추가 확인\n- 재제공' },
    { entryDate: '2026-08-27', label: '송어진', content: '- 방문' },
    { entryDate: '2026-08-28', label: null, content: '- 이름 없는 머리줄' },
    { entryDate: '2026-08-29', label: null, content: '- 날짜만 있는 줄' },
  ]);
});

test('머리줄 앞의 글은 지원일 날짜의 첫 내역, 머리줄이 없으면 전체가 1건', () => {
  assert.deepEqual(parseLegacyProgress('한싹 측에 전달한 상태\n[26-01-05]\n- 답변 받음', '2026-01-02').entries, [
    { entryDate: '2026-01-02', label: null, content: '한싹 측에 전달한 상태' },
    { entryDate: '2026-01-05', label: null, content: '- 답변 받음' },
  ]);
  assert.deepEqual(parseLegacyProgress('재설치 안내드림\n1/7일 오후 방문 예정', '2025-12-30').entries, [
    { entryDate: '2025-12-30', label: null, content: '재설치 안내드림\n1/7일 오후 방문 예정' },
  ]);
});

test('본문 속 날짜나 날짜 없는 @줄은 머리줄로 보지 않는다', () => {
  const { entries } = parseLegacyProgress('@고객사 측(권오진 차장)\n- 2026.01.07 방문 요청\n- 3월 11일로 연기', '2026-01-05');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].content, '@고객사 측(권오진 차장)\n- 2026.01.07 방문 요청\n- 3월 11일로 연기');
});

test('기간 머리줄은 시작일로 두고 종료일을 내용 첫 줄에 남긴다', () => {
  assert.deepEqual(parseLegacyProgress('@VMS[26-01-15~26-02-11]\n- 방문 협의', '2026-01-01').entries, [
    { entryDate: '2026-01-15', label: 'VMS', content: '(~2026-02-11)\n- 방문 협의' },
  ]);
});

test('지원일보다 이른 날짜는 허용한다', () => {
  const { entries, warnings } = parseLegacyProgress('@송어진[25-11-07]\n- 임시 라이선스 요청', '2026-01-01');
  assert.deepEqual(warnings, []);
  assert.equal(entries[0].entryDate, '2025-11-07');
});

test('잘못된 날짜나 내용 없는 머리줄은 경고로 분류한다', () => {
  assert.equal(parseLegacyProgress('[26-00-00]\n- 입력 예시 그대로', '2026-01-01').warnings.length, 1);
  assert.equal(parseLegacyProgress('@고석준[26-08-25]\n@고석준[26-08-26]\n- 내용', '2026-08-25').warnings.length, 1);
});

test('빈 값은 변환 대상이 아니다', () => {
  assert.deepEqual(parseLegacyProgress(null, '2026-01-01'), { entries: [], warnings: [] });
  assert.deepEqual(parseLegacyProgress('  \n ', '2026-01-01'), { entries: [], warnings: [] });
});

test('경고 메시지에는 머리줄 뒤 본문이 들어가지 않는다', () => {
  const { warnings } = parseLegacyProgress('[26-00-00] 고객 내용 비밀\n- 본문', '2026-01-01');
  assert.deepEqual(warnings, ['잘못된 날짜: 26-00-00']);
});
