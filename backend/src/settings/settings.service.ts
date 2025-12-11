import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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

  async updateSettings(data: any, userId: number) {
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
}
