import { IsString, IsOptional, IsDateString, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupportLogDto {
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @IsDateString()
  supportDate: string;

  @IsOptional()
  @IsString()
  inquirer?: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  userInfo?: string;

  @IsOptional()
  @IsString()
  actionStatus?: string;

  @IsOptional()
  @IsString()
  inquiryContent?: string;

  @IsOptional()
  @IsString()
  actionContent?: string;

  @IsOptional()
  @IsString()
  actionResult?: string;

  @IsOptional()
  @IsString()
  jiraTicket?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  // 첫 지원 내역 (지원날짜·로그인 사용자로 함께 생성)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  entryContent?: string;
}
