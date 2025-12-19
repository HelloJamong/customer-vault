import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async findByCustomer(customerId: number, filters?: {
    inspectionTargetId?: number;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { customerId };

    if (filters?.inspectionTargetId) {
      where.inspectionTargetId = filters.inspectionTargetId;
    }

    // 날짜 범위 필터 (startDate, endDate가 우선순위)
    if (filters?.startDate && filters?.endDate) {
      where.inspectionDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    } else if (filters?.year && filters?.month) {
      // 기존 year/month 필터 (하위 호환성)
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

      // 점검 상태 자동 갱신: 모든 점검 항목이 완료되었는지 확인
      await this.updateInspectionStatus(data.customerId);

      // 시스템 로그 기록
      await this.logsService.createServiceLog({
        userId: data.uploadedBy,
        logType: '정보',
        action: '점검서 업로드',
        description: `${customer.name}의 ${inspectionTarget.productName} 점검서가 업로드되었습니다. (파일명: ${finalFilename})`,
      });

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

  async remove(id: number, userId?: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true } },
        inspectionTarget: { select: { productName: true } },
      },
    });

    if (document) {
      const customerId = document.customerId;
      const customerName = document.customer.name;
      const productName = document.inspectionTarget?.productName || '알 수 없음';
      const filename = document.filename;

      // 파일 삭제
      if (fs.existsSync(document.filepath)) {
        fs.unlinkSync(document.filepath);
      }

      // DB 레코드 삭제
      await this.prisma.document.delete({ where: { id } });

      // 점검 상태 자동 갱신: 삭제 후 완료 상태가 미완료로 변경될 수 있음
      await this.updateInspectionStatus(customerId);

      // 시스템 로그 기록
      await this.logsService.createServiceLog({
        userId,
        logType: '정보',
        action: '점검서 삭제',
        description: `${customerName}의 ${productName} 점검서가 삭제되었습니다. (파일명: ${filename})`,
      });
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

  /**
   * 점검 상태 자동 갱신
   * - 모든 점검 항목에 대한 이번 달 점검서가 업로드되면 '점검 완료'로 변경
   * - 하나라도 누락되면 '미완료' 상태 유지
   */
  private async updateInspectionStatus(customerId: number): Promise<void> {
    console.log('[DocumentsService.updateInspectionStatus] Checking inspection status for customer:', customerId);

    // 고객사 정보 조회 (점검 대상 포함)
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        inspectionTargets: { select: { id: true } },
      },
    });

    if (!customer) {
      console.log('[DocumentsService.updateInspectionStatus] Customer not found');
      return;
    }

    // 점검 대상이 아닌 경우 (계약 만료, 미계약, 협력사진행, 무상기간 등)
    if (!this.isInspectionNeededThisMonth(customer)) {
      console.log('[DocumentsService.updateInspectionStatus] Customer is not an inspection target this month');
      return;
    }

    // 점검 대상 항목이 없으면 미완료
    const targetIds = customer.inspectionTargets?.map((t) => t.id) || [];
    if (targetIds.length === 0) {
      console.log('[DocumentsService.updateInspectionStatus] No inspection targets found');
      return;
    }

    // 이번 달 업로드된 점검서 확인
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisMonthDocuments = await this.prisma.document.findMany({
      where: {
        customerId,
        inspectionTargetId: { in: targetIds },
        inspectionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { inspectionTargetId: true },
    });

    // 완료된 점검 대상 ID 수집
    const completedTargetIds = new Set(
      thisMonthDocuments
        .map((doc) => doc.inspectionTargetId)
        .filter((id): id is number => id !== null)
    );

    // 모든 점검 대상이 완료되었는지 확인
    const allCompleted = targetIds.every((id) => completedTargetIds.has(id));

    console.log('[DocumentsService.updateInspectionStatus] Inspection status:', {
      totalTargets: targetIds.length,
      completedTargets: completedTargetIds.size,
      allCompleted,
    });

    // 점검 상태를 inspectionStatus 필드에 저장 (현재는 로그만 출력)
    // Note: customers 테이블에 inspectionStatus 컬럼이 필요한 경우 마이그레이션 추가 필요
  }

  /**
   * 이번 달 점검 대상 여부 확인
   */
  private isInspectionNeededThisMonth(customer: any): boolean {
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
}
