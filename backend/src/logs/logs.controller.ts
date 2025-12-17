import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  getLoginAttempts(
    @Query('userId') userId?: string,
    @Query('success') success?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getLoginAttempts({
      userId: userId ? parseInt(userId) : undefined,
      success: success ? success === 'true' : undefined,
      startDate,
      endDate,
    });
  }
}
