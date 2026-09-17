import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const LEGACY_IV_LENGTH = 16;
const GCM_IV_LENGTH = 12;
const V2_PREFIX = 'v2';

// 레거시 AES-256-CBC 값 형식: 32자 IV hex + ':' + 짝수 길이 hex (인증 태그 없음)
const LEGACY_ENCRYPTED_PATTERN = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
// 신규 AES-256-GCM 값 형식: 'v2:' + 24자 IV hex + ':' + 32자 태그 hex + ':' + 짝수 길이 hex
const V2_ENCRYPTED_PATTERN = /^v2:[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

  private getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        'ENCRYPTION_KEY 환경 변수가 유효하지 않습니다. 64자리 hex 문자열이 필요합니다. (openssl rand -hex 32)',
      );
    }
    return Buffer.from(key, 'hex');
  }

  // 신규 암호화는 항상 AES-256-GCM(인증 태그 포함)을 사용한다.
  encrypt(plainText: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [V2_PREFIX, iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  // 신규(v2, GCM)와 레거시(CBC) 형식을 모두 복호화할 수 있어야 기존 저장값과 호환된다.
  decrypt(encryptedText: string): string {
    if (encryptedText.startsWith(`${V2_PREFIX}:`)) {
      const [, ivHex, tagHex, encHex] = encryptedText.split(':');
      const key = this.getKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex')); // 값이 변조되었으면 여기서 예외가 발생한다
      const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
      return decrypted.toString('utf8');
    }

    const [ivHex, encHex] = encryptedText.split(':');
    const key = this.getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString();
  }

  isEncrypted(value: string): boolean {
    return V2_ENCRYPTED_PATTERN.test(value) || LEGACY_ENCRYPTED_PATTERN.test(value);
  }

  // 평문이면 복호화 없이 반환, 암호문이면 복호화 (마이그레이션 과도기 대응).
  // 손상되었거나 변조된 값은 요청 전체를 실패시키는 대신 null로 안전하게 처리한다.
  safeDecrypt(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!this.isEncrypted(value)) return value;
    try {
      return this.decrypt(value);
    } catch {
      this.logger.error('복호화 실패 — 값이 손상되었거나 변조되었을 수 있습니다');
      return null;
    }
  }
}
