import { Controller, Get, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InspectionStatusService } from './inspection-status.service';

@ApiTags('inspection-status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspection-status')
export class InspectionStatusController {
  constructor(
    private readonly inspectionStatusService: InspectionStatusService,
  ) {}

  @Get('missing')
  @Roles('super_admin', 'admin')
  @ApiOperation({
    summary: '누락된 점검서 조회',
    description:
      '점검 주기 기준으로 마지막 점검일 이후 기간이 지난 고객사의 누락된 점검서를 조회합니다.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: '조회 연도 (기본값: 현재 연도)',
    type: Number,
  })
  async getMissingInspections(
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ): Promise<{
    customers: Array<{
      id: number;
      name: string;
      lastInspectionDate: string | null;
      missingCount: number;
      engineer: { name: string } | null;
      engineerSub: { name: string } | null;
      missingTargets: Array<{
        targetId: number;
        targetType: string;
        customName: string | null;
        productName: string | null;
        lastInspectionDate: string | null;
        missingPeriod: string;
        expectedLabel: string;
      }>;
    }>;
  }> {
    return this.inspectionStatusService.getMissingInspections(year);
  }
}
