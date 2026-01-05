import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('대시보드')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '대시보드 통계 조회' })
  getStats(@Request() req) {
    return this.service.getStats(req.user.id, req.user.role);
  }

  @Get('incomplete-inspections')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '점검 미완료 고객사 목록 조회 (super_admin, admin만 가능)' })
  getIncompleteInspections() {
    return this.service.getIncompleteInspections();
  }
}
