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
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { SessionEventService } from './session-event.service';
import { cleanIpAddress } from '../common/utils/ip.util';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => LogsService))
    private logsService: LogsService,
    private sessionEventService: SessionEventService,
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
      await this.handleFailedLogin(user.id, ipAddress);
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 비밀번호 만료 확인
    const settings = await this.getSystemSettings();
    if (await this.isPasswordExpired(user.id, settings)) {
      throw new ForbiddenException('비밀번호가 만료되었습니다. 비밀번호를 변경해주세요.');
    }

    console.log(`[로그인] 사용자 ${user.username}(ID: ${user.id}) 로그인 시도`);
    console.log(`[로그인] 중복 로그인 방지: ${settings.preventDuplicateLogin}, 강제 로그인: ${forceLogin}`);

    // 중복 로그인 방지가 활성화된 경우 기존 세션 확인
    if (settings.preventDuplicateLogin && !forceLogin) {
      console.log(`[로그인] 기존 세션 확인 중...`);
      const existingSession = await this.prisma.userSession.findFirst({
        where: { userId: user.id },
      });

      console.log(`[로그인] 기존 세션 조회 결과:`, existingSession ? `세션 ID: ${existingSession.sessionId}` : '없음');

      if (existingSession) {
        // 기존 세션이 있으면 DUPLICATE_SESSION 에러 반환
        console.log(`[로그인] 중복 세션 감지 - DUPLICATE_SESSION 에러 반환`);
        throw new ForbiddenException('DUPLICATE_SESSION');
      }
    } else {
      console.log(`[로그인] 중복 세션 체크 스킵 (preventDuplicateLogin: ${settings.preventDuplicateLogin}, forceLogin: ${forceLogin})`);
    }

    // 로그인 성공 처리
    await this.handleSuccessfulLogin(user.id, ipAddress);

    // 세션 관리 (토큰 생성 전에 세션 ID 필요)
    const sessionId = await this.manageUserSession(user.id, ipAddress, settings, forceLogin);

    // 토큰 생성 (세션 ID 포함)
    const tokens = await this.generateTokens(user.id, user.username, user.role, sessionId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
      },
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
    // sendBeacon 등에서 Authorization 헤더를 붙일 수 없는 경우를 위한 로그아웃 처리
    const payload = this.jwtService.verify(accessToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    }) as { sub: number };

    if (!payload?.sub) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return this.logout(payload.sub, undefined, ipAddress);
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
    const passwordHash = await bcrypt.hash(newPassword, 10);

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
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // refreshToken에서 sessionId 추출 (없으면 세션 조회)
      let sessionId = payload.sessionId;
      if (!sessionId) {
        const session = await this.prisma.userSession.findFirst({
          where: { userId: user.id },
        });
        sessionId = session?.sessionId;
      }

      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
          sessionId,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '1h',
        } as any,
      );

      return { accessToken };
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
      maxLength: 20, // 고정값 20자
      requireUppercase: settings.passwordRequireUppercase,
      requireSpecial: settings.passwordRequireSpecial,
      requireNumber: settings.passwordRequireNumber,
    };
  }

  async validateSession(userId: number, sessionId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    console.log(`[세션검증 API] 사용자 ${user?.username}(ID: ${userId}) 세션 검증 요청 (세션ID: ${sessionId})`);

    // 시스템 설정 확인
    const settings = await this.getSystemSettings();
    console.log(`[세션검증 API] 중복 로그인 방지 설정: ${settings.preventDuplicateLogin}`);

    // 중복 로그인 방지가 비활성화되어 있으면 세션 검증 스킵
    if (!settings.preventDuplicateLogin) {
      console.log(`[세션검증 API] 중복 로그인 방지 비활성화 - 세션 검증 스킵`);
      return { valid: true, sessionCheckDisabled: true };
    }

    // sessionId가 있으면 해당 세션만 확인, 없으면 userId로 확인 (하위 호환성)
    const whereClause = sessionId
      ? { userId, sessionId }
      : { userId };

    const session = await this.prisma.userSession.findFirst({
      where: whereClause,
    });

    console.log(`[세션검증 API] 세션 조회 결과:`, session ? `세션 ID: ${session.sessionId}` : '세션 없음');

    if (!session) {
      console.warn(`[세션검증 API] 세션 없음 - 401 에러 반환`);
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    // 세션 활성 시간 업데이트
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    console.log(`[세션검증 API] 세션 유효 - lastActivity 업데이트 완료`);
    return { valid: true };
  }

  // Helper Methods
  private async generateTokens(userId: number, username: string, role: string, sessionId: string) {
    const payload = { sub: userId, username, role, sessionId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '1h',
    } as any);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
    } as any);

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

    const daysSinceChange = Math.floor(
      (Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSinceChange >= settings.passwordExpiryDays;
  }

  private async handleFailedLogin(userId: number, ipAddress: string) {
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
        ipAddress: cleanedIp,
      },
    });

    // 실패 횟수 초과 시 계정 잠금
    if (user.failedLoginAttempts >= settings.loginFailureLimit) {
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    console.log(`[세션관리] 사용자 ${user?.username}(ID: ${userId}) 세션 관리 시작`);
    console.log(`[세션관리] 중복 로그인 방지: ${settings.preventDuplicateLogin}, 강제 로그인: ${forceLogin}`);

    // 기존 세션 조회 (SSE 이벤트 전송용)
    const existingSessions = await this.prisma.userSession.findMany({
      where: { userId },
      select: { sessionId: true },
    });

    // 항상 기존 세션을 삭제하고 새 세션을 생성
    // (중복 로그인 체크는 이미 login 메서드에서 완료됨)
    const deletedCount = await this.prisma.userSession.deleteMany({
      where: { userId },
    });

    if (deletedCount.count > 0) {
      console.log(`[세션관리] 기존 세션 ${deletedCount.count}개 삭제 완료`);

      // 강제 로그인인 경우 SSE 이벤트 전송 및 로그 기록
      if (forceLogin && settings.preventDuplicateLogin) {
        // 기존 세션들에 로그아웃 이벤트 전송 (즉시 로그아웃)
        existingSessions.forEach((session) => {
          console.log(`[세션관리] SSE 로그아웃 이벤트 전송 - 세션 ID: ${session.sessionId}`);
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

    console.log(`[세션관리] 새 세션 생성 완료 - 세션 ID: ${sessionId}`);
    return sessionId;
  }

  private async validatePassword(password: string, settings: any) {
    if (password.length < settings.passwordMinLength || password.length > settings.passwordMaxLength) {
      throw new BadRequestException(
        `비밀번호는 ${settings.passwordMinLength}자 이상 ${settings.passwordMaxLength}자 이하여야 합니다.`,
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

  private async getSystemSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      // 설정이 없으면 기본 설정 생성
      settings = await this.prisma.systemSettings.create({
        data: {},
      });
    }

    return settings;
  }
}
