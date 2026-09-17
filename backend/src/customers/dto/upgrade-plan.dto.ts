import { IsString, IsInt, IsOptional, IsBoolean, Min, ValidateNested, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpgradeConsiderationDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ required: true, enum: ['클라이언트', '관리서버', '커스텀'] })
  @IsIn(['클라이언트', '관리서버', '커스텀'])
  category: string;

  @ApiProperty({ required: true, description: '기능' })
  @IsString()
  @MaxLength(200)
  feature: string;

  @ApiProperty({ required: false, description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: false, description: '확인 여부' })
  @IsOptional()
  @IsBoolean()
  checked?: boolean;

  @ApiProperty({ required: false, description: '비고' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ required: false, description: '표시 순서' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class CreateUpgradePlanDto {
  @ApiProperty({ required: false, enum: ['예정', '미정', '완료'], default: '미정', description: '업그레이드 일정 상태' })
  @IsOptional()
  @IsIn(['예정', '미정', '완료'])
  status?: string;

  @ApiProperty({ required: false, description: '현재 버전' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  currentVersion?: string;

  @ApiProperty({ required: false, description: '업그레이드 버전' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetVersion?: string;

  @ApiProperty({ required: false, description: '예상 일정 (예: 26/09, 3/4분기)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scheduleEstimate?: string;

  @ApiProperty({ required: false, type: [UpgradeConsiderationDto], description: '고려 사항 목록 (클라이언트/관리서버/커스텀)' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpgradeConsiderationDto)
  considerations?: UpgradeConsiderationDto[];
}

export class UpdateUpgradePlanDto extends CreateUpgradePlanDto {}
