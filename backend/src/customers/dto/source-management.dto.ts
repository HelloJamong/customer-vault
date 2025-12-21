import { IsString, IsBoolean, IsInt, IsOptional, Min, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ServerInfoDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ required: true, description: '서버 구분 (관리서버, 보안게이트웨이서버, 통합서버)' })
  @IsString()
  serverType: string;

  @ApiProperty({ required: false, description: '제조사' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ required: false, description: '모델명' })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiProperty({ required: false, description: '호스트네임' })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiProperty({ required: false, description: 'OS 종류' })
  @IsOptional()
  @IsString()
  osType?: string;

  @ApiProperty({ required: false, description: 'OS 버전' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiProperty({ required: false, description: 'CPU 종류' })
  @IsOptional()
  @IsString()
  cpuType?: string;

  @ApiProperty({ required: false, description: '메모리 용량' })
  @IsOptional()
  @IsString()
  memoryCapacity?: string;

  @ApiProperty({ required: false, description: '디스크 용량' })
  @IsOptional()
  @IsString()
  diskCapacity?: string;

  @ApiProperty({ required: false, default: 0, description: 'Fiber NIC 수량' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nicFiberCount?: number;

  @ApiProperty({ required: false, default: 0, description: 'UTP NIC 수량' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nicUtpCount?: number;

  @ApiProperty({ required: false, default: 0, description: '전원 수량' })
  @IsOptional()
  @IsInt()
  @Min(0)
  powerSupplyCount?: number;
}

class HRIntegrationDto {
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dbType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dbVersion?: string;
}

export class CreateSourceManagementDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientVersion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientCustomInfo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  virtualPcOsVersion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  virtualPcBuildVersion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  virtualPcGuestAddition?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  virtualPcImageInfo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminWebReleaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminWebCustomInfo?: string;

  @ApiProperty({ required: false, default: '단일 구성' })
  @IsOptional()
  @IsString()
  redundancyType?: string;

  @ApiProperty({ required: false, type: [ServerInfoDto], description: '서버 정보 목록' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServerInfoDto)
  servers?: ServerInfoDto[];

  @ApiProperty({ required: false, type: HRIntegrationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HRIntegrationDto)
  hrIntegration?: HRIntegrationDto;
}

export class UpdateSourceManagementDto extends CreateSourceManagementDto {}
