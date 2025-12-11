import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: '고객사A', description: '고객사명' })
  @IsString()
  name: string;

  @ApiProperty({ example: '서울시 강남구', description: '위치', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  // 정 담당자
  @ApiProperty({ description: '담당자 이름', required: false })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({ description: '담당자 직급', required: false })
  @IsString()
  @IsOptional()
  contactPosition?: string;

  @ApiProperty({ description: '담당자 부서', required: false })
  @IsString()
  @IsOptional()
  contactDepartment?: string;

  @ApiProperty({ description: '담당자 휴대전화', required: false })
  @IsString()
  @IsOptional()
  contactMobile?: string;

  @ApiProperty({ description: '담당자 내선', required: false })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ description: '담당자 이메일', required: false })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  // 계약 정보
  @ApiProperty({ example: '유상', description: '계약 유형', required: false })
  @IsString()
  @IsOptional()
  contractType?: string;

  @ApiProperty({ description: '계약 시작일', required: false })
  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @ApiProperty({ description: '계약 종료일', required: false })
  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  // 점검 정보
  @ApiProperty({ example: '매월', description: '점검 주기', required: false })
  @IsString()
  @IsOptional()
  inspectionCycleType?: string;

  @ApiProperty({ description: '점검 주기 월', required: false })
  @IsInt()
  @IsOptional()
  inspectionCycleMonth?: number;

  @ApiProperty({ description: '마지막 점검일', required: false })
  @IsDateString()
  @IsOptional()
  lastInspectionDate?: string;

  // 담당자
  @ApiProperty({ description: '담당 엔지니어 ID', required: false })
  @IsInt()
  @IsOptional()
  engineerId?: number;

  @ApiProperty({ description: '부담당 엔지니어 ID', required: false })
  @IsInt()
  @IsOptional()
  engineerSubId?: number;

  @ApiProperty({ description: '담당 영업 ID', required: false })
  @IsInt()
  @IsOptional()
  salesId?: number;

  @ApiProperty({ description: '비고', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contractType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  inspectionCycleType?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  engineerId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
