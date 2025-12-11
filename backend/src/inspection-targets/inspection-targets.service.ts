import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export class CreateInspectionTargetDto {
  customerId: number;
  targetType: string;
  customName?: string;
  productName?: string;
  displayOrder?: number;
}

export class UpdateInspectionTargetDto {
  targetType?: string;
  customName?: string;
  productName?: string;
  displayOrder?: number;
}

@Injectable()
export class InspectionTargetsService {
  constructor(private prisma: PrismaService) {}

  async findByCustomer(customerId: number) {
    return this.prisma.inspectionTarget.findMany({
      where: { customerId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(dto: CreateInspectionTargetDto) {
    const target = await this.prisma.inspectionTarget.create({
      data: dto,
    });

    return {
      id: target.id,
      message: '점검 대상이 추가되었습니다.',
    };
  }

  async update(id: number, dto: UpdateInspectionTargetDto) {
    await this.prisma.inspectionTarget.update({
      where: { id },
      data: dto,
    });

    return { message: '점검 대상이 수정되었습니다.' };
  }

  async remove(id: number) {
    await this.prisma.inspectionTarget.delete({ where: { id } });
    return { message: '점검 대상이 삭제되었습니다.' };
  }
}
