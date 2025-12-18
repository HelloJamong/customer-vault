import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.systemSettings.create({ data: {} });
    }

    return settings;
  }

  async updateSettings(data: UpdateSettingsDto, userId: number, ipAddress?: string) {
    this.validateSettings(data);

    const settings = await this.getSettings();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // 변경 사항 로그 기록
    const changes: string[] = [];
    const beforeValues: string[] = [];
    const afterValues: string[] = [];

    if (data.passwordExpiryDays !== undefined && data.passwordExpiryDays !== settings.passwordExpiryDays) {
      changes.push('패스워드 변경 주기');
      beforeValues.push(`${settings.passwordExpiryDays}일`);
      afterValues.push(`${data.passwordExpiryDays}일`);
    }

    if (data.passwordMinLength !== undefined && data.passwordMinLength !== settings.passwordMinLength) {
      changes.push('패스워드 최소 길이');
      beforeValues.push(`${settings.passwordMinLength}자`);
      afterValues.push(`${data.passwordMinLength}자`);
    }

    if (data.passwordRequireUppercase !== undefined && data.passwordRequireUppercase !== settings.passwordRequireUppercase) {
      changes.push('대문자 필수');
      beforeValues.push(settings.passwordRequireUppercase ? '필수' : '선택');
      afterValues.push(data.passwordRequireUppercase ? '필수' : '선택');
    }

    if (data.passwordRequireNumber !== undefined && data.passwordRequireNumber !== settings.passwordRequireNumber) {
      changes.push('숫자 필수');
      beforeValues.push(settings.passwordRequireNumber ? '필수' : '선택');
      afterValues.push(data.passwordRequireNumber ? '필수' : '선택');
    }

    if (data.passwordRequireSpecial !== undefined && data.passwordRequireSpecial !== settings.passwordRequireSpecial) {
      changes.push('특수문자 필수');
      beforeValues.push(settings.passwordRequireSpecial ? '필수' : '선택');
      afterValues.push(data.passwordRequireSpecial ? '필수' : '선택');
    }

    if (data.loginFailureLimit !== undefined && data.loginFailureLimit !== settings.loginFailureLimit) {
      changes.push('최대 로그인 시도 횟수');
      beforeValues.push(`${settings.loginFailureLimit}회`);
      afterValues.push(`${data.loginFailureLimit}회`);
    }

    if (data.accountLockMinutes !== undefined && data.accountLockMinutes !== settings.accountLockMinutes) {
      changes.push('계정 잠금 시간');
      beforeValues.push(`${settings.accountLockMinutes}분`);
      afterValues.push(`${data.accountLockMinutes}분`);
    }

    if (data.defaultPassword !== undefined && data.defaultPassword !== settings.defaultPassword) {
      changes.push('초기 비밀번호');
      beforeValues.push('***');
      afterValues.push('***');
    }

    if (data.passwordExpiryEnabled !== undefined && data.passwordExpiryEnabled !== settings.passwordExpiryEnabled) {
      changes.push('비밀번호 변경 주기 활성화');
      beforeValues.push(settings.passwordExpiryEnabled ? '활성화' : '비활성화');
      afterValues.push(data.passwordExpiryEnabled ? '활성화' : '비활성화');
    }

    if (data.preventDuplicateLogin !== undefined && data.preventDuplicateLogin !== settings.preventDuplicateLogin) {
      changes.push('중복 로그인 방지');
      beforeValues.push(settings.preventDuplicateLogin ? '활성화' : '비활성화');
      afterValues.push(data.preventDuplicateLogin ? '활성화' : '비활성화');
    }

    if (data.loginFailureLimitEnabled !== undefined && data.loginFailureLimitEnabled !== settings.loginFailureLimitEnabled) {
      changes.push('로그인 실패 횟수 제한 활성화');
      beforeValues.push(settings.loginFailureLimitEnabled ? '활성화' : '비활성화');
      afterValues.push(data.loginFailureLimitEnabled ? '활성화' : '비활성화');
    }

    const updated = await this.prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    // 변경 사항이 있을 경우에만 로그 기록
    if (changes.length > 0) {
      await this.logsService.createServiceLog({
        userId,
        logType: '정보',
        action: '시스템 설정 변경',
        description: `${user?.username} 사용자가 시스템 설정을 변경했습니다: ${changes.join(', ')}`,
        beforeValue: beforeValues.join(' / '),
        afterValue: afterValues.join(' / '),
        ipAddress,
      });
    }

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
