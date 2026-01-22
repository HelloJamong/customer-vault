import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {
  CreateInspectionReportDto,
  EquipmentInfoDto,
  HardwareSpecsDto,
} from './dto/create-inspection-report.dto';
import { UpdateInspectionReportDto } from './dto/update-inspection-report.dto';

const prisma = new PrismaClient();

@Injectable()
export class InspectionReportsService {
  async create(
    createDto: CreateInspectionReportDto,
    userId: number,
  ): Promise<any> {
    // 고객사 존재 여부 확인
    const customer = await prisma.customer.findUnique({
      where: { id: createDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createDto.customerId} not found`,
      );
    }

    // JSON 문자열로 변환
    const equipmentInfoJson = JSON.stringify(createDto.equipmentInfo);
    const hardwareSpecsJson = createDto.hardwareSpecs
      ? JSON.stringify(createDto.hardwareSpecs)
      : null;

    const inspectionReport = await prisma.inspectionReport.create({
      data: {
        customerId: createDto.customerId,
        templateType: createDto.templateType,
        inspectionYear: createDto.inspectionYear,
        inspectionMonth: createDto.inspectionMonth,
        inspectionDate: new Date(createDto.inspectionDate),
        inspectionLocation: createDto.inspectionLocation,
        inspectionCycle: createDto.inspectionCycle,
        customerName: createDto.customerName,
        customerDepartment: createDto.customerDepartment,
        customerContact: createDto.customerContact,
        customerPhone: createDto.customerPhone,
        inspectorName: createDto.inspectorName,
        inspectorPhone: createDto.inspectorPhone,
        equipmentInfo: equipmentInfoJson,
        hardwareSpecs: hardwareSpecsJson,
        hrIntegrationEnabled: createDto.hrIntegrationEnabled || false,
        redundancyEnabled: createDto.redundancyEnabled || false,
        customerRequest: createDto.customerRequest,
        createdBy: userId,
      },
      include: {
        customer: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // JSON 문자열을 객체로 변환하여 반환
    return {
      ...inspectionReport,
      equipmentInfo: JSON.parse(inspectionReport.equipmentInfo),
      hardwareSpecs: inspectionReport.hardwareSpecs
        ? JSON.parse(inspectionReport.hardwareSpecs)
        : null,
    };
  }

  async findAll(customerId?: number): Promise<any[]> {
    const where = customerId ? { customerId } : {};

    const reports = await prisma.inspectionReport.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reports.map((report) => ({
      ...report,
      equipmentInfo: JSON.parse(report.equipmentInfo),
      hardwareSpecs: report.hardwareSpecs
        ? JSON.parse(report.hardwareSpecs)
        : null,
    }));
  }

  async findOne(id: number): Promise<any> {
    const report = await prisma.inspectionReport.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Inspection report with ID ${id} not found`);
    }

    return {
      ...report,
      equipmentInfo: JSON.parse(report.equipmentInfo),
      hardwareSpecs: report.hardwareSpecs
        ? JSON.parse(report.hardwareSpecs)
        : null,
    };
  }

  async update(
    id: number,
    updateDto: UpdateInspectionReportDto,
  ): Promise<any> {
    const existing = await prisma.inspectionReport.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Inspection report with ID ${id} not found`);
    }

    const equipmentInfoJson = updateDto.equipmentInfo
      ? JSON.stringify(updateDto.equipmentInfo)
      : undefined;
    const hardwareSpecsJson = updateDto.hardwareSpecs
      ? JSON.stringify(updateDto.hardwareSpecs)
      : undefined;

    const updated = await prisma.inspectionReport.update({
      where: { id },
      data: {
        ...(updateDto.customerId && { customerId: updateDto.customerId }),
        ...(updateDto.templateType && { templateType: updateDto.templateType }),
        ...(updateDto.inspectionYear && {
          inspectionYear: updateDto.inspectionYear,
        }),
        ...(updateDto.inspectionMonth && {
          inspectionMonth: updateDto.inspectionMonth,
        }),
        ...(updateDto.inspectionDate && {
          inspectionDate: new Date(updateDto.inspectionDate),
        }),
        ...(updateDto.inspectionLocation !== undefined && {
          inspectionLocation: updateDto.inspectionLocation,
        }),
        ...(updateDto.inspectionCycle !== undefined && {
          inspectionCycle: updateDto.inspectionCycle,
        }),
        ...(updateDto.customerName && { customerName: updateDto.customerName }),
        ...(updateDto.customerDepartment !== undefined && {
          customerDepartment: updateDto.customerDepartment,
        }),
        ...(updateDto.customerContact !== undefined && {
          customerContact: updateDto.customerContact,
        }),
        ...(updateDto.customerPhone !== undefined && {
          customerPhone: updateDto.customerPhone,
        }),
        ...(updateDto.inspectorName && {
          inspectorName: updateDto.inspectorName,
        }),
        ...(updateDto.inspectorPhone !== undefined && {
          inspectorPhone: updateDto.inspectorPhone,
        }),
        ...(equipmentInfoJson && { equipmentInfo: equipmentInfoJson }),
        ...(hardwareSpecsJson && { hardwareSpecs: hardwareSpecsJson }),
        ...(updateDto.hrIntegrationEnabled !== undefined && {
          hrIntegrationEnabled: updateDto.hrIntegrationEnabled,
        }),
        ...(updateDto.redundancyEnabled !== undefined && {
          redundancyEnabled: updateDto.redundancyEnabled,
        }),
        ...(updateDto.customerRequest !== undefined && {
          customerRequest: updateDto.customerRequest,
        }),
      },
      include: {
        customer: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return {
      ...updated,
      equipmentInfo: JSON.parse(updated.equipmentInfo),
      hardwareSpecs: updated.hardwareSpecs
        ? JSON.parse(updated.hardwareSpecs)
        : null,
    };
  }

  async remove(id: number): Promise<void> {
    const existing = await prisma.inspectionReport.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Inspection report with ID ${id} not found`);
    }

    await prisma.inspectionReport.delete({
      where: { id },
    });
  }

  async generateWordDocument(id: number): Promise<Buffer> {
    const report = await this.findOne(id);

    // 템플릿 파일 경로
    const templatePath = path.join(
      __dirname,
      'templates',
      `${report.templateType}.docx`,
    );

    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(
        `Template file for ${report.templateType} not found`,
      );
    }

    try {
      // 템플릿 파일 읽기
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 템플릿 변수 데이터 준비
      const templateData = this.prepareTemplateData(report);

      // 데이터 렌더링
      doc.render(templateData);

      // Word 문서 생성
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return buffer;
    } catch (error) {
      console.error('Word generation error:', error);
      throw new InternalServerErrorException(
        'Failed to generate Word document',
      );
    }
  }

  private prepareTemplateData(report: any): any {
    const equipmentList = report.equipmentInfo as EquipmentInfoDto[];
    const hardwareSpecs = report.hardwareSpecs as HardwareSpecsDto | null;

    return {
      // 기본 정보
      inspectionYear: report.inspectionYear,
      inspectionMonth: report.inspectionMonth,
      inspectionDate: this.formatDate(report.inspectionDate),
      inspectionLocation: report.inspectionLocation || '',

      // 고객사 정보
      customerName: report.customerName,
      customerDepartment: report.customerDepartment || '',
      customerContact: report.customerContact || '',
      customerPhone: report.customerPhone || '',
      inspectionCycle: report.inspectionCycle || '',

      // 점검자 정보
      inspectorName: report.inspectorName,
      inspectorPhone: report.inspectorPhone || '',

      // 장비 정보 (첫 번째 장비)
      equipment: equipmentList.length > 0 ? equipmentList[0] : {},
      equipmentList: equipmentList,

      // 하드웨어 스펙
      cpuModel: hardwareSpecs?.cpuModel || 'Intel® Xeon® Silver 4208 @ 2.10GHz',
      cpuCores: hardwareSpecs?.cpuCores || 8,
      memoryCapacity: hardwareSpecs?.memoryCapacity || '32GB',

      // 계정연동/이중화
      hrIntegrationEnabled: report.hrIntegrationEnabled,
      hrIntegrationText: report.hrIntegrationEnabled ? '사용함' : '사용안함',
      redundancyEnabled: report.redundancyEnabled,
      redundancyText: report.redundancyEnabled ? '이중화 구성' : '단일환경 구성',

      // 고객사 요청사항
      customerRequest: report.customerRequest || '',
    };
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
