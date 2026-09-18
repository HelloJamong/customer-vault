import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as net from 'net';
import * as path from 'path';

export type SupportedUploadType = 'pdf' | 'doc' | 'docx' | 'hwp' | 'hwpx' | 'ppt' | 'pptx';
export type FileSecurityFailureReason = 'format_mismatch' | 'malware_detected' | 'scanner_unavailable';

export class FileSecurityException extends BadRequestException {
  readonly fileSecurity = true;

  constructor(message: string, readonly reason: FileSecurityFailureReason) {
    super(message);
  }
}

export class FileSecurityUnavailableException extends ServiceUnavailableException {
  readonly fileSecurity = true;
  readonly reason: FileSecurityFailureReason = 'scanner_unavailable';

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
  }
}

export function getFileSecurityFailureReason(error: unknown): FileSecurityFailureReason | null {
  if (typeof error !== 'object' || error === null || !('fileSecurity' in error)) return null;
  return (error as { reason?: FileSecurityFailureReason }).reason || null;
}

const SUPPORTED_EXTENSIONS = new Set<SupportedUploadType>([
  'pdf',
  'doc',
  'docx',
  'hwp',
  'hwpx',
  'ppt',
  'pptx',
]);

const LEGACY_OLE_TYPES = new Set<SupportedUploadType>(['doc', 'hwp', 'ppt']);
const ZIP_TYPES = new Set<SupportedUploadType>(['docx', 'hwpx', 'pptx']);

const PDF_SIGNATURE = Buffer.from('%PDF-');
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export function getUploadType(filename: string): SupportedUploadType {
  const extension = path.extname(filename || '').toLowerCase().replace('.', '') as SupportedUploadType;

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new FileSecurityException('허용되지 않은 파일 형식입니다.', 'format_mismatch');
  }

  return extension;
}

export function validateUploadSignature(filename: string, content: Buffer): SupportedUploadType {
  const type = getUploadType(filename);

  if (type === 'pdf' && !content.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw new FileSecurityException('파일 내용이 PDF 형식과 일치하지 않습니다.', 'format_mismatch');
  }

  if (LEGACY_OLE_TYPES.has(type) && !content.subarray(0, OLE_SIGNATURE.length).equals(OLE_SIGNATURE)) {
    throw new FileSecurityException('파일 내용이 선택한 문서 형식과 일치하지 않습니다.', 'format_mismatch');
  }

  if (ZIP_TYPES.has(type) && (!isZip(content) || !hasExpectedZipEntry(type, content))) {
    throw new FileSecurityException('파일 내용이 선택한 문서 형식과 일치하지 않습니다.', 'format_mismatch');
  }

  return type;
}

function isZip(content: Buffer): boolean {
  return (
    content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  );
}

function hasExpectedZipEntry(type: SupportedUploadType, content: Buffer): boolean {
  const expectedDirectory = type === 'docx'
    ? 'word/'
    : type === 'pptx'
      ? 'ppt/'
      : 'contents/';

  // ZIP 중앙 디렉터리의 파일명은 압축되지 않으므로 전체 압축 해제 없이 확인할 수 있다.
  return content.toString('latin1').toLowerCase().includes(expectedDirectory);
}

@Injectable()
export class FileSecurityService {
  // 운영 환경에서는 설정 실수로 ClamAV 검사를 끌 수 없도록 강제한다.
  private readonly enabled = process.env.NODE_ENV === 'production' || process.env.CLAMAV_ENABLED !== 'false';
  private readonly host = process.env.CLAMAV_HOST || 'clamav';
  private readonly port = Number(process.env.CLAMAV_PORT || 3310);
  private readonly timeoutMs = Number(process.env.CLAMAV_SCAN_TIMEOUT_MS || 30000);

  async inspectFile(filename: string, filepath: string): Promise<void> {
    const content = await fsp.readFile(filepath);
    validateUploadSignature(filename, content);
    await this.scan('file', filepath);
  }

  async inspectBuffer(filename: string, content: Buffer): Promise<void> {
    validateUploadSignature(filename, content);
    await this.scan('buffer', content);
  }

  private async scan(sourceType: 'file' | 'buffer', source: string | Buffer): Promise<void> {
    if (!this.enabled) {
      return;
    }

    let result: 'clean' | 'infected';
    try {
      result = await this.scanWithClamAv(sourceType, source);
    } catch (error) {
      // 악성코드 검사를 우회한 채 파일을 저장하지 않도록 fail-closed 정책을 사용한다.
      throw new FileSecurityUnavailableException(
        '악성코드 검사 서비스를 사용할 수 없어 파일을 업로드할 수 없습니다.',
        { cause: error as Error },
      );
    }

    if (result === 'infected') {
      throw new FileSecurityException('악성코드가 탐지되어 파일 업로드가 차단되었습니다.', 'malware_detected');
    }
  }

  private scanWithClamAv(sourceType: 'file' | 'buffer', source: string | Buffer): Promise<'clean' | 'infected'> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';
      let settled = false;

      const finish = (error?: Error, result?: 'clean' | 'infected') => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve(result as 'clean' | 'infected');
      };

      socket.setTimeout(this.timeoutMs, () => {
        finish(new Error(`ClamAV scan timed out after ${this.timeoutMs}ms`));
      });
      socket.on('error', (error) => finish(error));
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
        const hasStatus = response.includes('FOUND') || response.includes('OK');
        const hasTerminator = response.includes('\n') || response.includes(String.fromCharCode(0));
        if (hasStatus && hasTerminator) {
          if (response.includes('FOUND')) finish(undefined, 'infected');
          else if (response.includes('OK')) finish(undefined, 'clean');
          else finish(new Error(`Unexpected ClamAV response: ${response.trim()}`));
        }
      });
      socket.on('close', () => {
        if (!settled) finish(new Error(`ClamAV closed the connection: ${response.trim()}`));
      });

      socket.connect(this.port, this.host, () => {
        void this.sendStream(socket, sourceType, source).catch((error: Error) => finish(error));
      });
    });
  }

  private async sendStream(socket: net.Socket, sourceType: 'file' | 'buffer', source: string | Buffer): Promise<void> {
    await this.writeChunk(socket, Buffer.from('zINSTREAM\0', 'ascii'));

    const input = sourceType === 'file'
      ? fs.createReadStream(source as string, { highWaterMark: 64 * 1024 })
      : [source as Buffer];

    if (Array.isArray(input)) {
      for (const chunk of input) {
        await this.writeFramedChunk(socket, chunk);
      }
    } else {
      for await (const chunk of input) {
        await this.writeFramedChunk(socket, Buffer.from(chunk));
      }
    }

    await this.writeChunk(socket, Buffer.alloc(4));
  }

  private async writeFramedChunk(socket: net.Socket, chunk: Buffer): Promise<void> {
    const header = Buffer.alloc(4);
    header.writeUInt32BE(chunk.length, 0);
    await this.writeChunk(socket, Buffer.concat([header, chunk]));
  }

  private writeChunk(socket: net.Socket, chunk: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (error?: Error) => {
        if (settled) return;
        settled = true;
        socket.removeListener('error', onError);
        socket.removeListener('drain', onDrain);
        if (error) reject(error);
        else resolve();
      };
      const onError = (error: Error) => settle(error);
      const onDrain = () => settle();

      socket.once('error', onError);
      const written = socket.write(chunk, () => settle());
      if (!written) {
        socket.once('drain', onDrain);
      }
    });
  }
}
