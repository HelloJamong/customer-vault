import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string) {
    const { username, password } = loginDto;

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

    // 로그인 성공 처리
    await this.handleSuccessfulLogin(user.id, ipAddress);

    // 토큰 생성
    const tokens = await this.generateTokens(user.id, user.username, user.role);

    // 세션 관리
    await this.manageUserSession(user.id, ipAddress, settings);

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

  async logout(userId: number, sessionId?: string) {
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

    return { message: '로그아웃 성공' };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
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

      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
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

  // Helper Methods
  private async generateTokens(userId: number, username: string, role: string) {
    const payload = { sub: userId, username, role };

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
        ipAddress,
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
      await this.prisma.serviceLog.create({
        data: {
          userId,
          logType: '경고',
          action: '계정 잠금',
          description: `로그인 실패 횟수 초과로 계정이 잠겼습니다. (${settings.accountLockMinutes}분)`,
          ipAddress,
        },
      });
    }
  }

  private async handleSuccessfulLogin(userId: number, ipAddress: string) {
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
        ipAddress,
      },
    });

    // 서비스 로그 기록
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.prisma.serviceLog.create({
      data: {
        userId,
        logType: '정상',
        action: '로그인',
        description: `${user.name}(${user.username}) 사용자가 로그인했습니다.`,
        ipAddress,
      },
    });
  }

  private async manageUserSession(userId: number, ipAddress: string, settings: any) {
    // 중복 로그인 방지
    if (settings.preventDuplicateLogin) {
      await this.prisma.userSession.deleteMany({
        where: { userId },
      });
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
