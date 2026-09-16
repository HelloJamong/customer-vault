import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import { CreateSourceManagementDto, UpdateSourceManagementDto, VirtualPcImageDto } from './dto/source-management.dto';
import { CryptoService } from '../common/crypto/crypto.service';
import { assertCustomerEditable, isAdminRole } from '../common/utils/customer-access.util';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
    private cryptoService: CryptoService,
  ) {}

  async findAll(filters?: {
    contractType?: string;
    inspectionCycleType?: string;
    engineerId?: number;
    salesId?: number;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.contractType) {
      where.contractType = filters.contractType === '만료'
        ? { in: ['만료', '미계약'] }
        : filters.contractType;
    }
    if (filters?.inspectionCycleType) {
      where.inspectionCycleType = filters.inspectionCycleType;
    }
    if (filters?.engineerId) {
      where.engineerId = filters.engineerId;
    }
    if (filters?.salesId) {
      where.salesId = filters.salesId;
    }
    if (filters?.search) {
      where.name = { contains: filters.search };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        engineer: { select: { id: true, name: true } },
        engineerSub: { select: { id: true, name: true } },
        sales: { select: { id: true, name: true } },
        inspectionTargets: { select: { id: true } },
        documents: {
          select: {
            id: true,
            inspectionDate: true,
            inspectionTargetId: true,
          },
        },
        sourceManagement: {
          select: {
            adminWebVersion: true,
            adminWebReleaseDate: true,
            adminWebVersionDetail: true,
            clientVersion: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 각 고객사의 점검 상태 및 버전 계산
    return customers.map((customer) => {
      const inspectionStatus = this.getInspectionStatus(customer);
      const version = this.getVersion(
        customer.sourceManagement?.adminWebVersion,
        customer.sourceManagement?.adminWebReleaseDate,
      );
      const versionInfo = this.getVersionInfo(customer.sourceManagement);
      const { inspectionTargets, documents, sourceManagement, operationalStatus: _operationalStatus, ...customerData } = customer;

      return {
        ...customerData,
        contractType: this.normalizeContractType(customer.contractType),
        inspectionStatus,
        version,
        versionInfo,
      };
    });
  }

  async getSummary() {
    const customers = await this.prisma.customer.findMany({
      include: {
        engineer: { select: { id: true, name: true } },
        engineerSub: { select: { id: true, name: true } },
        sales: { select: { id: true, name: true } },
        sourceManagement: {
          select: {
            adminWebVersion: true,
            adminWebReleaseDate: true,
            clientVersion: true,
            adminWebVersionDetail: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return customers.map((customer) => {
      const version = this.getVersion(
        customer.sourceManagement?.adminWebVersion,
        customer.sourceManagement?.adminWebReleaseDate,
      );
      const versionInfo = this.getVersionInfo(customer.sourceManagement);
      const { sourceManagement, operationalStatus: _operationalStatus, ...customerData } = customer;

      return {
        ...customerData,
        contractType: this.normalizeContractType(customer.contractType),
        version,
        versionInfo,
        clientVersion: sourceManagement?.clientVersion || null,
      };
    });
  }

  async findMyCustomers(userId: number) {
    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { engineerId: userId },
          { engineerSubId: userId },
          { salesId: userId },
        ],
      },
      include: {
        engineer: { select: { id: true, name: true } },
        engineerSub: { select: { id: true, name: true } },
        sales: { select: { id: true, name: true } },
        inspectionTargets: { select: { id: true } },
        documents: {
          select: {
            id: true,
            inspectionDate: true,
            inspectionTargetId: true,
          },
        },
        sourceManagement: {
          select: {
            adminWebVersion: true,
            adminWebReleaseDate: true,
            adminWebVersionDetail: true,
            clientVersion: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 각 고객사의 점검 상태 및 버전 계산
    return customers.map((customer) => {
      const inspectionStatus = this.getInspectionStatus(customer);
      const version = this.getVersion(
        customer.sourceManagement?.adminWebVersion,
        customer.sourceManagement?.adminWebReleaseDate,
      );
      const versionInfo = this.getVersionInfo(customer.sourceManagement);
      const { inspectionTargets, documents, sourceManagement, operationalStatus: _operationalStatus, ...customerData } = customer;

      return {
        ...customerData,
        contractType: this.normalizeContractType(customer.contractType),
        inspectionStatus,
        version,
        versionInfo,
      };
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        engineer: { select: { id: true, name: true } },
        engineerSub: { select: { id: true, name: true } },
        sales: { select: { id: true, name: true } },
        inspectionTargets: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('고객사를 찾을 수 없습니다.');
    }

    // 날짜 필드를 YYYY-MM-DD 형식으로 변환
    const { operationalStatus: _operationalStatus, ...customerData } = customer;
    return {
      ...customerData,
      contractType: this.normalizeContractType(customer.contractType),
      contractStartDate: customer.contractStartDate
        ? this.formatDate(customer.contractStartDate)
        : null,
      contractEndDate: customer.contractEndDate
        ? this.formatDate(customer.contractEndDate)
        : null,
      lastInspectionDate: customer.lastInspectionDate
        ? this.formatDate(customer.lastInspectionDate)
        : null,
    };
  }

  // 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async create(createCustomerDto: CreateCustomerDto, userId: number, ipAddress?: string) {
    // 고객사명 중복 체크
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { name: createCustomerDto.name },
    });

    if (existingCustomer) {
      throw new ConflictException('이미 존재하는 고객사입니다.');
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        contractType: this.normalizeContractType(createCustomerDto.contractType),
        contractStartDate: createCustomerDto.contractStartDate
          ? new Date(createCustomerDto.contractStartDate)
          : null,
        contractEndDate: createCustomerDto.contractEndDate
          ? new Date(createCustomerDto.contractEndDate)
          : null,
        lastInspectionDate: createCustomerDto.lastInspectionDate
          ? new Date(createCustomerDto.lastInspectionDate)
          : null,
      },
    });

    // 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '고객사 추가',
      description: `새로운 고객사 "${customer.name}"를 추가했습니다.`,
      ipAddress,
    });

    return {
      id: customer.id,
      name: customer.name,
      message: '고객사가 생성되었습니다.',
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto, userId: number, ipAddress?: string, role?: string) {
    // 변경 전 데이터 조회
    const beforeCustomer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        engineer: { select: { name: true } },
        engineerSub: { select: { name: true } },
        sales: { select: { name: true } },
      },
    });

    if (!beforeCustomer) {
      throw new NotFoundException('고객사를 찾을 수 없습니다.');
    }

    // 고객사명이 변경되는 경우 중복 체크
    if (updateCustomerDto.name && updateCustomerDto.name !== beforeCustomer.name) {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { name: updateCustomerDto.name },
      });

      if (existingCustomer) {
        throw new ConflictException('이미 존재하는 고객사입니다.');
      }
    }

    // null 값 처리를 위한 데이터 준비
    const updateData: any = { ...updateCustomerDto };

    if (updateCustomerDto.contractType !== undefined) {
      updateData.contractType = this.normalizeContractType(updateCustomerDto.contractType);
    }

    // 날짜 필드 처리
    if (updateCustomerDto.contractStartDate !== undefined) {
      updateData.contractStartDate = updateCustomerDto.contractStartDate
        ? new Date(updateCustomerDto.contractStartDate)
        : null;
    }
    if (updateCustomerDto.contractEndDate !== undefined) {
      updateData.contractEndDate = updateCustomerDto.contractEndDate
        ? new Date(updateCustomerDto.contractEndDate)
        : null;
    }
    if (updateCustomerDto.lastInspectionDate !== undefined) {
      updateData.lastInspectionDate = updateCustomerDto.lastInspectionDate
        ? new Date(updateCustomerDto.lastInspectionDate)
        : null;
    }

    // 사내 담당자 필드 처리 (undefined를 null로 변환)
    if (updateCustomerDto.engineerId === undefined || updateCustomerDto.engineerId === null) {
      updateData.engineerId = null;
    }
    if (updateCustomerDto.engineerSubId === undefined || updateCustomerDto.engineerSubId === null) {
      updateData.engineerSubId = null;
    }
    if (updateCustomerDto.salesId === undefined || updateCustomerDto.salesId === null) {
      updateData.salesId = null;
    }

    // 일반 사용자(user)는 담당자 지정(정/부 엔지니어, 영업)을 변경할 수 없다.
    // (담당자를 자기 자신으로 바꿔 권한을 얻는 것을 방지) — 위의 null 변환 이후에 제거
    if (role !== undefined && !isAdminRole(role)) {
      delete updateData.engineerId;
      delete updateData.engineerSubId;
      delete updateData.salesId;
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // 변경 사항 추적
    const changes: string[] = [];
    if (updateCustomerDto.name !== undefined && updateCustomerDto.name !== beforeCustomer.name) {
      changes.push(`고객사명: ${beforeCustomer.name} → ${updateCustomerDto.name}`);
    }
    const normalizedBeforeContractType = this.normalizeContractType(beforeCustomer.contractType);
    const normalizedAfterContractType = updateCustomerDto.contractType !== undefined
      ? this.normalizeContractType(updateCustomerDto.contractType)
      : normalizedBeforeContractType;
    if (normalizedAfterContractType !== normalizedBeforeContractType) {
      changes.push(`계약상태: ${normalizedBeforeContractType || '없음'} → ${normalizedAfterContractType}`);
    }
    if (updateCustomerDto.engineerId !== undefined && updateCustomerDto.engineerId !== beforeCustomer.engineerId) {
      const beforeName = beforeCustomer.engineer?.name || '없음';
      changes.push(`담당엔지니어 변경 (이전: ${beforeName})`);
    }

    // 로그 기록 (변경 사항이 있을 경우에만)
    if (changes.length > 0 || Object.keys(updateCustomerDto).length > 0) {
      await this.logsService.createServiceLog({
        userId,
        logType: '정상',
        action: '고객사 수정',
        description: `고객사 "${beforeCustomer.name}" 정보를 수정했습니다.${changes.length > 0 ? ' ' + changes.join(', ') : ''}`,
        ipAddress,
      });
    }

    return {
      id: customer.id,
      name: customer.name,
      message: '고객사 정보가 수정되었습니다.',
    };
  }

  async remove(id: number, userId: number, ipAddress?: string) {
    // 삭제 전 고객사 정보 조회
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!customer) {
      throw new NotFoundException('고객사를 찾을 수 없습니다.');
    }

    await this.prisma.customer.delete({ where: { id } });

    // 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '경고',
      action: '고객사 삭제',
      description: `고객사 "${customer.name}"를 삭제했습니다.`,
      ipAddress,
    });

    return { message: '고객사가 삭제되었습니다.' };
  }

  // 점검 상태 계산 (완료 / 미진행 / 대상아님)
  getInspectionStatus(customer: any): string {
    // 계약 상태가 만료 또는 미계약인 경우
    if (['만료', '미계약'].includes(customer.contractType)) {
      return '대상아님';
    }

    // 점검 주기가 협력사진행 또는 무상기간인 경우
    if (['협력사진행', '무상기간'].includes(customer.inspectionCycleType)) {
      return '대상아님';
    }

    // 이번 달 점검 대상인지 확인
    if (!this.isInspectionNeededThisMonth(customer)) {
      return '대상아님';
    }

    // 점검 대상 항목이 없으면 미진행
    const targetIds = customer.inspectionTargets?.map((t: any) => t.id) || [];
    if (targetIds.length === 0) {
      return '미진행';
    }

    // 이번 달 점검 완료된 대상 확인
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const completedTargetIds = new Set(
      customer.documents
        ?.filter((doc: any) => {
          const inspectionDate = new Date(doc.inspectionDate);
          return (
            doc.inspectionTargetId &&
            inspectionDate >= startOfMonth &&
            inspectionDate < startOfNextMonth
          );
        })
        .map((doc: any) => doc.inspectionTargetId) || []
    );

    // 모든 점검 대상이 완료되었는지 확인
    const allCompleted = targetIds.every((id: number) => completedTargetIds.has(id));
    return allCompleted ? '완료' : '미진행';
  }

  normalizeContractType(contractType: string | null | undefined): string {
    return contractType === '미계약' || !contractType ? '만료' : contractType;
  }

  // 버전 계산 (기존 데이터는 관리웹 릴리즈 날짜를 기준으로 호환)
  getVersion(adminWebVersion: string | null | undefined, adminWebReleaseDate: string | null | undefined): string {
    return adminWebVersion || (adminWebReleaseDate ? '6.1' : '4.2');
  }

  getVersionInfo(sourceManagement: {
    adminWebVersion?: string | null;
    adminWebReleaseDate?: string | null;
    adminWebVersionDetail?: string | null;
    clientVersion?: string | null;
  } | null | undefined): string {
    const adminWebVersion = this.getVersion(sourceManagement?.adminWebVersion, sourceManagement?.adminWebReleaseDate);
    const adminWebDetail = sourceManagement?.adminWebVersionDetail || (
      sourceManagement?.adminWebReleaseDate ? `Release ${sourceManagement.adminWebReleaseDate}` : null
    );
    const adminWeb = adminWebDetail
      ? `${adminWebVersion} (${adminWebDetail})`
      : adminWebVersion;
    const client = sourceManagement?.clientVersion || '-';
    return `${adminWeb} / ${client}`;
  }

  // 이번 달 점검 대상 여부 확인
  isInspectionNeededThisMonth(customer: any): boolean {
    // 계약 상태가 만료 또는 미계약인 경우
    if (['만료', '미계약'].includes(customer.contractType)) {
      return false;
    }

    // 점검 주기가 협력사진행 또는 무상기간인 경우
    if (['협력사진행', '무상기간'].includes(customer.inspectionCycleType)) {
      return false;
    }

    // 계약 상태가 유상이거나, 무상이지만 점검 주기가 설정된 경우
    const isValidContract = customer.contractType === '유상' ||
      (customer.contractType === '무상' && customer.inspectionCycleType &&
       !['협력사진행', '무상기간'].includes(customer.inspectionCycleType));

    if (!isValidContract) {
      return false;
    }

    const currentMonth = new Date().getMonth() + 1;

    if (customer.inspectionCycleType === '매월') {
      return true;
    }

    if (!customer.inspectionCycleMonth) {
      return false;
    }

    if (customer.inspectionCycleType === '분기') {
      const quarterMonths: { [key: number]: number[] } = {
        1: [1, 4, 7, 10],
        2: [2, 5, 8, 11],
        3: [3, 6, 9, 12],
      };
      return quarterMonths[customer.inspectionCycleMonth]?.includes(currentMonth) || false;
    }

    if (customer.inspectionCycleType === '반기') {
      const halfYearMonths: { [key: number]: number[] } = {
        1: [1, 7],
        2: [2, 8],
        3: [3, 9],
        4: [4, 10],
        5: [5, 11],
        6: [6, 12],
      };
      return halfYearMonths[customer.inspectionCycleMonth]?.includes(currentMonth) || false;
    }

    if (customer.inspectionCycleType === '연1회') {
      return currentMonth === customer.inspectionCycleMonth;
    }

    return false;
  }

  // 이번 달 점검 대상 여부 확인
  async isInspectionCompletedThisMonth(customerId: number): Promise<boolean> {
    const customer = await this.findOne(customerId);

    if (!this.isInspectionNeededThisMonth(customer)) {
      return false;
    }

    const targetIds = customer.inspectionTargets.map((t) => t.id);
    if (targetIds.length === 0) {
      return false;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const completedTargets = await this.prisma.document.findMany({
      where: {
        customerId,
        inspectionTargetId: { in: targetIds },
        inspectionDate: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      select: { inspectionTargetId: true },
      distinct: ['inspectionTargetId'],
    });

    return completedTargets.length === targetIds.length;
  }

  // 소스 관리
  async getSourceManagement(customerId: number) {
    const sourceManagement = await this.prisma.sourceManagement.findUnique({
      where: { customerId },
      include: {
        servers: {
          orderBy: { id: 'asc' },
        },
        accessInfo: {
          orderBy: { id: 'asc' },
        },
        virtualPcImages: {
          orderBy: { id: 'asc' },
          include: {
            installedPrograms: { orderBy: { id: 'asc' } },
            checklistItems: {
              orderBy: { displayOrder: 'asc' },
              include: { checkedBy: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!sourceManagement) {
      // 소스 관리 정보가 없는 경우 빈 구조 반환 (아직 작성되지 않은 상태)
      return {
        id: null,
        customerId,
        clientVersion: null,
        clientCustomInfo: null,
        virtualPcOsVersion: null,
        virtualPcBuildVersion: null,
        virtualPcGuestAddition: null,
        virtualPcImageInfo: null,
        virtualPcImages: [],
        adminWebVersion: null,
        adminWebVersionDetail: null,
        adminWebCustomInfo: null,
        redundancyType: null,
        servers: [],
        accessInfo: [],
        hrIntegration: {
          enabled: false,
          dbType: null,
          dbVersion: null,
        },
      };
    }

    // 프론트엔드 형식에 맞게 변환
    return {
      id: sourceManagement.id,
      customerId: sourceManagement.customerId,
      clientVersion: sourceManagement.clientVersion,
      clientCustomInfo: sourceManagement.clientCustomInfo,
      virtualPcOsVersion: sourceManagement.virtualPcOsVersion,
      virtualPcBuildVersion: sourceManagement.virtualPcBuildVersion,
      virtualPcGuestAddition: sourceManagement.virtualPcGuestAddition,
      virtualPcImageInfo: sourceManagement.virtualPcImageInfo,
      virtualPcImages: sourceManagement.virtualPcImages.map(image => ({
        id: image.id,
        name: image.name,
        osName: image.osName,
        osEdition: image.osEdition,
        osRelease: image.osRelease,
        cDiskCapacity: image.cDiskCapacity,
        dDiskCapacity: image.dDiskCapacity,
        licenseStatus: image.licenseStatus,
        licenseNote: image.licenseNote,
        hashValue: image.hashValue,
        installedPrograms: image.installedPrograms.map(program => ({
          id: program.id,
          name: program.name,
          version: program.version,
          description: program.description,
        })),
        checklistItems: image.checklistItems.map(item => ({
          id: item.id,
          category: item.category,
          itemKey: item.itemKey,
          checked: item.checked,
          note: item.note,
          checkedBy: item.checkedBy ? {
            id: item.checkedBy.id,
            name: item.checkedByName || item.checkedBy.name,
          } : null,
          checkedByName: item.checkedByName,
          checkedAt: item.checkedAt,
          displayOrder: item.displayOrder,
        })),
      })),
      adminWebVersion: sourceManagement.adminWebVersion || this.getVersion(null, sourceManagement.adminWebReleaseDate),
      adminWebVersionDetail: sourceManagement.adminWebVersionDetail || (
        sourceManagement.adminWebReleaseDate ? `Release ${sourceManagement.adminWebReleaseDate}` : null
      ),
      adminWebCustomInfo: sourceManagement.adminWebCustomInfo,
      redundancyType: sourceManagement.redundancyType,
      servers: sourceManagement.servers.map(server => ({
        id: server.id,
        serverType: server.serverType,
        manufacturer: server.manufacturer,
        modelName: server.modelName,
        hostname: server.hostname,
        serialNumber: server.serialNumber,
        osVersion: server.osVersion,
        cpuType: server.cpuType,
        memoryCapacity: server.memoryCapacity,
        diskCapacity: server.diskCapacity,
        nicFiberCount: server.nicFiberCount,
        nicUtpCount: server.nicUtpCount,
        powerSupplyCount: server.powerSupplyCount,
      })),
      accessInfo: (sourceManagement as any).accessInfo?.map((access: any) => ({
        id: access.id,
        accessType: access.accessType,
        webUrl: access.webUrl,
        webAccount: access.webAccount,
        webPassword: this.cryptoService.safeDecrypt(access.webPassword),
        serverHostname: access.serverHostname,
        serverIpAddress: access.serverIpAddress,
        serverSshPort: access.serverSshPort,
        serverRootAccessible: access.serverRootAccessible,
        serverSshAccount: access.serverSshAccount,
        serverSshPassword: this.cryptoService.safeDecrypt(access.serverSshPassword),
        serverRootPassword: this.cryptoService.safeDecrypt(access.serverRootPassword),
      })) || [],
      hrIntegration: {
        enabled: sourceManagement.hrIntegrationEnabled,
        dbType: sourceManagement.hrDbType,
        dbVersion: sourceManagement.hrDbVersion,
      },
    };
  }

  private buildVirtualPcImageCreateData(
    image: VirtualPcImageDto,
    userId: number,
    userName: string | null,
    previousChecklistItems?: Map<string, { checked: boolean; checkedByUserId: number | null; checkedByName: string | null; checkedAt: Date | null }>,
  ) {
    return {
      name: image.name,
      osName: image.osName,
      osEdition: image.osEdition,
      osRelease: image.osRelease,
      cDiskCapacity: image.cDiskCapacity,
      dDiskCapacity: image.dDiskCapacity,
      licenseStatus: image.licenseStatus,
      licenseNote: image.licenseNote,
      hashValue: image.hashValue,
      installedPrograms: image.installedPrograms?.length ? {
        create: image.installedPrograms.map(program => ({
          name: program.name,
          version: program.version,
          description: program.description,
        })),
      } : undefined,
      checklistItems: image.checklistItems?.length ? {
        create: image.checklistItems.map((item, index) => {
          const previous = previousChecklistItems?.get(item.itemKey);
          const newlyChecked = item.checked && !previous?.checked;
          return {
            category: item.itemKey.startsWith('vmft_') ? 'VMFT 설정' : '구동 테스트',
            itemKey: item.itemKey,
            checked: item.checked,
            note: item.note,
            checkedByUserId: item.checked ? (newlyChecked ? userId : (previous?.checkedByUserId ?? userId)) : null,
            checkedByName: item.checked ? (newlyChecked ? userName : (previous?.checkedByName || userName)) : null,
            checkedAt: item.checked ? (newlyChecked ? new Date() : (previous?.checkedAt || new Date())) : null,
            displayOrder: item.displayOrder ?? index,
          };
        }),
      } : undefined,
    };
  }

  private validateVirtualPcImages(images?: VirtualPcImageDto[]) {
    if (!images) return;
    if (images.length === 0) {
      throw new BadRequestException('가상PC 이미지는 최소 1개 이상 등록해야 합니다');
    }
    if (images.length > 10) {
      throw new BadRequestException('가상PC 이미지는 최대 10개까지 등록할 수 있습니다');
    }
    images.forEach((image, index) => {
      if (image.licenseStatus === '미진행' && !image.licenseNote?.trim()) {
        throw new BadRequestException(`가상PC 이미지 #${index + 1}의 정품 인증 미진행 비고를 입력해주세요`);
      }
    });
  }

  async createSourceManagement(customerId: number, dto: CreateSourceManagementDto, userId: number, ipAddress: string) {
    // 고객사 존재 확인
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('고객사를 찾을 수 없습니다');
    }

    // 이미 존재하는지 확인
    const existing = await this.prisma.sourceManagement.findUnique({
      where: { customerId },
    });

    if (existing) {
      throw new ConflictException('이미 소스 관리 정보가 존재합니다');
    }

    this.validateVirtualPcImages(dto.virtualPcImages);

    const checker = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const sourceManagement = await this.prisma.sourceManagement.create({
      data: {
        customerId,
        clientVersion: dto.clientVersion,
        clientCustomInfo: dto.clientCustomInfo,
        virtualPcOsVersion: dto.virtualPcOsVersion,
        virtualPcBuildVersion: dto.virtualPcBuildVersion,
        virtualPcGuestAddition: dto.virtualPcGuestAddition,
        virtualPcImageInfo: dto.virtualPcImageInfo,
        adminWebVersion: dto.adminWebVersion,
        adminWebVersionDetail: dto.adminWebVersionDetail,
        adminWebCustomInfo: dto.adminWebCustomInfo,
        redundancyType: dto.redundancyType || '단일 구성',
        hrIntegrationEnabled: dto.hrIntegration?.enabled || false,
        hrDbType: dto.hrIntegration?.dbType,
        hrDbVersion: dto.hrIntegration?.dbVersion,
        virtualPcImages: dto.virtualPcImages ? {
          create: dto.virtualPcImages.map(image => this.buildVirtualPcImageCreateData(image, userId, checker?.name || null)),
        } : undefined,
        servers: dto.servers ? {
          create: dto.servers.map(server => ({
            serverType: server.serverType,
            manufacturer: server.manufacturer,
            modelName: server.modelName,
            hostname: server.hostname,
            serialNumber: server.serialNumber,
            osVersion: server.osVersion,
            cpuType: server.cpuType,
            memoryCapacity: server.memoryCapacity,
            diskCapacity: server.diskCapacity,
            nicFiberCount: server.nicFiberCount || 0,
            nicUtpCount: server.nicUtpCount || 0,
            powerSupplyCount: server.powerSupplyCount || 0,
          })),
        } : undefined,
        accessInfo: dto.accessInfo ? {
          create: dto.accessInfo.map(access => ({
            accessType: access.accessType,
            webUrl: access.webUrl,
            webAccount: access.webAccount,
            webPassword: access.webPassword ? this.cryptoService.encrypt(access.webPassword) : null,
            serverHostname: access.serverHostname,
            serverIpAddress: access.serverIpAddress,
            serverSshPort: access.serverSshPort,
            serverRootAccessible: access.serverRootAccessible,
            serverSshAccount: access.serverSshAccount,
            serverSshPassword: access.serverSshPassword ? this.cryptoService.encrypt(access.serverSshPassword) : null,
            serverRootPassword: access.serverRootPassword ? this.cryptoService.encrypt(access.serverRootPassword) : null,
          })),
        } : undefined,
      },
    });

    // 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '소스 관리 생성',
      description: `고객사 ${customer.name}의 소스 관리 정보를 생성했습니다`,
      beforeValue: null,
      afterValue: JSON.stringify(sourceManagement),
      ipAddress,
    });

    return this.getSourceManagement(customerId);
  }

  async updateSourceManagement(customerId: number, dto: UpdateSourceManagementDto, userId: number, ipAddress: string) {
    // 고객사 존재 확인
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('고객사를 찾을 수 없습니다');
    }

    // 기존 데이터 조회
    const existing = await this.prisma.sourceManagement.findUnique({
      where: { customerId },
      include: {
        servers: true,
        accessInfo: true,
        virtualPcImages: {
          include: {
            checklistItems: {
              include: { checkedBy: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('소스 관리 정보가 없습니다');
    }

    this.validateVirtualPcImages(dto.virtualPcImages);

    const checker = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const previousChecklistByImageId = new Map<number, Map<string, {
      checked: boolean;
      checkedByUserId: number | null;
      checkedByName: string | null;
      checkedAt: Date | null;
    }>>();
    existing.virtualPcImages.forEach((image) => {
      previousChecklistByImageId.set(
        image.id,
        new Map(image.checklistItems.map((item) => [item.itemKey, {
          checked: item.checked,
          checkedByUserId: item.checkedByUserId,
          checkedByName: item.checkedByName || item.checkedBy?.name || null,
          checkedAt: item.checkedAt,
        }])),
      );
    });

    // 트랜잭션으로 서버 정보 및 접근 정보 업데이트
    await this.prisma.$transaction(async (tx) => {
      // 기존 서버 정보 삭제
      await tx.serverInfo.deleteMany({
        where: { sourceManagementId: existing.id },
      });

      if (dto.virtualPcImages) {
        await tx.virtualPcImage.deleteMany({
          where: { sourceManagementId: existing.id },
        });
      }

      // 기존 접근 정보 삭제
      await (tx as any).serverAccessInfo.deleteMany({
        where: { sourceManagementId: existing.id },
      });

      // 소스 관리 정보 업데이트
      await tx.sourceManagement.update({
        where: { customerId },
        data: {
          clientVersion: dto.clientVersion,
          clientCustomInfo: dto.clientCustomInfo,
          virtualPcOsVersion: dto.virtualPcOsVersion,
          virtualPcBuildVersion: dto.virtualPcBuildVersion,
          virtualPcGuestAddition: dto.virtualPcGuestAddition,
          virtualPcImageInfo: dto.virtualPcImageInfo,
          ...(dto.adminWebVersion !== undefined ? { adminWebVersion: dto.adminWebVersion } : {}),
          adminWebVersionDetail: dto.adminWebVersionDetail,
          adminWebCustomInfo: dto.adminWebCustomInfo,
          redundancyType: dto.redundancyType,
          hrIntegrationEnabled: dto.hrIntegration?.enabled,
          hrDbType: dto.hrIntegration?.dbType,
          hrDbVersion: dto.hrIntegration?.dbVersion,
          ...(dto.virtualPcImages ? {
            virtualPcImages: {
              create: dto.virtualPcImages.map(image => this.buildVirtualPcImageCreateData(
                image,
                userId,
                checker?.name || null,
                image.id ? previousChecklistByImageId.get(image.id) : undefined,
              )),
            },
          } : {}),
        },
      });

      // 새로운 서버 정보 생성
      if (dto.servers && dto.servers.length > 0) {
        await tx.serverInfo.createMany({
          data: dto.servers.map(server => ({
            sourceManagementId: existing.id,
            serverType: server.serverType,
            manufacturer: server.manufacturer,
            modelName: server.modelName,
            hostname: server.hostname,
            serialNumber: server.serialNumber,
            osVersion: server.osVersion,
            cpuType: server.cpuType,
            memoryCapacity: server.memoryCapacity,
            diskCapacity: server.diskCapacity,
            nicFiberCount: server.nicFiberCount || 0,
            nicUtpCount: server.nicUtpCount || 0,
            powerSupplyCount: server.powerSupplyCount || 0,
          })),
        });
      }

      // 새로운 접근 정보 생성
      if (dto.accessInfo && dto.accessInfo.length > 0) {
        await (tx as any).serverAccessInfo.createMany({
          data: dto.accessInfo.map(access => ({
            sourceManagementId: existing.id,
            accessType: access.accessType,
            webUrl: access.webUrl,
            webAccount: access.webAccount,
            webPassword: access.webPassword ? this.cryptoService.encrypt(access.webPassword) : null,
            serverHostname: access.serverHostname,
            serverIpAddress: access.serverIpAddress,
            serverSshPort: access.serverSshPort,
            serverRootAccessible: access.serverRootAccessible,
            serverSshAccount: access.serverSshAccount,
            serverSshPassword: access.serverSshPassword ? this.cryptoService.encrypt(access.serverSshPassword) : null,
            serverRootPassword: access.serverRootPassword ? this.cryptoService.encrypt(access.serverRootPassword) : null,
          })),
        });
      }
    });

    // 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '소스 관리 수정',
      description: `고객사 ${customer.name}의 소스 관리 정보를 수정했습니다`,
      beforeValue: JSON.stringify(existing),
      afterValue: JSON.stringify(dto),
      ipAddress,
    });

    return this.getSourceManagement(customerId);
  }

  // 편집 권한: 관리자는 제한 없음, 일반 사용자는 담당(정/부 엔지니어, 영업) 고객사만.
  async assertCustomerAssignment(customerId: number, userId: number, role: string) {
    await assertCustomerEditable(this.prisma, customerId, { id: userId, role });
  }
}
