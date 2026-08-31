import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

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

    // 세션 활동 시각 갱신 (5분 이상 지난 경우에만). 단일 UPDATE 문이며
    // 세션이 이미 삭제된 경우(로그아웃/강제 종료)에는 아무 것도 하지 않는다.
    if (payload.sessionId) {
      await this.prisma.userSession.updateMany({
        where: {
          sessionId: payload.sessionId,
          lastActivity: { lt: new Date(Date.now() - 5 * 60 * 1000) },
        },
        data: { lastActivity: new Date() },
      });
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      sessionId: payload.sessionId, // JWT에서 sessionId 전달
    };
  }
}
