import { Module } from '@nestjs/common';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';
import { AiIntegrationGuard } from './ai-integration.guard';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [AiToolsController],
  providers: [AiToolsService, AiIntegrationGuard],
})
export class AiToolsModule {}
