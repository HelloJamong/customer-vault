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
  @ApiOperation({ summary: '고객사 정보 수정' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateCustomerDto: UpdateCustomerDto, @Request() req: any) {
    await this.customersService.assertCustomerAssignment(id, req.user.id, req.user.role);
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
  @Get(':id/source-management')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 정보 조회' })
  getSourceManagement(@Param('id', ParseIntPipe) id: number) {
    // 조회는 로그인한 모든 내부 사용자에게 허용 (담당 여부 무관)
    return this.customersService.getSourceManagement(id);
  }

  @Post(':id/source-management')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '소스 관리 정보 생성' })
  async createSourceManagement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSourceManagementDto,
    @Request() req: any,
  ) {
    await this.customersService.assertCustomerAssignment(id, req.user.id, req.user.role);
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
    await this.customersService.assertCustomerAssignment(id, req.user.id, req.user.role);
    const ipAddress = getClientIp(req);
    return this.customersService.updateSourceManagement(id, dto, req.user.id, ipAddress);
  }
}
