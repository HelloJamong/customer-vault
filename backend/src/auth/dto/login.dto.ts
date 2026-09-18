import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: '사용자명' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '설정된 비밀번호', description: '비밀번호' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: false,
    description: '강제 로그인 여부 (기존 세션 삭제)',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  forceLogin?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: '새 비밀번호' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: 'OTP 로그인 검증 토큰' })
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @ApiProperty({ description: 'Authenticator 앱의 6자리 코드', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class MfaConfirmSetupDto {
  @ApiProperty({ description: 'Authenticator 앱의 6자리 등록 확인 코드', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
