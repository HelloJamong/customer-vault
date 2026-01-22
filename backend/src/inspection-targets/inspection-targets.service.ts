import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
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

    // 파일 확장자 추출
    const fileExt = path.extname(file.originalname);

    // 파일명 생성: 고객사_제품명_점검양식.확장자
    const newFileName = `${customerName}_${productName}_점검양식${fileExt}`;

    // 업로드 디렉토리 설정
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const templatesDir = path.join(uploadDir, 'templates');

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const filePath = path.join(templatesDir, newFileName);

    // 기존 템플릿이 있으면 삭제
    if (target.templatePath && fs.existsSync(target.templatePath)) {
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

    if (!fs.existsSync(target.templatePath)) {
      throw new NotFoundException('점검서 양식 파일을 찾을 수 없습니다.');
    }

    const file = fs.readFileSync(target.templatePath);
    const filename = path.basename(target.templatePath);
    const mimetype = mime.lookup(target.templatePath) || 'application/octet-stream';

    return { file, filename, mimetype };
  }
}
