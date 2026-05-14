import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { LogsModule } from '../logs/logs.module';
import { SettingsModule } from '../settings/settings.module';
import { CryptoModule } from '../common/crypto/crypto.module';

@Module({
  imports: [ScheduleModule.forRoot(), LogsModule, SettingsModule, CryptoModule],
  controllers: [BackupController],
  providers: [
    BackupService,
    {
      provide: 'BACKUP_SERVICE',
      useExisting: BackupService,
    },
  ],
  exports: [BackupService, 'BACKUP_SERVICE'],
})
export class BackupModule {}
