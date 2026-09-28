import { Controller, Get, Header, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiIntegrationGuard } from './ai-integration.guard';
import { AiToolsService } from './ai-tools.service';
import { CustomerSearchDto } from './dto/customer-search.dto';
import { UnresolvedSupportLogsDto } from './dto/unresolved-support-logs.dto';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('AI 연동 도구')
@ApiBearerAuth()
@Controller('ai-tools')
@UseGuards(AiIntegrationGuard)
@Throttle({ global: { limit: 60, ttl: 60000 } })
export class AiToolsController {
  constructor(private readonly aiToolsService: AiToolsService) {}

  @Get('customers/search')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '고객사 연락 담당자 및 사내 담당자 검색 (AI 연동 전용, 읽기 전용)' })
  searchCustomers(@Query() query: CustomerSearchDto, @Request() req: any) {
    return this.aiToolsService.searchCustomers(query.name, getClientIp(req));
  }

  @Get('support-logs/unresolved')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '미조치 지원 로그 조회 (AI 연동 전용, 읽기 전용)' })
  findUnresolvedSupportLogs(@Query() query: UnresolvedSupportLogsDto, @Request() req: any) {
    return this.aiToolsService.findUnresolvedSupportLogs(query, getClientIp(req));
  }
}
