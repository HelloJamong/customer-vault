// 지원 이력 양식 변환 (1회성)
//   점검: docker compose exec -T backend node dist/scripts/convert-legacy-support-logs.js < support-log-conversion-plan.json
//   적용: docker compose exec -T backend node dist/scripts/convert-legacy-support-logs.js --apply < support-log-conversion-plan.json
// 고객 문의 내용은 출력하지 않고 건수·id·머리줄 이름 매칭 결과만 출력한다.
import { PrismaClient } from '@prisma/client';
import { convertLegacySupportLogs, ConversionPlanItem } from '../support-logs/legacy-support-log-converter';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const plan = JSON.parse(await readStdin()) as ConversionPlanItem[];
  if (!Array.isArray(plan) || plan.some((item) => !Number.isInteger(item.id) || typeof item.updatedAt !== 'string')) {
    throw new Error('계획 파일 형식이 올바르지 않습니다');
  }

  const prisma = new PrismaClient();
  try {
    const report = await convertLegacySupportLogs(prisma, plan, { apply });
    console.log(apply ? '=== 적용 결과 ===' : '=== 점검 결과 (DB 변경 없음) ===');
    for (const [outcome, ids] of Object.entries(report.outcomes)) {
      console.log(`${outcome.padEnd(20)} ${String(ids.length).padStart(4)}건${ids.length && outcome.startsWith('skipped') ? `  id: ${ids.join(',')}` : ''}`);
    }
    console.log(`지원 내역 ${report.entryCount}건 / 제목 추가 ${report.titleCount}건`);
    console.log('--- 머리줄 이름 매칭 (계정 없으면 최초 작성자로 두고 내용 첫 줄에 [이름] 표기)');
    for (const [label, stat] of Object.entries(report.labels)) {
      console.log(`${label}: ${stat.count}건 → ${stat.matchedUser ?? '최초 작성자로 대체'}`);
    }
    for (const [id, warnings] of Object.entries(report.warnings)) console.log(`확인 필요 #${id}: ${warnings.join(' / ')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // Prisma 오류 객체는 쿼리 인자(내용)를 포함할 수 있어 코드·메시지 첫 줄만 출력
  console.error(`변환 실패${error?.code ? ` (${error.code})` : ''}: ${String(error?.message ?? error).split('\n')[0]}`);
  process.exit(1);
});
