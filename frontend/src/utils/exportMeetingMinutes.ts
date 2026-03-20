import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { MeetingMinutes } from '@/api/meetingMinutes.api';
import dayjs from 'dayjs';

// ─── HTML → 일반 텍스트 변환 ───
const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ─── 텍스트 → 단락 배열 변환 ───
const textToParas = (text: string): Paragraph[] => {
  const lines = text.split('\n');
  if (!lines.length || (lines.length === 1 && !lines[0].trim())) {
    return [new Paragraph({ children: [new TextRun({ text: '-', size: 20 })] })];
  }
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line.trim(), size: 20 })],
        spacing: { after: 60 },
      }),
  );
};

// ─── 셀 테두리 공통 설정 ───
const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
};

const CELL_MARGIN = { top: 100, bottom: 100, left: 150, right: 150 };

// ─── 라벨 셀 (회색 배경, 굵은 글씨, 가운데 정렬) ───
const labelCell = (text: string, widthPct: number): TableCell =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20 })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { type: ShadingType.SOLID, color: 'E2E8F0', fill: 'E2E8F0' },
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGIN,
    borders: CELL_BORDER,
  });

// ─── 값 셀 ───
const valueCell = (
  paragraphs: Paragraph[],
  widthPct: number,
  columnSpan?: number,
): TableCell =>
  new TableCell({
    children: paragraphs,
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    columnSpan,
    verticalAlign: VerticalAlign.TOP,
    margins: CELL_MARGIN,
    borders: CELL_BORDER,
  });

// ─── 메인 내보내기 함수 ───
export const exportMeetingMinutesToDocx = async (
  item: MeetingMinutes,
  customerName: string,
): Promise<void> => {
  const dateStr = dayjs(item.meetingDate).format('YYYY-MM-DD');
  const locationText = item.location?.trim() || '-';
  const attendeesText = item.attendees?.trim() || '-';
  const contentText = item.content ? stripHtml(item.content) : '-';
  const decisionsText = item.decisions ? stripHtml(item.decisions) : '-';
  const remarksText = item.remarks ? stripHtml(item.remarks) : '-';

  // 4컬럼 비율: 레이블(12%) | 값1(21%) | 레이블(12%) | 값2(55%) = 100%
  // 값이 3컬럼 병합 시: 21+12+55 = 88%

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
          },
        },
        children: [
          // 제목
          new Paragraph({
            children: [
              new TextRun({ text: '회  의  록', bold: true, size: 40 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
          }),

          // 고객사명
          new Paragraph({
            children: [
              new TextRun({ text: customerName, size: 24, color: '555555' }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
          }),

          // 본문 표
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // 날짜 / 장소
              new TableRow({
                height: { value: 480, rule: HeightRule.ATLEAST },
                children: [
                  labelCell('날  짜', 12),
                  valueCell(
                    [new Paragraph({ children: [new TextRun({ text: dateStr, size: 20 })] })],
                    21,
                  ),
                  labelCell('장  소', 12),
                  valueCell(
                    [new Paragraph({ children: [new TextRun({ text: locationText, size: 20 })] })],
                    55,
                  ),
                ],
              }),

              // 회의 주제
              new TableRow({
                height: { value: 480, rule: HeightRule.ATLEAST },
                children: [
                  labelCell('회의 주제', 12),
                  valueCell(
                    [new Paragraph({ children: [new TextRun({ text: item.subject, bold: true, size: 20 })] })],
                    88,
                    3,
                  ),
                ],
              }),

              // 참석자
              new TableRow({
                height: { value: 480, rule: HeightRule.ATLEAST },
                children: [
                  labelCell('참 석 자', 12),
                  valueCell(textToParas(attendeesText), 88, 3),
                ],
              }),

              // 회의 내용
              new TableRow({
                height: { value: 1200, rule: HeightRule.ATLEAST },
                children: [
                  labelCell('회의 내용', 12),
                  valueCell(textToParas(contentText), 88, 3),
                ],
              }),

              // 결정 사항
              new TableRow({
                height: { value: 1200, rule: HeightRule.ATLEAST },
                children: [
                  labelCell('결정 사항', 12),
                  valueCell(textToParas(decisionsText), 88, 3),
                ],
              }),

              // 비고
              new TableRow({
                height: { value: 480, rule: HeightRule.ATLEAST },
                children: [
                  labelCell('비    고', 12),
                  valueCell(textToParas(remarksText), 88, 3),
                ],
              }),
            ],
          }),

          // 작성 정보
          new Paragraph({
            children: [
              new TextRun({
                text: `작성자: ${item.creator?.name ?? '-'}   |   작성일: ${dayjs(item.createdAt).format('YYYY-MM-DD')}`,
                size: 18,
                color: '888888',
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `회의록_${customerName}_${dateStr}_${item.subject}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
