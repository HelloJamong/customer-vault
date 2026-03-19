import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingMinutesService } from './meeting-minutes.service';
import { CreateMeetingMinutesDto } from './dto/create-meeting-minutes.dto';
import { UpdateMeetingMinutesDto } from './dto/update-meeting-minutes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('회의록')
@Controller('meeting-minutes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MeetingMinutesController {
  constructor(private readonly service: MeetingMinutesService) {}

  @Get('customer/:customerId')
  @ApiOperation({ summary: '고객사별 회의록 목록 조회' })
  findAll(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.service.findAllByCustomer(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: '회의록 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post('customer/:customerId')
  @ApiOperation({ summary: '회의록 작성' })
  create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateMeetingMinutesDto,
    @Request() req: any,
  ) {
    return this.service.create(customerId, dto, req.user.id, getClientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: '회의록 수정' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeetingMinutesDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.id, getClientIp(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: '회의록 삭제' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.id, getClientIp(req));
  }
}
