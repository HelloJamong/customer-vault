import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CryptoService } from '../common/crypto/crypto.service';
import { getInitialAdminPassword } from '../common/config/initial-password';
import { isMfaRequiredForUser } from '../auth/mfa-policy';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
    private cryptoService: CryptoService,
  ) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { defaultPassword: getInitialAdminPassword() },
      });
    }

    return settings;
  }

  async updateSettings(data: UpdateSettingsDto, userId: number, ipAddress?: string) {
    const settings = await this.getSettings();
    this.validateSettings(data, settings);
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

    if (data.sessionTimeoutMinutes !== undefined && data.sessionTimeoutMinutes !== settings.sessionTimeoutMinutes) {
      changes.push('세션 타임아웃');
      beforeValues.push(`${settings.sessionTimeoutMinutes}분`);
      afterValues.push(`${data.sessionTimeoutMinutes}분`);
    }

    if (
      data.sessionTimeoutWarningEnabled !== undefined &&
      data.sessionTimeoutWarningEnabled !== settings.sessionTimeoutWarningEnabled
    ) {
      changes.push('세션 타임아웃 안내 팝업');
      beforeValues.push(settings.sessionTimeoutWarningEnabled ? '활성화' : '비활성화');
      afterValues.push(data.sessionTimeoutWarningEnabled ? '활성화' : '비활성화');
    }

    if (data.otpEnabled !== undefined && data.otpEnabled !== settings.otpEnabled) {
      changes.push('OTP 기능');
      beforeValues.push(settings.otpEnabled ? '활성화' : '비활성화');
      afterValues.push(data.otpEnabled ? '활성화' : '비활성화');
    }

    if (data.ipRestrictionEnabled !== undefined && data.ipRestrictionEnabled !== settings.ipRestrictionEnabled) {
      changes.push('시스템 전역 IP 접근 제한');
      beforeValues.push(settings.ipRestrictionEnabled ? '활성화' : '비활성화');
      afterValues.push(data.ipRestrictionEnabled ? '활성화' : '비활성화');
    }

    const otpTargets: Array<[keyof UpdateSettingsDto, string]> = [
      ['otpApplyToAdministrators', '관리자 OTP 적용'],
      ['otpApplyToTechDepartment', '기술팀 OTP 적용'],
      ['otpApplyToSalesDepartment', '영업팀 OTP 적용'],
      ['otpApplyToDevDepartment', '개발팀 OTP 적용'],
    ];
    for (const [key, label] of otpTargets) {
      const nextValue = data[key];
      const previousValue = settings[key as keyof typeof settings];
      if (typeof nextValue === 'boolean' && nextValue !== previousValue) {
        changes.push(label);
        beforeValues.push(previousValue ? '적용' : '미적용');
        afterValues.push(nextValue ? '적용' : '미적용');
      }
    }

    if (data.loginFailureLimitEnabled !== undefined && data.loginFailureLimitEnabled !== settings.loginFailureLimitEnabled) {
      changes.push('로그인 실패 횟수 제한 활성화');
      beforeValues.push(settings.loginFailureLimitEnabled ? '활성화' : '비활성화');
      afterValues.push(data.loginFailureLimitEnabled ? '활성화' : '비활성화');
    }

    if (data.jiraEnabled !== undefined && data.jiraEnabled !== settings.jiraEnabled) {
      changes.push('JIRA 연동 기능');
      beforeValues.push(settings.jiraEnabled ? '활성화' : '비활성화');
      afterValues.push(data.jiraEnabled ? '활성화' : '비활성화');
    }

    if (data.jiraBaseUrl !== undefined && data.jiraBaseUrl !== settings.jiraBaseUrl) {
      changes.push('JIRA 서버 URL');
      beforeValues.push(settings.jiraBaseUrl || '미설정');
      afterValues.push(data.jiraBaseUrl || '미설정');
    }

    if (data.backupEnabled !== undefined && data.backupEnabled !== settings.backupEnabled) {
      changes.push('백업 기능');
      beforeValues.push(settings.backupEnabled ? '활성화' : '비활성화');
      afterValues.push(data.backupEnabled ? '활성화' : '비활성화');
    }

    if (data.backupScheduleType !== undefined && data.backupScheduleType !== settings.backupScheduleType) {
      changes.push('백업 주기 타입');
      beforeValues.push(settings.backupScheduleType);
      afterValues.push(data.backupScheduleType);
    }

    if (data.backupDestRemote !== undefined && data.backupDestRemote !== settings.backupDestRemote) {
      changes.push('원격 백업');
      beforeValues.push(settings.backupDestRemote ? '활성화' : '비활성화');
      afterValues.push(data.backupDestRemote ? '활성화' : '비활성화');
    }

    if (data.sftpHost !== undefined && data.sftpHost !== settings.sftpHost) {
      changes.push('SFTP 서버 주소');
      beforeValues.push(settings.sftpHost || '미설정');
      afterValues.push(data.sftpHost || '미설정');
    }

    // SFTP 패스워드는 평문으로 입력받아 암호화 저장
    if (data.ipRestrictionEnabled === true && !settings.ipRestrictionEnabled) {
      await this.seedUsersAllowedIpsFromLoginHistory();
    }

    let updateData: any = { ...data, updatedBy: userId };
    if (data.sftpPassword !== undefined && data.sftpPassword !== '') {
      updateData.sftpPassword = this.cryptoService.encrypt(data.sftpPassword);
      if (data.sftpPassword !== settings.sftpPassword) {
        changes.push('SFTP 패스워드');
        beforeValues.push('***');
        afterValues.push('***');
      }
    } else if (data.sftpPassword === '') {
      updateData.sftpPassword = null;
    }

    const backupScheduleChanged =
      data.backupEnabled !== undefined ||
      data.backupScheduleType !== undefined ||
      data.backupScheduleHour !== undefined ||
      data.backupScheduleDay !== undefined;

    const updated = await this.prisma.systemSettings.update({
      where: { id: settings.id },
      data: updateData,
    });

    const otpPolicyChanged = [
      'otpEnabled',
      'otpApplyToAdministrators',
      'otpApplyToTechDepartment',
      'otpApplyToSalesDepartment',
      'otpApplyToDevDepartment',
    ].some((key) => data[key as keyof UpdateSettingsDto] !== undefined);
    if (otpPolicyChanged) {
      const users = await this.prisma.user.findMany({
        select: { id: true, role: true, department: true },
      });
      const newlyTargetedUserIds = users
        .filter(
          (targetUser) =>
            !isMfaRequiredForUser(settings, targetUser) &&
            isMfaRequiredForUser(updated, targetUser),
        )
        .map((targetUser) => targetUser.id);
      if (newlyTargetedUserIds.length > 0) {
        await this.prisma.userSession.deleteMany({
          where: { userId: { in: newlyTargetedUserIds } },
        });
      }
    }

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
      backupScheduleChanged,
      updatedSettings: updated,
    };
  }

  private async seedUsersAllowedIpsFromLoginHistory() {
    const users = await this.prisma.user.findMany({
      select: { id: true, username: true, isActive: true, allowedIps: { select: { id: true } } },
    });
    if (users.length === 0) return;

    const latestAttempts = await this.prisma.loginAttempt.findMany({
      where: {
        userId: { in: users.map(({ id }) => id) },
        success: true,
        ipAddress: { not: null },
        NOT: { ipAddress: 'unknown' },
      },
      orderBy: { attemptTime: 'desc' },
      distinct: ['userId'],
      select: { userId: true, ipAddress: true },
    });
    const latestIpByUser = new Map(latestAttempts.map(({ userId, ipAddress }) => [userId, ipAddress]));
    const missingHistory = users.filter((user) =>
      user.isActive && user.allowedIps.length === 0 && !latestIpByUser.get(user.id),
    );
    if (missingHistory.length > 0) {
      const usernames = missingHistory.map(({ username }) => username).join(', ');
      throw new BadRequestException(
        `최근 로그인 IP가 없는 활성 계정이 있어 IP 제한을 켤 수 없습니다. 먼저 허용 IP를 등록하세요: ${usernames}`,
      );
    }

    const data = users
      .filter((user) => user.allowedIps.length === 0 && latestIpByUser.has(user.id))
      .map((user) => ({ userId: user.id, ipAddress: latestIpByUser.get(user.id)! }));
    if (data.length > 0) {
      await this.prisma.userAllowedIp.createMany({ data, skipDuplicates: true });
    }
  }

  private validateSettings(data: UpdateSettingsDto, currentSettings: any) {
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

    if (data.sessionTimeoutMinutes !== undefined &&
        (data.sessionTimeoutMinutes < 10 || data.sessionTimeoutMinutes > 60)) {
      throw new BadRequestException('세션 타임아웃은 10분 이상 60분 이하로 설정해야 합니다.');
    }

    const otpEnabled = data.otpEnabled ?? currentSettings.otpEnabled;
    const hasOtpTarget = [
      data.otpApplyToAdministrators ?? currentSettings.otpApplyToAdministrators ?? true,
      data.otpApplyToTechDepartment ?? currentSettings.otpApplyToTechDepartment ?? true,
      data.otpApplyToSalesDepartment ?? currentSettings.otpApplyToSalesDepartment ?? true,
      data.otpApplyToDevDepartment ?? currentSettings.otpApplyToDevDepartment ?? true,
    ].some(Boolean);
    if (otpEnabled && !hasOtpTarget) {
      throw new BadRequestException('OTP 기능을 사용하려면 적용 대상을 1개 이상 선택해야 합니다.');
    }
  }
}
