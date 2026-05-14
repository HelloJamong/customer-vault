import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const IV_LENGTH = 16;
// AES-CBC 암호화 값 형식: 32자 IV hex + ':' + 짝수 길이 hex
const ENCRYPTED_PATTERN = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

@Injectable()
export class CryptoService {
  private getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        'ENCRYPTION_KEY 환경 변수가 유효하지 않습니다. 64자리 hex 문자열이 필요합니다. (openssl rand -hex 32)',
      );
    }
    return Buffer.from(key, 'hex');
  }

  encrypt(plainText: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(encryptedText: string): string {
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
    return ENCRYPTED_PATTERN.test(value);
  }

  // 평문이면 복호화 없이 반환, 암호문이면 복호화 (마이그레이션 과도기 대응)
  safeDecrypt(value: string | null | undefined): string | null {
    if (!value) return null;
    if (this.isEncrypted(value)) return this.decrypt(value);
    return value;
  }
}
