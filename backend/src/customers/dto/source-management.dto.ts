import { IsString, IsBoolean, IsInt, IsOptional, Min, ValidateNested, IsObject, IsIn, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ServerDiskGroupDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({
    required: true,
    enum: ['미확인', 'RAID 미사용', 'RAID0', 'RAID1', 'RAID5', 'RAID6', 'RAID10', '기타'],
  })
  @IsIn(['미확인', 'RAID 미사용', 'RAID0', 'RAID1', 'RAID5', 'RAID6', 'RAID10', '기타'])
  raidType: string;

  @ApiProperty({ required: false, example: 'SSD', description: '디스크 유형' })
  @IsOptional()
  @IsString()
  diskType?: string;

  @ApiProperty({ required: false, example: 480, description: '현재 디스크 용량(GB)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  diskCapacityGb?: number;

  @ApiProperty({ required: false, enum: ['GB', 'TB'], default: 'GB', description: '디스크 용량 단위' })
  @IsOptional()
  @IsIn(['GB', 'TB'])
  diskCapacityUnit?: string;
}

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

  @ApiProperty({ required: false, description: '시리얼 번호' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

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

  @ApiProperty({ required: false, type: [ServerDiskGroupDto], description: '디스크 구성 목록' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServerDiskGroupDto)
  diskGroups?: ServerDiskGroupDto[];

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

  @ApiProperty({ required: false, description: '인사DB명' })
  @IsOptional()
  @IsString()
  dbName?: string;

  @ApiProperty({ required: false, description: '인사DB IP 또는 호스트명' })
  @IsOptional()
  @IsString()
  dbHost?: string;

  @ApiProperty({ required: false, description: '인사DB 포트' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dbPort?: number;

  @ApiProperty({ required: false, description: '인사DB 접속 ID' })
  @IsOptional()
  @IsString()
  dbUsername?: string;

  @ApiProperty({ required: false, description: '인사DB 접속 비밀번호' })
  @IsOptional()
  @IsString()
  dbPassword?: string;

  @ApiProperty({ required: false, type: [Object], description: '부서/사용자 View 필드 매핑' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HrIntegrationMappingDto)
  mappings?: HrIntegrationMappingDto[];

  @ApiProperty({ required: false, description: '사용자 연동 쿼리' })
  @IsOptional()
  @IsString()
  userSyncQuery?: string;

  @ApiProperty({ required: false, description: '부서 연동 쿼리' })
  @IsOptional()
  @IsString()
  departmentSyncQuery?: string;
}

export class VirtualPcInstalledProgramDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ required: true, description: '프로그램명' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: '프로그램 버전' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ required: false, description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class VirtualPcChecklistItemDto {
  @ApiProperty({ required: true, description: '체크리스트 항목 키' })
  @IsString()
  itemKey: string;

  @ApiProperty({ required: true, description: '확인 여부' })
  @IsBoolean()
  checked: boolean;

  @ApiProperty({ required: false, description: '비고' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, description: '표시 순서' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class HrIntegrationMappingDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ required: true, enum: ['부서', '사용자'] })
  @IsIn(['부서', '사용자'])
  category: string;

  @ApiProperty({ required: true, description: 'View 테이블명' })
  @IsString()
  tableName: string;

  @ApiProperty({ required: true, description: '인사DB 필드명' })
  @IsString()
  dbFieldName: string;

  @ApiProperty({ required: true, description: 'VMFort 필드명' })
  @IsString()
  vmfortFieldName: string;

  @ApiProperty({ required: true, description: '필수 여부' })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ required: false, description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: '표시 순서' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class VirtualPcImageDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ required: true, description: '가상PC 이미지 이름' })
  @IsString()
  name: string;

  @ApiProperty({ required: true, example: 'Windows 11' })
  @IsString()
  osName: string;

  @ApiProperty({ required: true, example: 'Pro' })
  @IsString()
  osEdition: string;

  @ApiProperty({ required: true, example: '25H2' })
  @IsString()
  osRelease: string;

  @ApiProperty({ required: true, example: 80, description: 'C 드라이브 용량(GB)' })
  @IsInt()
  @Min(1)
  cDiskCapacity: number;

  @ApiProperty({ required: false, example: 30, description: 'D 드라이브 용량(GB)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dDiskCapacity?: number;

  @ApiProperty({ required: true, enum: ['진행완료', '미진행'] })
  @IsIn(['진행완료', '미진행'])
  licenseStatus: string;

  @ApiProperty({ required: false, description: '정품 인증 미진행 사유/비고' })
  @IsOptional()
  @IsString()
  licenseNote?: string;

  @ApiProperty({ required: false, description: 'Hash 값' })
  @IsOptional()
  @IsString()
  hashValue?: string;

  @ApiProperty({ required: false, type: [VirtualPcInstalledProgramDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VirtualPcInstalledProgramDto)
  installedPrograms?: VirtualPcInstalledProgramDto[];

  @ApiProperty({ required: false, type: [VirtualPcChecklistItemDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VirtualPcChecklistItemDto)
  checklistItems?: VirtualPcChecklistItemDto[];
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

  @ApiProperty({ required: false, type: [VirtualPcImageDto], description: '가상PC 이미지 목록 (최대 10개)' })
  @IsOptional()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => VirtualPcImageDto)
  virtualPcImages?: VirtualPcImageDto[];

  @ApiProperty({ required: false, enum: ['4.2', '6.1'], description: '관리웹 기본 버전' })
  @IsOptional()
  @IsIn(['4.2', '6.1'])
  adminWebVersion?: string;

  @ApiProperty({ required: false, description: '관리웹 세부 버전' })
  @IsOptional()
  @IsString()
  adminWebVersionDetail?: string;

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

  @ApiProperty({ required: false, type: [Object], description: '서버 접근 정보 (민감 정보 - Excel 내보내기 제외)' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServerAccessInfoDto)
  accessInfo?: ServerAccessInfoDto[];
}

export class ServerAccessInfoDto {
  @ApiProperty({ required: false, description: 'ID (편집 시에만 사용)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ required: true, description: '접근 구분 (관리웹, 서버)' })
  @IsString()
  accessType: string;

  @ApiProperty({ required: false, description: '관리웹 주소' })
  @IsOptional()
  @IsString()
  webUrl?: string;

  @ApiProperty({ required: false, description: '관리웹 계정' })
  @IsOptional()
  @IsString()
  webAccount?: string;

  @ApiProperty({ required: false, description: '관리웹 패스워드' })
  @IsOptional()
  @IsString()
  webPassword?: string;

  @ApiProperty({ required: false, description: 'HostName' })
  @IsOptional()
  @IsString()
  serverHostname?: string;

  @ApiProperty({ required: false, description: 'IP 주소' })
  @IsOptional()
  @IsString()
  serverIpAddress?: string;

  @ApiProperty({ required: false, description: 'SSH 포트' })
  @IsOptional()
  @IsInt()
  serverSshPort?: number;

  @ApiProperty({ required: false, description: 'root 접근 여부 (가능/불가능)' })
  @IsOptional()
  @IsString()
  serverRootAccessible?: string;

  @ApiProperty({ required: false, description: 'SSH 계정' })
  @IsOptional()
  @IsString()
  serverSshAccount?: string;

  @ApiProperty({ required: false, description: 'SSH 패스워드' })
  @IsOptional()
  @IsString()
  serverSshPassword?: string;

  @ApiProperty({ required: false, description: 'root 패스워드' })
  @IsOptional()
  @IsString()
  serverRootPassword?: string;
}

export class UpdateSourceManagementDto extends CreateSourceManagementDto {}
