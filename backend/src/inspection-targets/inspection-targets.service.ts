import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertCustomerEditable } from '../common/utils/customer-access.util';
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
  constructor(private prisma: PrismaService) {}

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
  ): Promise<{ message: string; path: string }> {
    const target = await this.prisma.inspectionTarget.findUnique({
      where: { id: targetId },
      include: { customer: true },
    });

    if (!target) {
      throw new NotFoundException('점검 항목을 찾을 수 없습니다.');
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
