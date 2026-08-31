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
import { spawn } from 'child_process';
import * as archiver from 'archiver';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { SettingsService } from '../settings/settings.service';
import { CryptoService } from '../common/crypto/crypto.service';

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
    private cryptoService: CryptoService,
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

  // ─── 스케줄 관리 ──────────────────────────────────────────────────────────

  scheduleBackup(settings: any) {
    const cronExpression = this.buildCronExpression(settings);
    this.logger.log(`백업 스케줄 등록: ${cronExpression}`);

    try {
      this.schedulerRegistry.deleteCronJob('auto-backup');
    } catch {}

    // 스케줄 시각은 KST 기준. cron 라이브러리에 타임존을 직접 지정해
    // 서버 시간대(UTC 등)와 무관하게 동작하도록 한다.
    const job = new CronJob(
      cronExpression,
      () => {
        this.runScheduledBackup();
      },
      null,
      false,
      'Asia/Seoul',
    );
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
    // 모든 값은 KST 기준. CronJob에 timeZone: 'Asia/Seoul'을 지정하므로 별도 변환 불필요.
    const hour = settings.backupScheduleHour ?? 2;
    const type = settings.backupScheduleType ?? 'daily';
    const day = settings.backupScheduleDay ?? 1;

    if (type === 'weekly') {
      // 0(일)~6(토)
      const dow = ((day % 7) + 7) % 7;
      return `0 ${hour} * * ${dow}`;
    }
    if (type === 'monthly') {
      // 1~28일 (말일 처리는 지원 범위 밖 → 최소 1)
      const dom = day >= 1 && day <= 28 ? day : 1;
      return `0 ${hour} ${dom} * *`;
    }
    return `0 ${hour} * * *`;
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

    try {
      await this.logsService.createServiceLog({
        userId,
        logType: log.status === 'success' ? '정상' : '오류',
        action: '수동 백업 실행',
        description: log.status === 'success'
          ? `백업 성공 (대상: ${log.targets}, 경로: ${log.destinations})`
          : `백업 실패: ${log.errorMessage}`,
        ipAddress,
      });
    } catch (e) {
      this.logger.error('백업 서비스 로그 기록 실패: ' + e.message);
    }

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

      // 로컬 보관이 선택된 경우: 보관 개수 정책 적용
      // 원격 전용인 경우: 방금 만든 파일은 전송용 임시 파일이므로 삭제 (볼륨 무한 증가 방지)
      if (destinations.includes('local')) {
        await this.cleanupOldBackups('db-backup', settings.backupRetentionCount);
        await this.cleanupOldBackups('doc-backup', settings.backupRetentionCount);
      } else {
        for (const p of savedPaths) {
          try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch (e) {
            this.logger.warn(`임시 백업 파일 삭제 실패: ${p} (${e.message})`);
          }
        }
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
      let user: string, pass: string, host: string, port: string, dbname: string;
      try {
        // mysql://user:pass@host:port/dbname?params — 쿼리 파라미터·특수문자 포함 비밀번호 대응
        const u = new URL(dbUrl);
        user = decodeURIComponent(u.username);
        pass = decodeURIComponent(u.password);
        host = u.hostname;
        port = u.port || '3306';
        dbname = u.pathname.replace(/^\//, '');
        if (!user || !host || !dbname) throw new Error('필수 항목 누락');
      } catch (e) {
        reject(new Error(`DATABASE_URL 파싱 실패: ${e.message}`));
        return;
      }

      const outStream = fs.createWriteStream(destPath);

      // 비밀번호는 인자(argv) 대신 환경변수로 전달해 ps/proc 노출을 막는다.
      const mysqldump = spawn('mysqldump', [
        `-h${host}`,
        `-P${port}`,
        `-u${user}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        dbname,
      ], { env: { ...process.env, MYSQL_PWD: pass } });

      const gzip = spawn('gzip', ['-c']);

      mysqldump.stdout.pipe(gzip.stdin);
      gzip.stdout.pipe(outStream);

      let errorOutput = '';
      mysqldump.stderr.on('data', (d) => { errorOutput += d.toString(); });
      gzip.stderr.on('data', (d) => { errorOutput += d.toString(); });

      let mysqldumpCode: number | null = null;
      let gzipCode: number | null = null;
      let streamFinished = false;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        // 실패 시 불완전한 파일을 남기지 않는다.
        try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch {}
        reject(err);
      };

      const finish = () => {
        if (settled) return;
        if (mysqldumpCode === null || gzipCode === null || !streamFinished) return;
        if (mysqldumpCode !== 0) {
          fail(new Error(`mysqldump 실패 (exit ${mysqldumpCode}): ${errorOutput.trim()}`));
          return;
        }
        if (gzipCode !== 0) {
          fail(new Error(`gzip 실패 (exit ${gzipCode}): ${errorOutput.trim()}`));
          return;
        }
        if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
          fail(new Error('DB 백업 파일이 비어 있습니다: ' + errorOutput.trim()));
          return;
        }
        settled = true;
        resolve();
      };

      mysqldump.on('close', (code) => { mysqldumpCode = code ?? 1; finish(); });
      gzip.on('close', (code) => { gzipCode = code ?? 1; finish(); });
      outStream.on('finish', () => { streamFinished = true; finish(); });

      mysqldump.on('error', fail);
      gzip.on('error', fail);
      outStream.on('error', fail);
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
      connectOptions.password = this.cryptoService.safeDecrypt(settings.sftpPassword);
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

    // 설정값이 없거나 잘못된 경우 기본 7개 보관
    const keep = Number.isInteger(retentionCount) && retentionCount > 0 ? retentionCount : 7;

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.gz'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const toDelete = files.slice(keep);
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
