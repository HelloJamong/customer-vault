import type { SupportLogEntry } from '@/types/support-log.types';

type LogSource = { creator?: { name?: string }; actionContent?: string; entries?: SupportLogEntry[] };

// 최초 작성자 + 지원 내역 작성자 (중복 제거)
export const getEngineers = (log: LogSource) =>
  Array.from(new Set([log.creator?.name, ...(log.entries || []).map((e) => e.authorName)].filter(Boolean))) as string[];

const formatEntry = (entry: SupportLogEntry) =>
  `[${entry.entryDate.slice(0, 10)} ${entry.authorName}]\n${entry.content}`;

// 기존 기록(actionContent) + 지원 내역을 엑셀용 한 텍스트로
export const formatProgress = (log: LogSource) =>
  [log.actionContent, ...(log.entries || []).map(formatEntry)].filter(Boolean).join('\n\n');
