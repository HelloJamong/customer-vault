import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  Request,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import { CreateSourceManagementDto, UpdateSourceManagementDto } from './dto/source-management.dto';
import { CreateUpgradePlanDto, UpdateUpgradePlanDto, UpgradeProgressLogDto } from './dto/upgrade-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('고객사')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: '고객사 목록 조회' })
  @ApiQuery({ name: 'contractType', required: false })
  @ApiQuery({ name: 'inspectionCycleType', required: false })
  @ApiQuery({ name: 'engineerId', required: false })
  @ApiQuery({ name: 'salesId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('contractType') contractType?: string,
    @Query('inspectionCycleType') inspectionCycleType?: string,
    @Query('engineerId') engineerId?: string,
    @Query('salesId') salesId?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({
      contractType,
      inspectionCycleType,
      engineerId: engineerId ? parseInt(engineerId) : undefined,
      salesId: salesId ? parseInt(salesId) : undefined,
      search,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: '전체 고객사 요약 조회' })
  getSummary() {
    return this.customersService.getSummary();
  }

  @Get('my')
  @ApiOperation({ summary: '내 담당 고객사 목록 조회' })
  findMyCustomers(@Request() req: any) {
    return this.customersService.findMyCustomers(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '고객사 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '고객사 생성' })
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.customersService.create(createCustomerDto, req.user.id, ipAddress);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '고객사 유지보수 정보 수정 (사내 사용자 공통)' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateCustomerDto: UpdateCustomerDto, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.customersService.update(id, updateCustomerDto, req.user.id, ipAddress, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '고객사 삭제' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.customersService.remove(id, req.user.id, ipAddress);
  }

  // 소스 관리
  @Get(':id/source-management/reveal')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 민감정보 조회 (사내 사용자 공통, 감사 기록)' })
  async revealSourceManagement(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.customersService.revealSourceManagement(id, req.user.id, ipAddress);
  }

  @Get(':id/source-management')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 정보 조회' })
  getSourceManagement(@Param('id', ParseIntPipe) id: number) {
    // 조회는 로그인한 모든 내부 사용자에게 허용 (담당 여부 무관). 서버 접속 비밀번호 등은 마스킹되어 반환됨.
    return this.customersService.getSourceManagement(id);
  }

  @Get(':id/source-management/edit')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 정보 조회 (자격증명 포함, 사내 사용자 공통, 감사 기록됨)' })
  async getSourceManagementForEdit(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.customersService.getSourceManagementForEdit(id, req.user.id, ipAddress);
  }

  @Post(':id/source-management')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 정보 생성' })
  async createSourceManagement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSourceManagementDto,
    @Request() req: any,
  ) {
    const ipAddress = getClientIp(req);
    return this.customersService.createSourceManagement(id, dto, req.user.id, ipAddress);
  }

  @Put(':id/source-management')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 정보 수정' })
  async updateSourceManagement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSourceManagementDto,
    @Request() req: any,
  ) {
    const ipAddress = getClientIp(req);
    return this.customersService.updateSourceManagement(id, dto, req.user.id, ipAddress);
  }

  // 업그레이드 계획
  @Get(':id/upgrade-plan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '업그레이드 계획 조회' })
  getUpgradePlan(@Param('id', ParseIntPipe) id: number) {
    // 조회는 로그인한 모든 내부 사용자에게 허용 (담당 여부 무관)
    return this.customersService.getUpgradePlan(id);
  }

  @Post(':id/upgrade-plan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '업그레이드 계획 생성' })
  async createUpgradePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateUpgradePlanDto,
    @Request() req: any,
  ) {
    const ipAddress = getClientIp(req);
    return this.customersService.createUpgradePlan(id, dto, req.user.id, ipAddress);
  }

  @Put(':id/upgrade-plan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '업그레이드 계획 수정' })
  async updateUpgradePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUpgradePlanDto,
    @Request() req: any,
  ) {
    const ipAddress = getClientIp(req);
    return this.customersService.updateUpgradePlan(id, dto, req.user.id, ipAddress);
  }

  // 업그레이드 진척 현황
  @Post(':id/upgrade-plan/progress-logs')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '업그레이드 진척 현황 추가' })
  createUpgradeProgressLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpgradeProgressLogDto,
    @Request() req: any,
  ) {
    return this.customersService.createUpgradeProgressLog(id, dto, req.user, getClientIp(req));
  }

  @Put(':id/upgrade-plan/progress-logs/:logId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '업그레이드 진척 현황 수정 (본인 기록 또는 관리자)' })
  updateUpgradeProgressLog(
    @Param('id', ParseIntPipe) id: number,
    @Param('logId', ParseIntPipe) logId: number,
    @Body() dto: UpgradeProgressLogDto,
    @Request() req: any,
  ) {
    return this.customersService.updateUpgradeProgressLog(id, logId, dto, req.user, getClientIp(req));
  }

  @Delete(':id/upgrade-plan/progress-logs/:logId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '업그레이드 진척 현황 삭제 (본인 기록 또는 관리자)' })
  deleteUpgradeProgressLog(
    @Param('id', ParseIntPipe) id: number,
    @Param('logId', ParseIntPipe) logId: number,
    @Request() req: any,
  ) {
    return this.customersService.deleteUpgradeProgressLog(id, logId, req.user, getClientIp(req));
  }
}
