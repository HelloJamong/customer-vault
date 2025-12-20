import { IsString, IsOptional, IsDateString, IsInt } from 'class-validator';
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
  remarks?: string;
}
