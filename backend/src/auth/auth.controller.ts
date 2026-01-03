import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto, RefreshTokenDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getClientIp } from '../common/utils/ip.util';
import { SessionEventService } from './session-event.service';
import { Observable, map } from 'rxjs';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionEventService: SessionEventService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    const ipAddress = getClientIp(req);
    return this.authService.login(loginDto, ipAddress);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Request() req) {
    const ipAddress = getClientIp(req);
    return this.authService.logout(req.user.id, undefined, ipAddress);
  }

  @Post('logout-beacon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃 (beacon/창 닫힘 대응)' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logoutBeacon(@Body('accessToken') accessToken?: string, @Request() req?) {
    if (!accessToken) {
      return { message: '토큰 없음' };
    }

    try {
      const ipAddress = getClientIp(req);
      return await this.authService.logoutWithAccessToken(accessToken, ipAddress);
    } catch (error) {
      // 토큰 검증 실패 등은 로그만 남기고 성공 응답
      console.error('logout-beacon 실패:', error);
      return { message: '로그아웃 처리 중 오류가 발생했습니다.' };
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    const ipAddress = getClientIp(req);
    return this.authService.changePassword(req.user.id, changePasswordDto, ipAddress);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인한 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getCurrentUser(@Request() req) {
    return this.authService.getUserById(req.user.id);
  }

  @Get('password-requirements')
  @ApiOperation({ summary: '비밀번호 요구사항 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getPasswordRequirements() {
    return this.authService.getPasswordRequirements();
  }

  @Get('validate-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '세션 유효성 검증' })
  @ApiResponse({ status: 200, description: '세션 유효' })
  @ApiResponse({ status: 401, description: '세션 만료' })
  async validateSession(@Request() req) {
    // JWT 토큰에서 sessionId 추출
    const sessionId = req.user.sessionId;
    return this.authService.validateSession(req.user.id, sessionId);
  }

  @Sse('session-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '세션 이벤트 스트림 (SSE)' })
  @ApiResponse({ status: 200, description: 'SSE 연결 성공' })
  sessionEvents(@Request() req): Observable<MessageEvent> {
    const userId = req.user.id;
    const sessionId = req.user.sessionId;

    console.log(`[SSE] 새 연결 - 사용자: ${userId}, 세션: ${sessionId}`);

    // 사용자의 이벤트 스트림 가져오기
    const eventStream = this.sessionEventService.getEventStream(userId);

    // SSE MessageEvent 형식으로 변환
    return eventStream.pipe(
      map((event) => {
        // 현재 세션 ID와 이벤트의 세션 ID가 같은 경우 로그아웃 처리
        // (다른 곳에서 로그인하여 이 세션이 강제 종료됨)
        if (event.sessionId === sessionId && event.type === 'logout') {
          console.log(`[SSE] 로그아웃 이벤트 전송 - 사용자: ${userId}, 종료 대상 세션: ${sessionId}`);
          return {
            data: {
              type: event.type,
              message: event.message,
            },
          } as MessageEvent;
        }

        // keepalive 이벤트
        return {
          data: { type: 'keepalive' },
        } as MessageEvent;
      }),
    );
  }
}
