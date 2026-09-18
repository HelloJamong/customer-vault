import { Module } from '@nestjs/common';
import { InspectionTargetsService } from './inspection-targets.service';
import { InspectionTargetsController } from './inspection-targets.controller';
import { FileSecurityService } from '../common/file-security/file-security.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [InspectionTargetsController],
  providers: [InspectionTargetsService, FileSecurityService],
  exports: [InspectionTargetsService],
})
export class InspectionTargetsModule {}
