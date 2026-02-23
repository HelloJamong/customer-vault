import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import * as archiver from 'archiver';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { SettingsService } from '../settings/settings.service';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64); // 32바이트 hex
const IV_LENGTH = 16;

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = process.env.BACKUP_DIR || '/app/backups';
  private readonly uploadsDir = process.env.UPLOAD_DIR || '/app/uploads';

  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
    private settingsService: SettingsService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    try {
      const settings = await this.settingsService.getSettings();
      if (settings.backupEnabled) {
        this.scheduleBackup(settings);
      }
    } catch (e) {
      this.logger.warn('백업 스케줄 초기화 실패: ' + e.message);
    }
  }

  // ─── 암호화 / 복호화 ───────────────────────────────────────────────────────

  encryptPassword(plainText: string): string {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decryptPassword(encryptedText: string): string {
    const [ivHex, encHex] = encryptedText.split(':');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString();
  }

  // ─── 스케줄 관리 ──────────────────────────────────────────────────────────

  scheduleBackup(settings: any) {
    const cronExpression = this.buildCronExpression(settings);
    this.logger.log(`백업 스케줄 등록: ${cronExpression}`);

    try {
      this.schedulerRegistry.deleteCronJob('auto-backup');
    } catch {}

    const job = new CronJob(cronExpression, () => {
      this.runScheduledBackup();
    });
    this.schedulerRegistry.addCronJob('auto-backup', job);
    job.start();
  }

  cancelSchedule() {
    try {
      this.schedulerRegistry.deleteCronJob('auto-backup');
      this.logger.log('백업 스케줄 취소됨');
    } catch {}
  }

  private buildCronExpression(settings: any): string {
    const hour = settings.backupScheduleHour ?? 2;
    const type = settings.backupScheduleType ?? 'daily';
    const day = settings.backupScheduleDay ?? 1;

    if (type === 'daily') {
      return `0 ${hour} * * *`;
    } else if (type === 'weekly') {
      return `0 ${hour} * * ${day}`;
    } else {
      // monthly
      const dayOfMonth = day >= 1 && day <= 28 ? day : 1;
      return `0 ${hour} ${dayOfMonth} * *`;
    }
  }

  // ─── 자동 백업 실행 ────────────────────────────────────────────────────────

  async runScheduledBackup() {
    this.logger.log('자동 백업 실행 시작');
    try {
      await this.executeBackup(null, 'auto');
    } catch (e) {
      this.logger.error('자동 백업 실패: ' + e.message);
    }
  }

  // ─── 수동 백업 실행 ────────────────────────────────────────────────────────

  async runBackup(userId: number, ipAddress: string) {
    const log = await this.executeBackup(userId, 'manual');

    await this.logsService.createServiceLog({
      userId,
      logType: log.status === 'success' ? '정상' : '오류',
      action: '수동 백업 실행',
      description: log.status === 'success'
        ? `백업 성공 (대상: ${log.targets}, 경로: ${log.destinations})`
        : `백업 실패: ${log.errorMessage}`,
      ipAddress,
    });

    return log;
  }

  // ─── 백업 핵심 로직 ────────────────────────────────────────────────────────

  private async executeBackup(userId: number | null, type: 'manual' | 'auto') {
    const settings = await this.settingsService.getSettings();

    const targets: string[] = [];
    if (settings.backupTargetDb) targets.push('db');
    if (settings.backupTargetDocs) targets.push('docs');

    const destinations: string[] = [];
    if (settings.backupDestLocal) destinations.push('local');
    if (settings.backupDestRemote) destinations.push('remote');

    const log = await this.prisma.backupLog.create({
      data: {
        status: 'running',
        type,
        targets: targets.join(','),
        destinations: destinations.join(','),
        startedAt: new Date(),
        createdBy: userId,
      },
    });

    // KST(UTC+9) 기준 타임스탬프
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');

    let localDbPath: string | null = null;
    let localDocsPath: string | null = null;
    let totalSize = 0;
    const savedPaths: string[] = [];

    try {
      // 로컬 디렉토리 준비
      const dbBackupDir = path.join(this.backupDir, 'db-backup');
      const docBackupDir = path.join(this.backupDir, 'doc-backup');
      fs.mkdirSync(dbBackupDir, { recursive: true });
      fs.mkdirSync(docBackupDir, { recursive: true });

      // DB 백업
      if (targets.includes('db')) {
        const filename = `db_${timestamp}.sql.gz`;
        const destPath = path.join(dbBackupDir, filename);
        await this.backupDatabase(destPath);
        localDbPath = destPath;
        totalSize += fs.statSync(destPath).size;
        savedPaths.push(destPath);
        this.logger.log(`DB 백업 완료: ${destPath}`);
      }

      // 문서 백업
      if (targets.includes('docs')) {
        const filename = `docs_${timestamp}.tar.gz`;
        const destPath = path.join(docBackupDir, filename);
        await this.backupDocuments(destPath);
        localDocsPath = destPath;
        totalSize += fs.statSync(destPath).size;
        savedPaths.push(destPath);
        this.logger.log(`문서 백업 완료: ${destPath}`);
      }

      // 원격 SFTP 전송
      if (destinations.includes('remote') && settings.sftpHost) {
        if (localDbPath) {
          await this.transferToRemote(
            localDbPath,
            settings,
            'db-backup',
          );
        }
        if (localDocsPath) {
          await this.transferToRemote(
            localDocsPath,
            settings,
            'doc-backup',
          );
        }
      }

      // 보관 개수 정책 적용 (로컬)
      if (destinations.includes('local')) {
        await this.cleanupOldBackups('db-backup', settings.backupRetentionCount);
        await this.cleanupOldBackups('doc-backup', settings.backupRetentionCount);
      }

      // DB 이력 업데이트
      const updated = await this.prisma.backupLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          filePath: savedPaths.join(','),
          fileSize: BigInt(totalSize),
          completedAt: new Date(),
        },
      });

      return { ...updated, fileSize: updated.fileSize?.toString() };
    } catch (error) {
      this.logger.error('백업 실행 오류: ' + error.message);

      const updated = await this.prisma.backupLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      return { ...updated, fileSize: updated.fileSize?.toString() };
    }
  }

  // ─── DB 백업 ──────────────────────────────────────────────────────────────

  private backupDatabase(destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbUrl = process.env.DATABASE_URL || '';
      // mysql://user:pass@host:port/dbname
      const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!match) {
        reject(new Error('DATABASE_URL 파싱 실패'));
        return;
      }
      const [, user, pass, host, port, dbname] = match;

      const outStream = fs.createWriteStream(destPath);

      const mysqldump = spawn('mysqldump', [
        `-h${host}`,
        `-P${port}`,
        `-u${user}`,
        `-p${pass}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        dbname,
      ]);

      const gzip = spawn('gzip', ['-c']);

      mysqldump.stdout.pipe(gzip.stdin);
      gzip.stdout.pipe(outStream);

      let errorOutput = '';
      mysqldump.stderr.on('data', (d) => { errorOutput += d.toString(); });
      gzip.stderr.on('data', (d) => { errorOutput += d.toString(); });

      outStream.on('finish', () => {
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
          resolve();
        } else {
          reject(new Error('DB 백업 파일이 생성되지 않았습니다: ' + errorOutput));
        }
      });

      mysqldump.on('error', reject);
      gzip.on('error', reject);
      outStream.on('error', reject);
    });
  }

  // ─── 문서 백업 ────────────────────────────────────────────────────────────

  private backupDocuments(destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.uploadsDir)) {
        // 폴더 없으면 빈 아카이브 생성
        const output = fs.createWriteStream(destPath);
        const archive = archiver('tar', { gzip: true });
        archive.pipe(output);
        output.on('close', resolve);
        archive.on('error', reject);
        archive.finalize();
        return;
      }

      const output = fs.createWriteStream(destPath);
      const archive = archiver('tar', { gzip: true });

      archive.pipe(output);
      archive.directory(this.uploadsDir, false);

      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });
  }

  // ─── SFTP 전송 ────────────────────────────────────────────────────────────

  private async transferToRemote(
    localPath: string,
    settings: any,
    subDir: 'db-backup' | 'doc-backup',
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SftpClient = require('ssh2-sftp-client');
    const sftp = new SftpClient();

    const [host, portStr] = (settings.sftpHost as string).split(':');
    const port = parseInt(portStr || '22');

    const connectOptions: any = {
      host,
      port,
      username: settings.sftpUsername,
    };

    if (settings.sftpKeyPath && fs.existsSync(settings.sftpKeyPath)) {
      connectOptions.privateKey = fs.readFileSync(settings.sftpKeyPath);
    } else if (settings.sftpPassword) {
      connectOptions.password = this.decryptPassword(settings.sftpPassword);
    }

    try {
      await sftp.connect(connectOptions);

      const remoteBase = settings.sftpRemotePath || '/backup';
      const remoteDir = `${remoteBase}/${subDir}`;

      // 디렉토리 존재 확인 후 생성
      const exists = await sftp.exists(remoteDir);
      if (!exists) {
        await sftp.mkdir(remoteDir, true);
      }

      const filename = path.basename(localPath);
      const remotePath = `${remoteDir}/${filename}`;

      await sftp.put(localPath, remotePath);
      this.logger.log(`SFTP 전송 완료: ${remotePath}`);
    } finally {
      await sftp.end();
    }
  }

  // ─── 보관 정책 (로컬) ─────────────────────────────────────────────────────

  private async cleanupOldBackups(subDir: string, retentionCount: number) {
    const dir = path.join(this.backupDir, subDir);
    if (!fs.existsSync(dir)) return;

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.gz'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const toDelete = files.slice(retentionCount);
    for (const file of toDelete) {
      fs.unlinkSync(path.join(dir, file.name));
      this.logger.log(`오래된 백업 삭제: ${file.name}`);
    }
  }

  // ─── 이력 조회 ────────────────────────────────────────────────────────────

  async getBackupLogs(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.backupLog.findMany({
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, username: true } },
        },
      }),
      this.prisma.backupLog.count(),
    ]);

    return {
      data: data.map((log) => ({
        ...log,
        fileSize: log.fileSize?.toString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── 파일 다운로드 경로 반환 ──────────────────────────────────────────────

  async getBackupFilePath(id: number): Promise<{ filePath: string; filename: string }> {
    const log = await this.prisma.backupLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('백업 이력을 찾을 수 없습니다.');
    if (!log.filePath) throw new NotFoundException('다운로드할 파일이 없습니다.');

    // filePath에 여러 파일이 있을 수 있으므로 첫 번째 파일 반환
    const firstPath = log.filePath.split(',')[0].trim();
    if (!fs.existsSync(firstPath)) {
      throw new NotFoundException('백업 파일이 존재하지 않습니다.');
    }

    return {
      filePath: firstPath,
      filename: path.basename(firstPath),
    };
  }
}
