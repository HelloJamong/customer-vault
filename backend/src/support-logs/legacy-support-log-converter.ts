// 기존 지원 로그의 진척 사항(actionContent)을 지원 내역(support_log_entries)으로 옮기고 빈 제목을 채운다.
// 운영 1회성 변환용. 계획 파일(plan)은 추출 시점의 updatedAt과 제안 제목만 담고,
// 분리는 운영 DB의 원문을 parseLegacyProgress로 직접 나눈다.
import { PrismaClient } from '@prisma/client';
import { parseLegacyProgress } from './legacy-progress-parser';

export interface ConversionPlanItem {
  id: number;
  updatedAt: string; // 추출 시점 값 ("YYYY-MM-DD HH:MM:SS.ffffff", UTC)
  title?: string; // 빈 제목일 때 채울 제안 제목
}

type ConversionOutcome =
  | 'converted' // 지원 내역 생성 (+ 제목)
  | 'title_only' // 진척 사항은 비어 있고 제목만 채움
  | 'nothing_to_do'
  | 'skipped_not_found'
  | 'skipped_changed' // 추출 이후 수정됨
  | 'skipped_has_entries' // 이미 지원 내역 있음 (재실행)
  | 'skipped_warning'; // 자동 분리 불가

interface ConversionReport {
  apply: boolean;
  outcomes: Record<ConversionOutcome, number[]>;
  entryCount: number;
  titleCount: number;
  // 머리줄 이름 → 매칭 결과 (계정명 또는 '최초 작성자로 대체')
  labels: Record<string, { count: number; matchedUser: string | null }>;
  warnings: Record<number, string[]>;
}

// 추출 값(UTC DATETIME 문자열)과 DB 값을 밀리초까지 비교
function sameTimestamp(exported: string, actual: Date): boolean {
  return `${exported.replace(' ', 'T').slice(0, 23)}Z` === actual.toISOString();
}

export async function convertLegacySupportLogs(
  prisma: PrismaClient,
  plan: ConversionPlanItem[],
  options: { apply: boolean },
): Promise<ConversionReport> {
  const report: ConversionReport = {
    apply: options.apply,
    outcomes: {
      converted: [], title_only: [], nothing_to_do: [], skipped_not_found: [],
      skipped_changed: [], skipped_has_entries: [], skipped_warning: [],
    },
    entryCount: 0,
    titleCount: 0,
    labels: {},
    warnings: {},
  };

  // 동명이인이 없는 계정만 이름으로 매칭
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userByName = new Map<string, { id: number; name: string }>();
  const duplicated = new Set<string>();
  for (const user of users) {
    if (userByName.has(user.name)) duplicated.add(user.name);
    userByName.set(user.name, user);
  }
  duplicated.forEach((name) => userByName.delete(name));

  for (const item of plan) {
    const log = await prisma.supportLog.findUnique({
      where: { id: item.id },
      include: { creator: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    if (!log) { report.outcomes.skipped_not_found.push(item.id); continue; }
    // 재실행 시 "이미 변환됨"으로 보이도록 지원 내역 여부를 먼저 확인
    if (log._count.entries > 0) { report.outcomes.skipped_has_entries.push(item.id); continue; }
    if (!sameTimestamp(item.updatedAt, log.updatedAt)) { report.outcomes.skipped_changed.push(item.id); continue; }

    const supportDate = log.supportDate.toISOString().slice(0, 10);
    const { entries, warnings } = parseLegacyProgress(log.actionContent, supportDate);
    if (warnings.length) {
      report.warnings[item.id] = warnings;
      report.outcomes.skipped_warning.push(item.id);
      continue;
    }

    const newTitle = !log.title?.trim() && item.title?.trim() ? item.title.trim() : null;
    if (!entries.length && !newTitle) { report.outcomes.nothing_to_do.push(item.id); continue; }

    const fallbackName = log.creator?.name ?? '미상';
    const entryData = entries.map((entry) => {
      const matched = entry.label ? userByName.get(entry.label) : undefined;
      if (entry.label) {
        const stat = (report.labels[entry.label] ||= { count: 0, matchedUser: matched?.name ?? null });
        stat.count += 1;
      }
      return {
        supportLogId: log.id,
        entryDate: new Date(entry.entryDate),
        // 계정과 매칭되지 않는 이름(팀명·고객사 등)은 최초 작성자로 두고 원래 이름을 내용 첫 줄에 남긴다
        authorName: matched?.name ?? fallbackName,
        createdByUserId: matched?.id ?? log.creator?.id ?? null,
        content: entry.label && !matched ? `[${entry.label}]\n${entry.content}` : entry.content,
      };
    });

    if (options.apply) {
      const applied = await prisma.$transaction(async (tx) => {
        // 조회 이후 누군가 수정했으면(updatedAt 변경) 반영하지 않는다
        const { count } = await tx.supportLog.updateMany({
          where: { id: log.id, updatedAt: log.updatedAt },
          data: {
            ...(entryData.length ? { actionContent: null } : {}),
            ...(newTitle ? { title: newTitle } : {}),
          },
        });
        if (count === 0) return false;
        if (entryData.length) await tx.supportLogEntry.createMany({ data: entryData });
        await tx.serviceLog.create({
          data: {
            logType: '정보',
            action: '지원 이력 양식 변환',
            description: `지원 로그 #${log.id} 진척 사항을 지원 내역 ${entryData.length}건으로 변환${newTitle ? ' (제목 추가)' : ''}`,
            beforeValue: JSON.stringify({ title: log.title, actionContent: log.actionContent }),
            afterValue: JSON.stringify({ title: newTitle ?? log.title, entries: entryData }),
          },
        });
        return true;
      });
      if (!applied) { report.outcomes.skipped_changed.push(item.id); continue; }
    }

    report.entryCount += entryData.length;
    if (newTitle) report.titleCount += 1;
    report.outcomes[entryData.length ? 'converted' : 'title_only'].push(item.id);
  }

  return report;
}
