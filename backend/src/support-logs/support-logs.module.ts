import { Module } from '@nestjs/common';
import { SupportLogsController } from './support-logs.controller';
import { SupportLogsService } from './support-logs.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [SupportLogsController],
  providers: [SupportLogsService],
  exports: [SupportLogsService],
})
export class SupportLogsModule {}
