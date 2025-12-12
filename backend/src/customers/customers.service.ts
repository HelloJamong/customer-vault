import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    contractType?: string;
    inspectionCycleType?: string;
    engineerId?: number;
    salesId?: number;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.contractType) {
      where.contractType = filters.contractType;
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

    return this.prisma.customer.findMany({
      where,
      include: {
        engineer: { select: { id: true, name: true } },
        engineerSub: { select: { id: true, name: true } },
        sales: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
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

    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
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

    return {
      id: customer.id,
      name: customer.name,
      message: '고객사가 생성되었습니다.',
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    return {
      id: customer.id,
      name: customer.name,
      message: '고객사 정보가 수정되었습니다.',
    };
  }

  async remove(id: number) {
    await this.prisma.customer.delete({ where: { id } });
    return { message: '고객사가 삭제되었습니다.' };
  }

  // 이번 달 점검 대상 여부 확인
  isInspectionNeededThisMonth(customer: any): boolean {
    if (['만료', '미계약'].includes(customer.contractType)) {
      return false;
    }

    if (['협력사진행', '무상기간'].includes(customer.inspectionCycleType)) {
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

  // 이번 달 점검 완료 여부 확인
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
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const completedTargets = await this.prisma.document.findMany({
      where: {
        customerId,
        inspectionTargetId: { in: targetIds },
        inspectionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { inspectionTargetId: true },
      distinct: ['inspectionTargetId'],
    });

    return completedTargets.length === targetIds.length;
  }
}
