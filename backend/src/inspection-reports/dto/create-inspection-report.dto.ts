import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EquipmentInfoDto {
  @ApiProperty({ description: '시스템 유형', example: '통합서버' })
  @IsString()
  @IsNotEmpty()
  systemType: string;

  @ApiProperty({ description: 'Hostname', example: 'vmfort-server-01' })
  @IsString()
  @IsOptional()
  hostname?: string;

  @ApiProperty({ description: '모델명', example: 'HP ProLiant DL380 Gen10' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ description: '시리얼 번호', example: 'ABC123456789' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ description: 'OS', example: 'CentOS 7.9' })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiProperty({ description: '서버 IP', example: '192.168.1.100' })
  @IsString()
  @IsOptional()
  serverIp?: string;
}

export class HardwareSpecsDto {
  @ApiProperty({
    description: 'CPU 모델',
    example: 'Intel® Xeon® Silver 4208 @ 2.10GHz',
  })
  @IsString()
  @IsOptional()
  cpuModel?: string;

  @ApiProperty({ description: 'CPU 코어 수', example: 8 })
  @IsInt()
  @IsOptional()
  cpuCores?: number;

  @ApiProperty({ description: '메모리 용량', example: '32GB' })
  @IsString()
  @IsOptional()
  memoryCapacity?: string;
}

export class CreateInspectionReportDto {
  @ApiProperty({ description: '고객사 ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  customerId: number;

  @ApiProperty({
    description: '템플릿 유형',
    example: 'MGVS',
    enum: ['MGVS', 'VMMG', 'VMVS'],
  })
  @IsString()
  @IsNotEmpty()
  templateType: string;

  @ApiProperty({ description: '점검 연도', example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  inspectionYear: number;

  @ApiProperty({ description: '점검 월', example: 1 })
  @IsInt()
  @Min(1)
  @Max(12)
  inspectionMonth: number;

  @ApiProperty({ description: '점검 일자', example: '2026-01-22' })
  @IsDateString()
  @IsNotEmpty()
  inspectionDate: string;

  @ApiProperty({
    description: '점검 장소',
    example: '서울 본사 전산실',
    required: false,
  })
  @IsString()
  @IsOptional()
  inspectionLocation?: string;

  @ApiProperty({
    description: '점검 주기',
    example: '매월',
    required: false,
  })
  @IsString()
  @IsOptional()
  inspectionCycle?: string;

  @ApiProperty({ description: '고객사명', example: '(주)테스트컴퍼니' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: '고객사 부서',
    example: '정보보안팀',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerDepartment?: string;

  @ApiProperty({
    description: '고객사 담당자',
    example: '홍길동',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerContact?: string;

  @ApiProperty({
    description: '고객사 연락처',
    example: '02-1234-5678',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({ description: '점검자명', example: '김철수' })
  @IsString()
  @IsNotEmpty()
  inspectorName: string;

  @ApiProperty({
    description: '점검자 연락처',
    example: '010-1234-5678',
    required: false,
  })
  @IsString()
  @IsOptional()
  inspectorPhone?: string;

  @ApiProperty({
    description: '장비 정보 배열',
    type: [EquipmentInfoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentInfoDto)
  equipmentInfo: EquipmentInfoDto[];

  @ApiProperty({
    description: '하드웨어 스펙',
    type: HardwareSpecsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => HardwareSpecsDto)
  @IsOptional()
  hardwareSpecs?: HardwareSpecsDto;

  @ApiProperty({
    description: '계정연동 사용 여부',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  hrIntegrationEnabled?: boolean;

  @ApiProperty({
    description: '이중화 사용 여부',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  redundancyEnabled?: boolean;

  @ApiProperty({
    description: '고객사 요청사항',
    example: '데이터베이스 성능 최적화 요청',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerRequest?: string;
}
