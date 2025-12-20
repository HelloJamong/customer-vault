import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateSupportLogDto } from './dto/create-support-log.dto';
import { UpdateSupportLogDto } from './dto/update-support-log.dto';

@Injectable()
export class SupportLogsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async findAllByCustomer(customerId: number) {
    return this.prisma.supportLog.findMany({
      where: { customerId },
      orderBy: { supportDate: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const supportLog = await this.prisma.supportLog.findUnique({
      where: { id },
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
    });

    if (!supportLog) {
      throw new NotFoundException('지원 로그를 찾을 수 없습니다.');
    }

    return supportLog;
  }

  async create(createDto: CreateSupportLogDto, userId: number, ipAddress: string) {
    const supportLog = await this.prisma.supportLog.create({
      data: {
        customerId: createDto.customerId,
        supportDate: new Date(createDto.supportDate),
        inquirer: createDto.inquirer,
        target: createDto.target,
        category: createDto.category,
        userInfo: createDto.userInfo,
        actionStatus: createDto.actionStatus,
        inquiryContent: createDto.inquiryContent,
        actionContent: createDto.actionContent,
        remarks: createDto.remarks,
        createdBy: userId,
      },
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
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '지원 로그 생성',
      description: `${supportLog.customer.name} 고객사에 지원 로그 생성`,
      afterValue: JSON.stringify(supportLog),
      ipAddress,
    });

    return supportLog;
  }

  async update(id: number, updateDto: UpdateSupportLogDto, userId: number, ipAddress: string) {
    const existingSupportLog = await this.findOne(id);

    const updatedSupportLog = await this.prisma.supportLog.update({
      where: { id },
      data: {
        ...(updateDto.customerId && { customerId: updateDto.customerId }),
        ...(updateDto.supportDate && { supportDate: new Date(updateDto.supportDate) }),
        ...(updateDto.inquirer !== undefined && { inquirer: updateDto.inquirer }),
        ...(updateDto.target !== undefined && { target: updateDto.target }),
        ...(updateDto.category !== undefined && { category: updateDto.category }),
        ...(updateDto.userInfo !== undefined && { userInfo: updateDto.userInfo }),
        ...(updateDto.actionStatus !== undefined && { actionStatus: updateDto.actionStatus }),
        ...(updateDto.inquiryContent !== undefined && { inquiryContent: updateDto.inquiryContent }),
        ...(updateDto.actionContent !== undefined && { actionContent: updateDto.actionContent }),
        ...(updateDto.remarks !== undefined && { remarks: updateDto.remarks }),
      },
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
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '지원 로그 수정',
      description: `${updatedSupportLog.customer.name} 고객사 지원 로그 수정`,
      beforeValue: JSON.stringify(existingSupportLog),
      afterValue: JSON.stringify(updatedSupportLog),
      ipAddress,
    });

    return updatedSupportLog;
  }

  async remove(id: number, userId: number, ipAddress: string) {
    const supportLog = await this.findOne(id);

    await this.prisma.supportLog.delete({
      where: { id },
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정상',
      action: '지원 로그 삭제',
      description: `${supportLog.customer.name} 고객사 지원 로그 삭제`,
      beforeValue: JSON.stringify(supportLog),
      ipAddress,
    });

    return { message: '지원 로그가 삭제되었습니다.' };
  }
}
