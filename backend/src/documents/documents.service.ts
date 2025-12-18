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
    originalFilename: string;
    tempFilepath: string;
    fileSize: number;
    uploadedBy: number;
    inspectionDate: string;
    inspectionType: string;
  }) {
    console.log('[DocumentsService.create] Starting upload with data:', {
      customerId: data.customerId,
      inspectionTargetId: data.inspectionTargetId,
      originalFilename: data.originalFilename,
      tempFilepath: data.tempFilepath,
      fileSize: data.fileSize,
      uploadedBy: data.uploadedBy,
      inspectionDate: data.inspectionDate,
      inspectionType: data.inspectionType,
    });

    try {
      const inspectionDate = new Date(data.inspectionDate);
      console.log('[DocumentsService.create] Parsed inspection date:', inspectionDate);

      // 입력값 검증
      if (!data.customerId || isNaN(data.customerId)) {
        console.error('[DocumentsService.create] Invalid customerId:', data.customerId);
        throw new Error(`유효하지 않은 고객사 ID입니다. (customerId: ${data.customerId})`);
      }

      if (!data.inspectionTargetId || isNaN(data.inspectionTargetId)) {
        console.error('[DocumentsService.create] Invalid inspectionTargetId:', data.inspectionTargetId);
        throw new Error(`유효하지 않은 점검 대상 ID입니다. (inspectionTargetId: ${data.inspectionTargetId})`);
      }

      // 고객사 및 점검 대상 정보 조회
      console.log('[DocumentsService.create] Fetching customer with id:', data.customerId);
      const customer = await this.prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { name: true, lastInspectionDate: true },
      });
      console.log('[DocumentsService.create] Customer found:', customer);

      console.log('[DocumentsService.create] Fetching inspection target with id:', data.inspectionTargetId);
      const inspectionTarget = await this.prisma.inspectionTarget.findUnique({
        where: { id: data.inspectionTargetId },
        select: { productName: true },
      });
      console.log('[DocumentsService.create] Inspection target found:', inspectionTarget);

      if (!customer) {
        console.error('[DocumentsService.create] Customer not found');
        throw new Error(`고객사를 찾을 수 없습니다. (customerId: ${data.customerId})`);
      }

      if (!inspectionTarget) {
        console.error('[DocumentsService.create] Inspection target not found');
        throw new Error(`점검 대상을 찾을 수 없습니다. (inspectionTargetId: ${data.inspectionTargetId})`);
      }

      // 파일명 생성: 고객사명_제품명_N월_정기점검보고서.pdf
      const month = inspectionDate.getMonth() + 1;
      const customerName = customer.name.replace(/[/\\?%*:|"<>]/g, '_'); // 파일명에 사용 불가능한 문자 제거
      const productName = (inspectionTarget.productName || '제품명없음').replace(/[/\\?%*:|"<>]/g, '_');
      const newFilename = `${customerName}_${productName}_${month}월_정기점검보고서.pdf`;

      console.log('[DocumentsService.create] Generated filename:', newFilename);

      // 최종 저장 경로: uploads/customer_X/year/month/filename.pdf
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const year = inspectionDate.getFullYear();
      const monthStr = String(month).padStart(2, '0');
      const finalDirectory = path.join(uploadDir, `customer_${data.customerId}`, String(year), monthStr);

      console.log('[DocumentsService.create] Final directory path:', finalDirectory);

      // 최종 디렉토리 생성
      if (!fs.existsSync(finalDirectory)) {
        console.log('[DocumentsService.create] Creating directory:', finalDirectory);
        fs.mkdirSync(finalDirectory, { recursive: true });
      }

      // 같은 이름의 파일이 이미 존재하면 숫자를 추가
      let finalFilepath = path.join(finalDirectory, newFilename);
      let finalFilename = newFilename;
      let counter = 1;
      while (fs.existsSync(finalFilepath)) {
        console.log('[DocumentsService.create] File exists, incrementing counter:', finalFilepath);
        const nameWithoutExt = `${customerName}_${productName}_${month}월_정기점검보고서`;
        finalFilename = `${nameWithoutExt}_${counter}.pdf`;
        finalFilepath = path.join(finalDirectory, finalFilename);
        counter++;
      }

      console.log('[DocumentsService.create] Final file path:', finalFilepath);
      console.log('[DocumentsService.create] Temp file path:', data.tempFilepath);

      // 임시 파일 존재 확인
      if (!fs.existsSync(data.tempFilepath)) {
        console.error('[DocumentsService.create] Temp file does not exist:', data.tempFilepath);
        throw new Error(`임시 파일을 찾을 수 없습니다: ${data.tempFilepath}`);
      }

      // 임시 파일을 최종 위치로 이동
      console.log('[DocumentsService.create] Moving file from temp to final location');
      fs.renameSync(data.tempFilepath, finalFilepath);
      console.log('[DocumentsService.create] File moved successfully');

      // title은 파일명(확장자 제외)으로 자동 설정
      const titleWithoutExt = finalFilename.replace('.pdf', '');

      console.log('[DocumentsService.create] Creating database record with:', {
        customerId: data.customerId,
        inspectionTargetId: data.inspectionTargetId,
        title: titleWithoutExt,
        filename: finalFilename,
        filepath: finalFilepath,
        fileSize: data.fileSize,
        uploadedBy: data.uploadedBy,
        inspectionDate,
        inspectionType: data.inspectionType,
      });

      const document = await this.prisma.document.create({
        data: {
          customerId: data.customerId,
          inspectionTargetId: data.inspectionTargetId,
          title: titleWithoutExt,
          description: null,
          filename: finalFilename,
          filepath: finalFilepath,
          fileSize: data.fileSize,
          uploadedBy: data.uploadedBy,
          inspectionDate,
          inspectionType: data.inspectionType,
        },
      });

      console.log('[DocumentsService.create] Document created successfully:', document.id);

      // 고객사의 최근 점검일 자동 업데이트
      // 현재 저장된 최근 점검일이 없거나, 새로 업로드된 점검일이 더 최근인 경우 업데이트
      if (!customer.lastInspectionDate || inspectionDate > customer.lastInspectionDate) {
        console.log('[DocumentsService.create] Updating customer last inspection date');
        await this.prisma.customer.update({
          where: { id: data.customerId },
          data: { lastInspectionDate: inspectionDate },
        });
      }

      console.log('[DocumentsService.create] Upload completed successfully');

      return {
        id: document.id,
        title: document.title,
        filename: document.filename,
        message: '문서가 업로드되었습니다.',
      };
    } catch (error) {
      // 에러 발생 시 임시 파일 삭제
      console.error('[DocumentsService.create] Error occurred:', error);
      console.error('[DocumentsService.create] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      if (data.tempFilepath && fs.existsSync(data.tempFilepath)) {
        try {
          console.log('[DocumentsService.create] Cleaning up temp file:', data.tempFilepath);
          fs.unlinkSync(data.tempFilepath);
        } catch (unlinkError) {
          console.error('[DocumentsService.create] Failed to delete temp file:', unlinkError);
        }
      }

      console.error('[DocumentsService.create] 점검서 업로드 에러:', error);
      throw error;
    }
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

  async isUserAssignedToCustomer(userId: number, customerId: number): Promise<boolean> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        OR: [
          { engineerId: userId },
          { engineerSubId: userId },
          { salesId: userId },
        ],
      },
    });

    return !!customer;
  }
}
