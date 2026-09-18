import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class TotpService {
  generateSecret(): string {
    return this.encodeBase32(crypto.randomBytes(20));
  }

  buildOtpAuthUri(username: string, secret: string): string {
    const issuer = 'Customer Vault';
    const label = `${issuer}:${username}`;
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: String(TOTP_DIGITS),
      period: String(TOTP_PERIOD_SECONDS),
    });
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }

  async createQrCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    });
  }

  verifyCode(secret: string, code: string, now = Date.now()): number | null {
    if (!/^\d{6}$/.test(code)) return null;

    const currentStep = this.getTimeStep(now);
    for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
      const step = currentStep + offset;
      const expected = this.generateCode(secret, step);
      const expectedBuffer = Buffer.from(expected, 'ascii');
      const actualBuffer = Buffer.from(code, 'ascii');
      if (
        expectedBuffer.length === actualBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, actualBuffer)
      ) {
        return step;
      }
    }

    return null;
  }

  getTimeStep(now = Date.now()): number {
    return Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
  }

  private generateCode(secret: string, timeStep: number): string {
    const key = this.decodeBase32(secret);
    const counter = Buffer.alloc(8);
    counter.writeBigInt64BE(BigInt(timeStep), 0);
    const digest = crypto.createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3];
    return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
  }

  private encodeBase32(value: Buffer): string {
    let bits = 0;
    let bitCount = 0;
    let output = '';

    for (const byte of value) {
      bits = (bits << 8) | byte;
      bitCount += 8;
      while (bitCount >= 5) {
        bitCount -= 5;
        output += BASE32_ALPHABET[(bits >> bitCount) & 31];
      }
    }

    if (bitCount > 0) {
      output += BASE32_ALPHABET[(bits << (5 - bitCount)) & 31];
    }

    return output;
  }

  private decodeBase32(value: string): Buffer {
    const normalized = value.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
    let bits = 0;
    let bitCount = 0;
    const output: number[] = [];

    for (const character of normalized) {
      const index = BASE32_ALPHABET.indexOf(character);
      if (index < 0) throw new Error('Invalid TOTP secret');
      bits = (bits << 5) | index;
      bitCount += 5;
      if (bitCount >= 8) {
        bitCount -= 8;
        output.push((bits >> bitCount) & 0xff);
      }
    }

    return Buffer.from(output);
  }
}
