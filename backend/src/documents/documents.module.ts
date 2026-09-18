import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { LogsModule } from '../logs/logs.module';
import { FileSecurityService } from '../common/file-security/file-security.service';

@Module({
  imports: [LogsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, FileSecurityService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
