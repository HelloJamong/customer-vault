import { IsString, IsBoolean, IsInt, IsOptional, Min, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ServerConfigDto {
  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  managementServer?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  securityGatewayServer?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  integratedServer?: number;
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

  @ApiProperty({ required: false, type: ServerConfigDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ServerConfigDto)
  serverConfig?: ServerConfigDto;

  @ApiProperty({ required: false, type: HRIntegrationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HRIntegrationDto)
  hrIntegration?: HRIntegrationDto;
}

export class UpdateSourceManagementDto extends CreateSourceManagementDto {}
