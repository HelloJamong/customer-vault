import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { LogsModule } from '../logs/logs.module';
import { SettingsModule } from '../settings/settings.module';
import { CryptoModule } from '../common/crypto/crypto.module';
import { BackupFileCryptoService } from './backup-file-crypto.service';

@Module({
  imports: [ScheduleModule.forRoot(), LogsModule, SettingsModule, CryptoModule],
  controllers: [BackupController],
  providers: [
    BackupService,
    BackupFileCryptoService,
    {
      provide: 'BACKUP_SERVICE',
      useExisting: BackupService,
    },
  ],
  exports: [BackupService, 'BACKUP_SERVICE'],
})
export class BackupModule {}
