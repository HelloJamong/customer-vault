import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertCustomerEditable } from '../common/utils/customer-access.util';
import { FileSecurityService } from '../common/file-security/file-security.service';
import { getFileSecurityFailureReason } from '../common/file-security/file-security.service';
import { LogsService } from '../logs/logs.service';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

export class CreateInspectionTargetDto {
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @IsString()
  @IsNotEmpty()
  targetType: string;

  @IsString()
  @IsOptional()
  customName?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateInspectionTargetDto {
  @IsString()
  @IsOptional()
  targetType?: string;

  @IsString()
  @IsOptional()
  customName?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

@Injectable()
export class InspectionTargetsService {
  constructor(
    private prisma: PrismaService,
    private fileSecurityService: FileSecurityService,
    private logsService: LogsService,
  ) {}

  // 편집 권한: 관리자는 제한 없음, 일반 사용자는 담당 고객사의 점검 대상만.
  async assertCanManageCustomer(customerId: number, user: { id: number; role: string }) {
    await assertCustomerEditable(
      this.prisma,
      customerId,
      user,
      '담당하는 고객사의 점검 대상만 관리할 수 있습니다.',
    );
  }

  async assertCanManageTarget(targetId: number, user: { id: number; role: string }) {
    const target = await this.prisma.inspectionTarget.findUnique({
      where: { id: targetId },
      select: { customerId: true },
    });

    if (!target) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
    }

    await this.assertCanManageCustomer(target.customerId, user);
  }

  async findByCustomer(customerId: number) {
    return this.prisma.inspectionTarget.findMany({
      where: { customerId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(dto: CreateInspectionTargetDto, audit?: { userId?: number; ipAddress?: string }) {
    const target = await this.prisma.inspectionTarget.create({
      data: dto,
    });

    await this.logsService.createServiceLog({
      userId: audit?.userId,
      logType: '정보',
      action: '점검 대상 추가',
      description: `고객사 ${dto.customerId}에 점검 대상 "${target.targetType}"을 추가했습니다.`,
      afterValue: JSON.stringify(target),
      ipAddress: audit?.ipAddress,
    });

    return {
      id: target.id,
      message: '점검 대상이 추가되었습니다.',
    };
  }

  async update(id: number, dto: UpdateInspectionTargetDto, audit?: { userId?: number; ipAddress?: string }) {
    const existing = await this.prisma.inspectionTarget.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
    }

    const updated = await this.prisma.inspectionTarget.update({
      where: { id },
      data: dto,
    });

    await this.logsService.createServiceLog({
      userId: audit?.userId,
      logType: '정보',
      action: '점검 대상 수정',
      description: `고객사 ${existing.customerId}의 점검 대상 "${existing.targetType}"을 수정했습니다.`,
      beforeValue: JSON.stringify(existing),
      afterValue: JSON.stringify(updated),
      ipAddress: audit?.ipAddress,
    });

    return { message: '점검 대상이 수정되었습니다.' };
  }

  async remove(id: number, audit?: { userId?: number; ipAddress?: string }) {
    const existing = await this.prisma.inspectionTarget.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
    }

    await this.prisma.inspectionTarget.delete({ where: { id } });

    await this.logsService.createServiceLog({
      userId: audit?.userId,
      logType: '정보',
      action: '점검 대상 삭제',
      description: `고객사 ${existing.customerId}의 점검 대상 "${existing.targetType}"을 삭제했습니다.`,
      beforeValue: JSON.stringify(existing),
      ipAddress: audit?.ipAddress,
    });

    return { message: '점검 대상이 삭제되었습니다.' };
  }

  async checkTemplateExists(targetId: number): Promise<{ exists: boolean }> {
    const target = await this.prisma.inspectionTarget.findUnique({
      where: { id: targetId },
      select: { templatePath: true },
    });

    if (!target) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
    }

    return { exists: !!target.templatePath };
  }

  async uploadTemplate(
    targetId: number,
    file: Express.Multer.File,
    customerName: string,
    productName: string,
    audit?: { userId?: number; ipAddress?: string },
  ): Promise<{ message: string; path: string }> {
    const target = await this.prisma.inspectionTarget.findUnique({
      where: { id: targetId },
      include: { customer: true },
    });

    if (!target) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
    }

    try {
      await this.fileSecurityService.inspectBuffer(file.originalname, file.buffer);
    } catch (error) {
      const securityFailure = getFileSecurityFailureReason(error);
      if (securityFailure) {
        await this.logsService.createServiceLog({
          userId: audit?.userId,
          logType: '보안',
          action: '파일 보안 검사 차단',
          description: `점검서 양식 업로드가 파일 보안 검사에서 차단되었습니다. (점검 대상 ID: ${targetId}, 사유: ${securityFailure})`,
          ipAddress: audit?.ipAddress,
        }).catch(() => {});
      }
      throw error;
    }

    // 파일 확장자 검증 (허용 목록)
    const allowedExt = new Set(['.pdf', '.doc', '.docx', '.hwp', '.hwpx', '.ppt', '.pptx']);
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.has(fileExt)) {
      throw new BadRequestException('허용되지 않은 파일 형식입니다.');
    }

    // 업로드 디렉토리 설정 (절대 경로로 고정)
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const templatesDir = path.resolve(uploadDir, 'templates');

    // 디렉토리가 없으면 생성
    fs.mkdirSync(templatesDir, { recursive: true });

    // 파일명 생성: 고객사_제품명_점검양식.확장자
    // 사용자 입력에서 경로 구분자·상위 경로·제어문자를 제거해 디렉토리 밖으로 나가지 못하게 한다.
    const sanitize = (s: string) =>
      String(s ?? '')
        .replace(/[^\p{L}\p{N} _-]/gu, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 80) || 'template';
    const newFileName = `${sanitize(customerName)}_${sanitize(productName)}_점검양식${fileExt}`;
    const filePath = path.join(templatesDir, newFileName);

    // 방어적 확인: 최종 경로가 반드시 templates 디렉토리 안이어야 한다.
    if (!path.resolve(filePath).startsWith(templatesDir + path.sep)) {
      throw new BadRequestException('잘못된 파일 경로입니다.');
    }

    // 기존 템플릿이 templates 디렉토리 안에 있을 때만 삭제 (과거 오염된 경로 방어)
    if (
      target.templatePath &&
      path.resolve(target.templatePath).startsWith(templatesDir + path.sep) &&
      fs.existsSync(target.templatePath)
    ) {
      fs.unlinkSync(target.templatePath);
    }

    // 파일 저장
    fs.writeFileSync(filePath, file.buffer);

    // DB 업데이트
    await this.prisma.inspectionTarget.update({
      where: { id: targetId },
      data: { templatePath: filePath },
    });

    return {
      message: '점검서 양식이 업로드되었습니다.',
      path: filePath,
    };
  }

  async downloadTemplate(
    targetId: number,
  ): Promise<{ file: Buffer; filename: string; mimetype: string }> {
    const target = await this.prisma.inspectionTarget.findUnique({
      where: { id: targetId },
      include: { customer: true },
    });

    if (!target) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
    }

    if (!target.templatePath) {
      throw new NotFoundException('업로드된 점검서 양식이 없습니다.');
    }

    // templates 디렉토리 밖의 경로는 거부 (과거 오염된 경로 방어)
    const templatesDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'templates');
    if (!path.resolve(target.templatePath).startsWith(templatesDir + path.sep)) {
      throw new NotFoundException('점검서 양식 파일을 찾을 수 없습니다.');
    }

    if (!fs.existsSync(target.templatePath)) {
      throw new NotFoundException('점검서 양식 파일을 찾을 수 없습니다.');
    }

    const file = fs.readFileSync(target.templatePath);
    const filename = path.basename(target.templatePath);
    const mimetype = mime.lookup(target.templatePath) || 'application/octet-stream';

    return { file, filename, mimetype };
  }
}
