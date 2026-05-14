import { Module, forwardRef } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { LogsModule } from '../logs/logs.module';
import { CryptoModule } from '../common/crypto/crypto.module';

@Module({
  imports: [LogsModule, CryptoModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
