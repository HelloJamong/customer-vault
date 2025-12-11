import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findByCustomer(customerId: number, filters?: {
    inspectionTargetId?: number;
    year?: number;
    month?: number;
  }) {
    const where: any = { customerId };

    if (filters?.inspectionTargetId) {
      where.inspectionTargetId = filters.inspectionTargetId;
    }

    if (filters?.year && filters?.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      where.inspectionDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.document.findMany({
      where,
      include: {
        inspectionTarget: true,
        uploader: {
          select: { id: true, name: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        inspectionTarget: true,
        uploader: { select: { id: true, name: true } },
      },
    });
  }

  async create(data: {
    customerId: number;
    inspectionTargetId: number;
    title: string;
    description?: string;
    filename: string;
    filepath: string;
    fileSize: number;
    uploadedBy: number;
    inspectionDate: string;
    inspectionType: string;
  }) {
    const document = await this.prisma.document.create({
      data: {
        ...data,
        inspectionDate: new Date(data.inspectionDate),
      },
    });

    return {
      id: document.id,
      title: document.title,
      filename: document.filename,
      message: '문서가 업로드되었습니다.',
    };
  }

  async remove(id: number) {
    const document = await this.prisma.document.findUnique({ where: { id } });

    if (document) {
      // 파일 삭제
      if (fs.existsSync(document.filepath)) {
        fs.unlinkSync(document.filepath);
      }

      // DB 레코드 삭제
      await this.prisma.document.delete({ where: { id } });
    }

    return { message: '문서가 삭제되었습니다.' };
  }

  getFilePath(document: any): string {
    return document.filepath;
  }
}
