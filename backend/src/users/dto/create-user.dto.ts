import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsIP,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'user01', description: '사용자명' })
  @IsString()
  username: string;

  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'user', enum: Role, description: '역할' })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: '기술팀', description: '부서', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: '시스템 관리자', description: '설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: [1, 2], description: '담당 고객사 ID 목록', required: false })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  customerIds?: number[];

  @ApiProperty({ example: ['192.168.10.25'], description: '허용 IP 목록 (일반 사용자 최대 1개)', required: false })
  @IsArray()
  @ArrayMaxSize(2)
  @IsIP(undefined, { each: true })
  @IsOptional()
  allowedIpAddresses?: string[];
}

export class UpdateUserDto {
  @ApiProperty({ example: '홍길동', description: '이름', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '영업팀', description: '부서', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: '시스템 관리자', description: '설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: [1, 3, 5], description: '담당 고객사 ID 목록', required: false })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  customerIds?: number[];

  @ApiProperty({ example: ['192.168.10.25'], description: '허용 IP 목록 (일반 사용자 최대 1개)', required: false })
  @IsArray()
  @ArrayMaxSize(2)
  @IsIP(undefined, { each: true })
  @IsOptional()
  allowedIpAddresses?: string[];
}
