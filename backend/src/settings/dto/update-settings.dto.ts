import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsOptional,
  MinLength,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({
    description: '초기 패스워드',
    example: '1111',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  defaultPassword?: string;

  @ApiProperty({
    description: '패스워드 최소 자릿수 (8-20자)',
    example: 8,
    minimum: 8,
    maximum: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(20)
  passwordMinLength?: number;

  @ApiProperty({
    description: '패스워드 대문자 필수 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  passwordRequireUppercase?: boolean;

  @ApiProperty({
    description: '패스워드 특수문자 필수 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  passwordRequireSpecial?: boolean;

  @ApiProperty({
    description: '패스워드 숫자 필수 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  passwordRequireNumber?: boolean;

  @ApiProperty({
    description: '패스워드 변경 주기 활성화 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  passwordExpiryEnabled?: boolean;

  @ApiProperty({
    description: '패스워드 변경 주기 일수 (7, 30, 60, 90)',
    example: 90,
    enum: [7, 30, 60, 90],
    required: false,
  })
  @IsOptional()
  @IsInt()
  passwordExpiryDays?: number;

  @ApiProperty({
    description: '중복 로그인 방지 활성화 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  preventDuplicateLogin?: boolean;

  @ApiProperty({
    description: '로그인 실패 횟수 제한 활성화 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  loginFailureLimitEnabled?: boolean;

  @ApiProperty({
    description: '로그인 실패 최대 횟수 (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  loginFailureLimit?: number;

  @ApiProperty({
    description: '계정 잠금 시간 (분, 5-30, 5분 단위)',
    example: 10,
    minimum: 5,
    maximum: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(30)
  accountLockMinutes?: number;
}
