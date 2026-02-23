import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('백업 관리')
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('run')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '즉시 백업 실행' })
  async runBackup(@Request() req) {
    const ipAddress = getClientIp(req);
    return this.backupService.runBackup(req.user.id, ipAddress);
  }

  @Get('logs')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '백업 이력 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBackupLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.backupService.getBackupLogs(parseInt(page), parseInt(limit));
  }

  @Get('logs/:id/download')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '백업 파일 다운로드' })
  async downloadBackup(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { filePath, filename } = await this.backupService.getBackupFilePath(id);
    res.download(filePath, filename);
  }
}
