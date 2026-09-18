import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, IsInt, IsEnum } from 'class-validator';
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
}
