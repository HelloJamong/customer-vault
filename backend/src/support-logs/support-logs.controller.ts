import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupportLogsService } from './support-logs.service';
import { CreateSupportLogDto } from './dto/create-support-log.dto';
import { UpdateSupportLogDto } from './dto/update-support-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('지원 로그')
@Controller('support-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupportLogsController {
  constructor(private readonly supportLogsService: SupportLogsService) {}

  @Get('customer/:customerId')
  @ApiOperation({ summary: '고객사별 지원 로그 목록 조회' })
  findAllByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.supportLogsService.findAllByCustomer(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: '지원 로그 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supportLogsService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '지원 로그 생성' })
  create(@Body() createDto: CreateSupportLogDto, @Request() req: any) {
    return this.supportLogsService.create(createDto, req.user.id, req.ip);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '지원 로그 수정' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSupportLogDto,
    @Request() req: any,
  ) {
    return this.supportLogsService.update(id, updateDto, req.user.id, req.ip);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: '지원 로그 삭제' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportLogsService.remove(id, req.user.id, req.ip);
  }
}
