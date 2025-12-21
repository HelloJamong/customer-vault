import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
   * 최초 기동 시 기본 설정과 admin 계정을 자동 생성한다.
   */
  private async ensureDefaultAdmin() {
    // 시스템 설정 존재 여부 확인 및 생성
    const settings = await this.systemSettings.findFirst();
    if (!settings) {
      await this.systemSettings.create({
        data: {
          // schema 기본값을 따르며, 초기 비밀번호는 1111
          defaultPassword: '1111',
        },
      });
    }

    // 기존 계정이 있으면 스킵
    const userCount = await this.user.count();
    if (userCount > 0) return;

    const passwordHash = await bcrypt.hash('1111', 10);

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
