import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';

const MAGIC = Buffer.from('CVBK1', 'ascii');
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class BackupFileCryptoService {
  private getKey(): Buffer {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        'BACKUP_ENCRYPTION_KEY 환경 변수가 유효하지 않습니다. 64자리 hex 문자열이 필요합니다.',
      );
    }
    return Buffer.from(key, 'hex');
  }

  async encryptFile(
    inputPath: string,
    outputPath = `${inputPath}.enc`,
    removeInput = true,
  ): Promise<string> {
    const key = this.getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const temporaryPath = `${outputPath}.tmp-${crypto.randomBytes(8).toString('hex')}`;

    try {
      await fsp.writeFile(temporaryPath, Buffer.concat([MAGIC, iv]), { mode: 0o600 });
      await pipeline(
        fs.createReadStream(inputPath),
        cipher,
        fs.createWriteStream(temporaryPath, { flags: 'a', mode: 0o600 }),
      );
      await fsp.appendFile(temporaryPath, cipher.getAuthTag());
      await fsp.chmod(temporaryPath, 0o600);
      await fsp.rename(temporaryPath, outputPath);

      if (removeInput) {
        await fsp.unlink(inputPath);
      }
      return outputPath;
    } catch (error) {
      await fsp.unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }

  async decryptFile(
    inputPath: string,
    outputPath = inputPath.endsWith('.enc') ? inputPath.slice(0, -4) : `${inputPath}.decrypted`,
    removeInput = false,
  ): Promise<string> {
    const key = this.getKey();
    const headerLength = MAGIC.length + IV_LENGTH;
    const fileSize = (await fsp.stat(inputPath)).size;

    if (fileSize < headerLength + AUTH_TAG_LENGTH) {
      throw new Error(`백업 파일 형식이 올바르지 않습니다: ${path.basename(inputPath)}`);
    }

    const header = Buffer.alloc(headerLength);
    const handle = await fsp.open(inputPath, 'r');
    try {
      await handle.read(header, 0, headerLength, 0);
    } finally {
      await handle.close();
    }

    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error(`백업 파일 형식이 올바르지 않습니다: ${path.basename(inputPath)}`);
    }

    const authTag = Buffer.alloc(AUTH_TAG_LENGTH);
    const tagHandle = await fsp.open(inputPath, 'r');
    try {
      await tagHandle.read(authTag, 0, AUTH_TAG_LENGTH, fileSize - AUTH_TAG_LENGTH);
    } finally {
      await tagHandle.close();
    }

    const iv = header.subarray(MAGIC.length, headerLength);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const temporaryPath = `${outputPath}.tmp-${crypto.randomBytes(8).toString('hex')}`;

    try {
      await pipeline(
        fs.createReadStream(inputPath, {
          start: headerLength,
          end: fileSize - AUTH_TAG_LENGTH - 1,
        }),
        decipher,
        fs.createWriteStream(temporaryPath, { mode: 0o600 }),
      );
      await fsp.chmod(temporaryPath, 0o600);
      await fsp.rename(temporaryPath, outputPath);

      if (removeInput) {
        await fsp.unlink(inputPath);
      }
    } catch (error) {
      await fsp.unlink(temporaryPath).catch(() => {});
      throw error;
    }
    return outputPath;
  }
}
