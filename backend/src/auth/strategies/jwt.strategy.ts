import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getSessionTimeoutMs, getSessionTimeoutMinutes, isPasswordExpired } from '../session-policy';

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  sessionId?: string;
  type?: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    // refresh 토큰을 Authorization 헤더로 재사용하지 못하도록 차단
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('사용자를 찾을 수 없거나 비활성화되었습니다.');
    }

    if (!payload.sessionId) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }
    const settings = await this.prisma.systemSettings.findFirst();
    const now = new Date();
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId: user.id,
        sessionId: payload.sessionId,
        lastActivity: { gte: new Date(now.getTime() - getSessionTimeoutMs(settings)) },
      },
    });
    if (!session) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    // 유효한 세션만 활동 시각을 갱신한다. 삭제되거나 만료된 세션은 부활시키지 않는다.
    await this.prisma.userSession.updateMany({
      where: { id: session.id },
      data: { lastActivity: now },
    });
    const timeoutMinutes = getSessionTimeoutMinutes(settings);

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      passwordExpired: isPasswordExpired(user.passwordChangedAt, settings),
      sessionId: payload.sessionId, // JWT에서 sessionId 전달
      sessionTimeoutMinutes: timeoutMinutes,
      sessionTimeoutWarningEnabled: settings?.sessionTimeoutWarningEnabled ?? true,
      sessionExpiresAt: new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString(),
    };
  }
}
