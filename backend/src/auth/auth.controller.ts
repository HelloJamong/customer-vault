import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto, RefreshTokenDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() loginDto: LoginDto, @Ip() ipAddress: string) {
    return this.authService.login(loginDto, ipAddress);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Request() req, @Ip() ipAddress: string) {
    return this.authService.logout(req.user.id, undefined, ipAddress);
  }

  @Post('logout-beacon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃 (beacon/창 닫힘 대응)' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logoutBeacon(@Body('accessToken') accessToken?: string, @Ip() ipAddress?: string) {
    if (!accessToken) {
      return { message: '토큰 없음' };
    }

    try {
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
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto, @Ip() ipAddress: string) {
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
}
