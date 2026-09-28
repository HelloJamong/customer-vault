import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AiIntegrationGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedKey = this.configService.get<string>('AI_INTEGRATION_API_KEY') || '';
    const authorization = context.switchToHttp().getRequest().headers.authorization;
    const token = typeof authorization === 'string'
      ? /^Bearer\s+(.+)$/i.exec(authorization)?.[1]
      : undefined;

    if (!expectedKey || !token) {
      throw new UnauthorizedException('유효한 연동 토큰이 필요합니다.');
    }

    const expected = Buffer.from(expectedKey);
    const actual = Buffer.from(token);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('유효한 연동 토큰이 필요합니다.');
    }

    return true;
  }
}
