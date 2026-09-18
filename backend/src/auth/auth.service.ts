import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { SessionEventService } from './session-event.service';
import { cleanIpAddress } from '../common/utils/ip.util';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, ChangePasswordDto, MfaVerifyDto } from './dto/login.dto';
import { getInitialAdminPassword } from '../common/config/initial-password';
import { CryptoService } from '../common/crypto/crypto.service';
import { TotpService } from './totp.service';

import {
  getSessionTimeoutMs,
  getSessionTimeoutMinutes,
  isPasswordExpired,
  SESSION_WARNING_SECONDS,
} from './session-policy';

// 비밀번호 최대 길이 (SystemSettings에 별도 컬럼이 없어 고정값 사용)
const PASSWORD_MAX_LENGTH = 20;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => LogsService))
    private logsService: LogsService,
    private sessionEventService: SessionEventService,
    private cryptoService: CryptoService,
    private totpService: TotpService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string) {
    const { username, password, forceLogin } = loginDto;

    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 계정 활성화 확인
    if (!user.isActive) {
      throw new ForbiddenException('계정이 비활성화되었습니다.');
    }

    // 계정 잠금 확인
    if (await this.isAccountLocked(user.id)) {
      throw new ForbiddenException('계정이 잠겨 있습니다. 잠시 후 다시 시도해주세요.');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, ipAddress, 'PASSWORD');
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 비밀번호 만료 확인 (만료되어도 로그인 허용 - 프론트엔드에서 강제 변경 처리)
    const settings = await this.getSystemSettings();
    const passwordExpired = await this.isPasswordExpired(user.id, settings);

    // 중복 로그인 방지가 활성화된 경우 기존 세션 확인
    if (settings.preventDuplicateLogin && !forceLogin) {
      // lastActivity 기준으로 활성 세션만 확인 (브라우저 종료 등으로 만료된 세션 제외)
      const expiryTime = new Date(Date.now() - getSessionTimeoutMs(settings));
      const existingSession = await this.prisma.userSession.findFirst({
        where: { userId: user.id, lastActivity: { gte: expiryTime } },
      });

      if (existingSession) {
        throw new ForbiddenException('DUPLICATE_SESSION');
      }
    }

    if (settings.otpEnabled && user.mfaEnabled) {
      return {
        mfaRequired: true,
        mfaChallengeToken: this.generateMfaChallengeToken(user, forceLogin),
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      };
    }

    return this.completeLogin(user, settings, ipAddress, forceLogin, passwordExpired);
  }

  async verifyMfa(dto: MfaVerifyDto, ipAddress: string) {
    let payload: { sub?: number; type?: string; forceLogin?: boolean };
    try {
      payload = this.jwtService.verify(dto.challengeToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('OTP 인증 요청이 만료되었거나 유효하지 않습니다.');
    }

    if (payload.type !== 'mfa_challenge' || !payload.sub) {
      throw new UnauthorizedException('OTP 인증 요청이 유효하지 않습니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new UnauthorizedException('OTP 인증을 사용할 수 없는 계정입니다.');
    }

    const settings = await this.getSystemSettings();
    if (!settings.otpEnabled) {
      throw new UnauthorizedException('OTP 기능이 비활성화되었습니다.');
    }

    let secret: string;
    try {
      secret = this.cryptoService.decrypt(user.mfaSecretEncrypted);
    } catch {
      throw new UnauthorizedException('OTP 설정을 읽을 수 없습니다. 관리자에게 문의하세요.');
    }

    const usedStep = this.totpService.verifyCode(secret, dto.code);
    if (usedStep === null) {
      await this.handleFailedLogin(user.id, ipAddress, 'OTP');
      throw new UnauthorizedException('OTP 코드가 올바르지 않습니다.');
    }

    const consumed = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [{ mfaLastUsedStep: null }, { mfaLastUsedStep: { lt: usedStep } }],
      },
      data: { mfaLastUsedStep: usedStep },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('이미 사용된 OTP 코드입니다.');
    }

    const passwordExpired = await this.isPasswordExpired(user.id, settings);
    return this.completeLogin(user, settings, ipAddress, payload.forceLogin, passwordExpired);
  }

  async setupMfa(userId: number) {
    const settings = await this.getSystemSettings();
    if (!settings.otpEnabled) {
      throw new ForbiddenException('OTP 기능이 비활성화되어 있습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, mfaEnabled: true },
    });
    if (!user) throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    if (user.mfaEnabled) throw new BadRequestException('이미 OTP가 등록되어 있습니다.');

    const secret = this.totpService.generateSecret();
    const otpauthUri = this.totpService.buildOtpAuthUri(user.username, secret);
    const qrCode = await this.totpService.createQrCode(otpauthUri);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecretEncrypted: this.cryptoService.encrypt(secret),
        mfaEnabled: false,
        mfaConfirmedAt: null,
        mfaLastUsedStep: null,
      },
    });

    return {
      qrCode,
      manualKey: secret,
      issuer: 'Customer Vault',
      account: user.username,
      periodSeconds: 30,
    };
  }

  async confirmMfaSetup(userId: number, code: string, ipAddress?: string) {
    const settings = await this.getSystemSettings();
    if (!settings.otpEnabled) {
      throw new ForbiddenException('OTP 기능이 비활성화되어 있습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, mfaEnabled: true, mfaSecretEncrypted: true },
    });
    if (!user || !user.mfaSecretEncrypted) {
      throw new BadRequestException('먼저 OTP QR 코드를 발급받아야 합니다.');
    }
    if (user.mfaEnabled) return { enabled: true, message: 'OTP가 이미 등록되어 있습니다.' };

    let secret: string;
    try {
      secret = this.cryptoService.decrypt(user.mfaSecretEncrypted);
    } catch {
      throw new BadRequestException('OTP 설정을 읽을 수 없습니다. QR 코드를 다시 발급하세요.');
    }

    const usedStep = this.totpService.verifyCode(secret, code);
    if (usedStep === null) {
      await this.logsService.createServiceLog({
        userId,
        logType: '경고',
        action: 'OTP 등록 실패',
        description: `${user.username} 사용자의 OTP 등록 확인에 실패했습니다.`,
        ipAddress,
      });
      throw new BadRequestException('OTP 코드가 올바르지 않습니다. 휴대폰의 시간을 확인하세요.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaConfirmedAt: new Date(), mfaLastUsedStep: usedStep },
    });
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: 'OTP 등록 완료',
      description: `${user.username} 사용자가 OTP를 등록했습니다.`,
      ipAddress,
    });

    return { enabled: true, message: 'OTP 등록이 완료되었습니다.' };
  }

  async getMfaStatus(userId: number) {
    const settings = await this.getSystemSettings();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    if (!user) throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    return {
      otpEnabled: settings.otpEnabled,
      mfaEnabled: user.mfaEnabled,
      setupRequired: settings.otpEnabled && !user.mfaEnabled,
    };
  }

  async logout(userId: number, sessionId?: string, ipAddress?: string) {
    // 사용자 정보 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // 세션 삭제
    if (sessionId) {
      await this.prisma.userSession.deleteMany({
        where: { userId, sessionId },
      });
    } else {
      // 모든 세션 삭제
      await this.prisma.userSession.deleteMany({
        where: { userId },
      });
    }

    // 로그아웃 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '로그아웃',
      description: `${user?.username} 사용자가 로그아웃했습니다.`,
      ipAddress,
    });

    return { message: '로그아웃 성공' };
  }

  async logoutWithAccessToken(accessToken: string, ipAddress?: string) {
    // 창 닫힘/브라우저 종료 시 sendBeacon으로 호출된다.
    // 새로고침에서도 동일하게 발생하므로 세션은 삭제하지 않고 로그만 남긴다.
    // 실제로 닫힌 세션은 설정된 유휴 타임아웃 후 cleanupExpiredSessions가 정리한다.
    const payload = this.jwtService.verify(accessToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    }) as { sub: number };

    if (!payload?.sub) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { username: true },
    });

    await this.logsService.createServiceLog({
      userId: payload.sub,
      logType: '정상',
      action: '로그아웃',
      description: `${user?.username} 사용자의 브라우저 연결이 종료되었습니다.`,
      ipAddress,
    });

    return { message: '로그아웃 성공' };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto, ipAddress?: string) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      // 비밀번호 오류 로그 기록
      await this.logsService.createServiceLog({
        userId,
        logType: '경고',
        action: '비밀번호 변경 실패',
        description: `${user.username} 사용자의 비밀번호 변경 시도가 실패했습니다. (현재 비밀번호 불일치)`,
        ipAddress,
      });
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }

    // 비밀번호 검증
    const settings = await this.getSystemSettings();
    await this.validatePassword(newPassword, settings);

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // 비밀번호 업데이트
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        isFirstLogin: false,
      },
    });

    // 비밀번호 변경 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '비밀번호 변경',
      description: `${user.username} 사용자가 비밀번호를 변경했습니다.`,
      ipAddress,
    });

    return { message: '비밀번호가 변경되었습니다.' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });

      // access 토큰을 refresh 엔드포인트에 재사용하지 못하도록 차단
      // (구버전 토큰은 type이 없으므로 허용)
      if (payload.type && payload.type !== 'refresh') {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // 세션이 아직 살아있는지 확인한다. 로그아웃·강제 종료·관리자 세션 삭제 후에는
      // refresh 토큰이 만료되지 않았더라도 액세스 토큰을 재발급하지 않는다.
      const sessionId = payload.sessionId;
      if (!sessionId) {
        throw new UnauthorizedException('세션이 만료되었습니다.');
      }
      const settings = await this.getSystemSettings();
      const now = new Date();
      const session = await this.prisma.userSession.findFirst({
        where: { userId: user.id, sessionId, lastActivity: { gte: new Date(now.getTime() - getSessionTimeoutMs(settings)) } },
      });
      if (!session) {
        throw new UnauthorizedException('세션이 만료되었습니다.');
      }

      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivity: now },
      });

      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
          sessionId,
          type: 'access',
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '1h',
        } as any,
      );

      return {
        accessToken,
        session: this.buildSessionPolicy(settings, now),
      };
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  async getUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        email: true,
        isActive: true,
        isFirstLogin: true,
        mfaEnabled: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async getPasswordRequirements() {
    const settings = await this.getSystemSettings();

    return {
      minLength: settings.passwordMinLength,
      maxLength: PASSWORD_MAX_LENGTH,
      requireUppercase: settings.passwordRequireUppercase,
      requireSpecial: settings.passwordRequireSpecial,
      requireNumber: settings.passwordRequireNumber,
    };
  }

  async validateSession(userId: number, sessionId?: string) {
    if (!sessionId) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }
    const settings = await this.getSystemSettings();
    const now = new Date();
    const whereClause = {
      userId,
      sessionId,
      lastActivity: { gte: new Date(now.getTime() - getSessionTimeoutMs(settings)) },
    };

    const session = await this.prisma.userSession.findFirst({
      where: whereClause,
    });

    if (!session) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    // 세션 활성 시간 업데이트
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastActivity: now },
    });

    return { valid: true, session: this.buildSessionPolicy(settings, now) };
  }

  async getSessionPolicy() {
    const settings = await this.getSystemSettings();
    return this.buildSessionPolicy(settings);
  }

  async extendSession(userId: number, sessionId?: string) {
    if (!sessionId) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    const settings = await this.getSystemSettings();
    const now = new Date();
    const result = await this.prisma.userSession.updateMany({
      where: {
        userId,
        sessionId,
        lastActivity: { gte: new Date(now.getTime() - getSessionTimeoutMs(settings)) },
      },
      data: { lastActivity: now },
    });

    if (result.count !== 1) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    return this.buildSessionPolicy(settings, now);
  }

  // Helper Methods
  private generateMfaChallengeToken(
    user: { id: number; username: string; role: string },
    forceLogin?: boolean,
  ) {
    return this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        forceLogin: Boolean(forceLogin),
        type: 'mfa_challenge',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '5m',
      } as any,
    );
  }

  private async completeLogin(
    user: any,
    settings: any,
    ipAddress: string,
    forceLogin?: boolean,
    passwordExpired = false,
  ) {
    await this.handleSuccessfulLogin(user.id, ipAddress);
    const sessionId = await this.manageUserSession(user.id, ipAddress, settings, forceLogin);
    const tokens = await this.generateTokens(user.id, user.username, user.role, sessionId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      session: this.buildSessionPolicy(settings),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        passwordExpired,
        mfaEnabled: user.mfaEnabled,
        mfaSetupRequired: Boolean(settings.otpEnabled && !user.mfaEnabled),
      },
    };
  }

  private async generateTokens(userId: number, username: string, role: string, sessionId: string) {
    const base = { sub: userId, username, role, sessionId };

    const accessToken = this.jwtService.sign(
      { ...base, type: 'access' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '1h',
      } as any,
    );

    const refreshToken = this.jwtService.sign(
      { ...base, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      } as any,
    );

    return { accessToken, refreshToken };
  }

  private async isAccountLocked(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user.isLocked) {
      return false;
    }

    if (user.lockedUntil && new Date() > user.lockedUntil) {
      // 잠금 시간이 지나면 자동 해제
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isLocked: false,
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
      return false;
    }

    return true;
  }

  private async isPasswordExpired(userId: number, settings: any): Promise<boolean> {
    if (!settings.passwordExpiryEnabled) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user.passwordChangedAt) {
      return true;
    }

    return isPasswordExpired(user.passwordChangedAt, settings);
  }

  private async handleFailedLogin(
    userId: number,
    ipAddress: string,
    failureReason = 'PASSWORD',
  ) {
    const settings = await this.getSystemSettings();
    const cleanedIp = cleanIpAddress(ipAddress);

    // 실패 횟수 증가
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });

    // 로그인 시도 기록
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        success: false,
        failureReason,
        ipAddress: cleanedIp,
      },
    });

    // 실패 횟수 초과 시 계정 잠금 (기능이 활성화된 경우에만)
    if (settings.loginFailureLimitEnabled && user.failedLoginAttempts >= settings.loginFailureLimit) {
      const lockedUntil = new Date(Date.now() + settings.accountLockMinutes * 60 * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isLocked: true,
          lockedUntil,
        },
      });

      // 서비스 로그 기록
      await this.logsService.createServiceLog({
        userId,
        logType: '경고',
        action: '계정 잠금',
        description: `로그인 실패 횟수 초과로 계정이 잠겼습니다. (${settings.accountLockMinutes}분)`,
        ipAddress: cleanedIp,
      });
    }
  }

  private async handleSuccessfulLogin(userId: number, ipAddress: string) {
    const cleanedIp = cleanIpAddress(ipAddress);

    // 실패 횟수 초기화
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    // 로그인 시도 기록
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        success: true,
        ipAddress: cleanedIp,
      },
    });

    // 서비스 로그 기록
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '로그인',
      description: `${user.name}(${user.username}) 사용자가 로그인했습니다.`,
      ipAddress: cleanedIp,
    });
  }

  private async manageUserSession(userId: number, ipAddress: string, settings: any, forceLogin?: boolean) {
    // 기존 세션 조회 (SSE 이벤트 전송용)
    const existingSessions = await this.prisma.userSession.findMany({
      where: { userId },
      select: { sessionId: true },
    });

    // 중복 로그인을 허용하면 기존 세션은 유지한다.
    const deletedCount = settings.preventDuplicateLogin
      ? await this.prisma.userSession.deleteMany({ where: { userId } })
      : { count: 0 };

    if (deletedCount.count > 0) {
      // 강제 로그인인 경우 SSE 이벤트 전송 및 로그 기록
      if (forceLogin && settings.preventDuplicateLogin) {
        // 기존 세션들에 로그아웃 이벤트 전송 (즉시 로그아웃)
        existingSessions.forEach((session) => {
          this.sessionEventService.emitLogoutEvent(
            userId,
            session.sessionId,
            '다른 위치에서 로그인되어 현재 세션이 종료되었습니다.',
          );
        });

        const userFull = await this.prisma.user.findUnique({ where: { id: userId } });
        await this.logsService.createServiceLog({
          userId,
          logType: '경고',
          action: '중복 로그인 - 기존 세션 강제 종료',
          description: `${userFull.name}(${userFull.username}) 사용자가 다른 위치에서 로그인하여 기존 세션이 강제 종료되었습니다.`,
          ipAddress: cleanIpAddress(ipAddress),
        });
      }
    }

    // 새 세션 생성
    const sessionId = uuidv4();
    await this.prisma.userSession.create({
      data: {
        userId,
        sessionId,
        ipAddress,
      },
    });

    return sessionId;
  }

  private async validatePassword(password: string, settings: any) {
    if (password.length < settings.passwordMinLength || password.length > PASSWORD_MAX_LENGTH) {
      throw new BadRequestException(
        `비밀번호는 ${settings.passwordMinLength}자 이상 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`,
      );
    }

    if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      throw new BadRequestException('비밀번호에는 대문자가 포함되어야 합니다.');
    }

    if (settings.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException('비밀번호에는 특수문자가 포함되어야 합니다.');
    }

    if (settings.passwordRequireNumber && !/[0-9]/.test(password)) {
      throw new BadRequestException('비밀번호에는 숫자가 포함되어야 합니다.');
    }
  }

  // 5분마다 실행: lastActivity 기준으로 만료된 세션 자동 삭제
  @Cron('0 */5 * * * *')
  async cleanupExpiredSessions() {
    const settings = await this.getSystemSettings();
    const expiryTime = new Date(Date.now() - getSessionTimeoutMs(settings));
    await this.prisma.userSession.deleteMany({
      where: { lastActivity: { lt: expiryTime } },
    });
  }

  private async getSystemSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      // 설정이 없으면 기본 설정 생성
      settings = await this.prisma.systemSettings.create({
        data: { defaultPassword: getInitialAdminPassword() },
      });
    }

    return settings;
  }

  private buildSessionPolicy(settings: any, now = new Date()) {
    return {
      timeoutMinutes: getSessionTimeoutMinutes(settings),
      warningEnabled: settings.sessionTimeoutWarningEnabled ?? true,
      warningSeconds: SESSION_WARNING_SECONDS,
      expiresAt: new Date(now.getTime() + getSessionTimeoutMs(settings)).toISOString(),
    };
  }
}
