import { Controller, Get, Patch, Body, UseGuards, Request, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('시스템 설정')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  private backupService: any;

  constructor(
    private readonly service: SettingsService,
    @Optional() @Inject('BACKUP_SERVICE') backupServiceRef?: any,
  ) {
    this.backupService = backupServiceRef;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '시스템 설정 조회' })
  getSettings() {
    return this.service.getSettings();
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '시스템 설정 업데이트' })
  async updateSettings(@Body() data: UpdateSettingsDto, @Request() req) {
    const ipAddress = getClientIp(req);
    const result = await this.service.updateSettings(data, req.user.id, ipAddress);

    // 백업 스케줄 관련 설정이 변경된 경우 스케줄 재설정
    if (result.backupScheduleChanged && this.backupService) {
      const updatedSettings = result.updatedSettings;
      if (updatedSettings.backupEnabled) {
        this.backupService.scheduleBackup(updatedSettings);
      } else {
        this.backupService.cancelSchedule();
      }
    }

    return { message: result.message, updatedAt: result.updatedAt };
  }
}
