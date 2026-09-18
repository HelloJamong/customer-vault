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

interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
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
      passReqToCallback: true,
    });
  }

  async validate(requestOrPayload: RequestLike | JwtPayload, maybePayload?: JwtPayload) {
    // 기존 직접 호출 호환성을 위해 payload 단독 호출도 허용한다.
    const request = maybePayload ? requestOrPayload as RequestLike : undefined;
    const payload = maybePayload ?? requestOrPayload as JwtPayload;
    const isPassiveRequest = request?.headers?.['x-session-activity'] === 'false';

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

    // 백그라운드 polling은 유휴 세션을 연장하지 않는다. 사용자 요청만 활동으로 기록한다.
    if (!isPassiveRequest) {
      await this.prisma.userSession.updateMany({
        where: { id: session.id },
        data: { lastActivity: now },
      });
    }
    const timeoutMinutes = getSessionTimeoutMinutes(settings);
    const activityAt = isPassiveRequest ? session.lastActivity : now;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      passwordExpired: isPasswordExpired(user.passwordChangedAt, settings),
      mfaEnabled: user.mfaEnabled,
      mfaSetupRequired: Boolean(settings?.otpEnabled && !user.mfaEnabled),
      sessionId: payload.sessionId, // JWT에서 sessionId 전달
      sessionTimeoutMinutes: timeoutMinutes,
      sessionTimeoutWarningEnabled: settings?.sessionTimeoutWarningEnabled ?? true,
      sessionExpiresAt: new Date(activityAt.getTime() + timeoutMinutes * 60 * 1000).toISOString(),
    };
  }
}
