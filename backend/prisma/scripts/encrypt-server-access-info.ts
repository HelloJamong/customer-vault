/**
 * 기존 ServerAccessInfo 평문 비밀번호를 AES-256 암호화로 일괄 변환하는 마이그레이션 스크립트
 *
 * 실행 전 반드시:
 *   1. DB 백업 완료 확인
 *   2. ENCRYPTION_KEY 환경 변수 설정 확인 (openssl rand -hex 32)
 *   3. 신 코드 배포 완료 확인 (decrypt 로직 포함 버전)
 *
 * 실행 방법:
 *   cd backend
 *   ENCRYPTION_KEY=<your-key> npx ts-node -r tsconfig-paths/register prisma/scripts/encrypt-server-access-info.ts
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const IV_LENGTH = 16;
const ENCRYPTED_PATTERN = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY 환경 변수가 유효하지 않습니다. 64자리 hex 문자열이 필요합니다.');
  }
  return Buffer.from(key, 'hex');
}

function isEncrypted(value: string): boolean {
  return ENCRYPTED_PATTERN.test(value);
}

function encrypt(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('=== ServerAccessInfo 암호화 마이그레이션 시작 ===\n');

    // ENCRYPTION_KEY 검증
    getKey();
    console.log('✅ ENCRYPTION_KEY 검증 완료\n');

    // ServerAccessInfo 전체 조회
    const records = await (prisma as any).serverAccessInfo.findMany();
    console.log(`총 ${records.length}개 레코드 처리 예정\n`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      const updateData: any = {};
      let needsUpdate = false;

      const fields: Array<[string, string | null]> = [
        ['webPassword', record.webPassword],
        ['serverSshPassword', record.serverSshPassword],
        ['serverRootPassword', record.serverRootPassword],
      ];

      for (const [field, value] of fields) {
        if (value && !isEncrypted(value)) {
          updateData[field] = encrypt(value);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await (prisma as any).serverAccessInfo.update({
          where: { id: record.id },
          data: updateData,
        });
        updated++;
        console.log(`  [${record.id}] 암호화 완료`);
      } else {
        skipped++;
      }
    }

    console.log(`\n=== ServerAccessInfo 완료: ${updated}개 암호화, ${skipped}개 건너뜀 ===\n`);

    // SystemSettings SFTP 비밀번호도 처리
    console.log('=== SystemSettings SFTP 비밀번호 처리 ===\n');
    const settings = await prisma.systemSettings.findFirst();

    if (settings?.sftpPassword && !isEncrypted(settings.sftpPassword)) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { sftpPassword: encrypt(settings.sftpPassword) },
      });
      console.log('✅ SFTP 비밀번호 암호화 완료\n');
    } else {
      console.log('  SFTP 비밀번호: 이미 암호화됨 또는 미설정\n');
    }

    console.log('=== 마이그레이션 완료 ===');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('마이그레이션 실패:', e.message);
  process.exit(1);
});
