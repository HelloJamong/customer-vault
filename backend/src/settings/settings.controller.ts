import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('시스템 설정')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '시스템 설정 조회' })
  getSettings() {
    return this.service.getSettings();
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '시스템 설정 업데이트' })
  updateSettings(@Body() data: UpdateSettingsDto, @Request() req) {
    return this.service.updateSettings(data, req.user.id);
  }
}
