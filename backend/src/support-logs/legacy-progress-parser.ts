// 기존 진척 사항(actionContent) 자유 텍스트를 지원 내역(날짜/머리줄 이름/내용) 단위로 분리한다.
// 머리줄 예: "@고석준-[26-08-25]", "@안용욱 [26-01-05]", "[2026.01.05]", "@VMS[26-01-15~26-02-11]", "26-01-05"
// 원문 문구는 바꾸지 않고 줄 단위로만 나눈다.

export interface LegacyProgressEntry {
  entryDate: string; // YYYY-MM-DD
  label: string | null; // 머리줄의 @이름 (없으면 null)
  content: string;
}

export interface LegacyProgressParseResult {
  entries: LegacyProgressEntry[];
  warnings: string[]; // 비어 있지 않으면 자동 변환하지 않고 확인 필요로 분류
}

const DATE = '(\\d{4}|\\d{2})[-.](\\d{1,2})[-.](\\d{1,2})';
const HEADER = new RegExp(
  `^\\s*(?:@\\s*([^\\[\\]\\n\\d]+?)\\s*[-–]?\\s*)?\\[?\\s*${DATE}\\s*(?:~\\s*${DATE})?\\s*\\]?\\s*[-:]?\\s*(.*)$`,
);

function toIsoDate(y: string, m: string, d: string): string | null {
  const year = y.length === 2 ? `20${y}` : y;
  const iso = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const time = Date.parse(`${iso}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === iso ? iso : null;
}

export function parseLegacyProgress(text: string | null | undefined, supportDate: string): LegacyProgressParseResult {
  const warnings: string[] = [];
  const source = (text || '').replace(/\r\n?/g, '\n');
  if (!source.trim()) return { entries: [], warnings };

  const blocks: Array<{ entryDate: string | null; label: string | null; lines: string[] }> = [];
  const preamble: string[] = [];

  for (const line of source.split('\n')) {
    const m = line.match(HEADER);
    // "@"나 "["로 시작하거나 날짜만 있는 줄만 머리줄로 본다 (본문 속 날짜 오인 방지)
    const isHeader = !!m && (/^\s*[@[]/.test(line) || !m[8].trim());
    if (!isHeader) {
      if (blocks.length) blocks[blocks.length - 1].lines.push(line);
      else preamble.push(line);
      continue;
    }
    const [, name, y, mo, d, y2, mo2, d2, rest] = m!;
    const entryDate = toIsoDate(y, mo, d);
    // 경고에는 날짜 토큰만 남긴다 (머리줄 뒤 본문 = 고객 내용이 출력되지 않도록)
    if (!entryDate) warnings.push(`잘못된 날짜: ${y}-${mo}-${d}`);
    const lines: string[] = [];
    if (y2) {
      const until = toIsoDate(y2, mo2, d2);
      if (!until) warnings.push(`잘못된 날짜: ${y2}-${mo2}-${d2}`);
      lines.push(`(~${until ?? `${y2}-${mo2}-${d2}`})`);
    }
    if (rest.trim()) lines.push(rest.trim());
    blocks.push({ entryDate, label: name?.trim() || null, lines });
  }

  const entries: LegacyProgressEntry[] = [];
  const preambleText = preamble.join('\n').trim();
  if (preambleText) entries.push({ entryDate: supportDate, label: null, content: preambleText });

  for (const block of blocks) {
    const content = block.lines.join('\n').trim();
    if (!content) {
      warnings.push(`내용 없는 머리줄: ${block.entryDate ?? '?'}`);
      continue;
    }
    // 지원일보다 이른 날짜는 허용 (지원 로그를 뒤늦게 등록한 경우가 실제로 있음)
    if (block.entryDate) entries.push({ entryDate: block.entryDate, label: block.label, content });
  }

  return { entries, warnings };
}
