import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.systemSettings.create({ data: {} });
    }

    return settings;
  }

  async updateSettings(data: UpdateSettingsDto, userId: number) {
    this.validateSettings(data);

    const settings = await this.getSettings();

    const updated = await this.prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    return {
      message: '시스템 설정이 저장되었습니다.',
      updatedAt: updated.updatedAt,
    };
  }

  private validateSettings(data: UpdateSettingsDto) {
    if (data.passwordExpiryDays !== undefined) {
      const validDays = [7, 30, 60, 90];
      if (!validDays.includes(data.passwordExpiryDays)) {
        throw new BadRequestException(
          '패스워드 변경 주기는 7, 30, 60, 90일 중 하나여야 합니다.',
        );
      }
    }

    if (data.accountLockMinutes !== undefined) {
      if (data.accountLockMinutes % 5 !== 0) {
        throw new BadRequestException(
          '계정 잠금 시간은 5분 단위로 설정해야 합니다.',
        );
      }
    }
  }
}
