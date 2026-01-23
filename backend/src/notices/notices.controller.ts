import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('공지사항')
@Controller('notices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  @ApiOperation({ summary: '공지사항 목록 조회 (모든 사용자)' })
  findAll() {
    return this.noticesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '공지사항 상세 조회 (모든 사용자)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.noticesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '공지사항 작성 (관리자 이상)' })
  create(@Body() createNoticeDto: CreateNoticeDto, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.noticesService.create(
      createNoticeDto,
      req.user.id,
      ipAddress,
    );
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '공지사항 수정 (관리자 이상)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoticeDto: UpdateNoticeDto,
    @Request() req: any,
  ) {
    const ipAddress = getClientIp(req);
    return this.noticesService.update(id, updateNoticeDto, req.user.id, ipAddress);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '공지사항 삭제 (관리자 이상)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const ipAddress = getClientIp(req);
    return this.noticesService.remove(id, req.user.id, ipAddress);
  }
}
