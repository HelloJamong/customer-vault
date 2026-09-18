import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getInitialAdminPassword } from '../config/initial-password';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.ensureDefaultAdmin();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 빈 데이터베이스 최초 기동 시에만 기본 설정과 admin 계정을 자동 생성한다.
   */
  private async ensureDefaultAdmin() {
    const userCount = await this.user.count();
    // 시스템 설정 존재 여부 확인 및 생성
    const settings = await this.systemSettings.findFirst();
    if (!settings) {
      const initialPassword = getInitialAdminPassword();
      await this.systemSettings.create({
        data: {
          defaultPassword: initialPassword,
        },
      });
    }

    // 기존 계정이 있으면 스킵
    if (userCount > 0) return;

    const passwordHash = await bcrypt.hash(getInitialAdminPassword(), 12);

    await this.user.create({
      data: {
        username: 'admin',
        name: 'admin',
        email: 'admin@example.com',
        role: 'super_admin',
        passwordHash,
        isActive: true,
        isFirstLogin: true,
      },
    });
  }
}
