import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('로그')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly service: LogsService) {}

  @Get('service')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getServiceLogs(
    @Query('logType') logType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getServiceLogs({
      logType,
      action,
      userId: userId ? parseInt(userId) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('login')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getLoginLogs(
    @Query('username') username?: string,
    @Query('logType') logType?: string,
    @Query('searchText') searchText?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getLoginLogs({
      username,
      logType,
      searchText,
      ipAddress,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('system/export')
  @Roles(Role.SUPER_ADMIN)
  async exportSystemLogs(
    @Query('username') username?: string,
    @Query('logType') logType?: string,
    @Query('searchText') searchText?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.exportSystemLogsToExcel({
      username,
      logType,
      searchText,
      ipAddress,
      startDate,
      endDate,
    });

    const filename = `system-logs-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('system')
  @Roles(Role.SUPER_ADMIN)
  getSystemLogs(
    @Query('username') username?: string,
    @Query('logType') logType?: string,
    @Query('searchText') searchText?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getSystemLogs({
      username,
      logType,
      searchText,
      ipAddress,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('upload/export')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async exportUploadLogs(
    @Query('username') username?: string,
    @Query('logType') logType?: string,
    @Query('searchText') searchText?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.exportUploadLogsToExcel({
      username,
      logType,
      searchText,
      ipAddress,
      startDate,
      endDate,
    });

    const filename = `upload-logs-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('upload')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getUploadLogs(
    @Query('username') username?: string,
    @Query('logType') logType?: string,
    @Query('searchText') searchText?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getUploadLogs({
      username,
      logType,
      searchText,
      ipAddress,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('login/export')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async exportLoginLogs(
    @Query('username') username?: string,
    @Query('logType') logType?: string,
    @Query('searchText') searchText?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.exportLoginLogsToExcel({
      username,
      logType,
      searchText,
      ipAddress,
      startDate,
      endDate,
    });

    const filename = `login-logs-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
