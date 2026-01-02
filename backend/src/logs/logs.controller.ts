import { Controller, Get, Post, Query, Body, UseGuards, Res, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getClientIp } from '../common/utils/ip.util';

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
    @Req() req?: Request,
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

    // 로그 기록
    try {
      const user = req.user as any;
      const userIpAddress = getClientIp(req);
      await this.service.createServiceLog({
        userId: user.id,
        logType: '정보',
        action: '시스템 로그 엑셀 내보내기',
        description: '시스템 로그를 엑셀로 내보냄',
        ipAddress: userIpAddress,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
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
    @Req() req?: Request,
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

    // 로그 기록
    try {
      const user = req.user as any;
      const userIpAddress = getClientIp(req);
      await this.service.createServiceLog({
        userId: user.id,
        logType: '정보',
        action: '업로드 로그 엑셀 내보내기',
        description: '업로드 로그를 엑셀로 내보냄',
        ipAddress: userIpAddress,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
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
    @Req() req?: Request,
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

    // 로그 기록
    try {
      const user = req.user as any;
      const userIpAddress = getClientIp(req);
      await this.service.createServiceLog({
        userId: user.id,
        logType: '정보',
        action: '로그인 로그 엑셀 내보내기',
        description: '로그인 로그를 엑셀로 내보냄',
        ipAddress: userIpAddress,
      });
    } catch (error) {
      console.error('로그 기록 실패:', error);
    }
  }

  @Post('excel-export')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  async logExcelExport(
    @Body() body: { action: string; description: string },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const ipAddress = getClientIp(req);

    await this.service.createServiceLog({
      userId: user.id,
      logType: '정보',
      action: body.action,
      description: body.description,
      ipAddress,
    });

    return { message: '로그가 기록되었습니다.' };
  }
}
