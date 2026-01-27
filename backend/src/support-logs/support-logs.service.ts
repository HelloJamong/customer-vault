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

  async getPendingNotifications(userId: number, userRole: string) {
    const role = userRole.toLowerCase();

    // 진행 중인 지원 로그 조회 조건
    const whereCondition: any = {
      actionStatus: '진행 중',
    };

    // 일반 사용자(user)는 본인이 담당하는 고객사만 조회
    // super_admin, admin은 모든 고객사 조회
    if (role === 'user') {
      // 사내 담당자로 지정된 고객사 조회 (정 담당자, 부 담당자, 영업 담당자)
      const assignedCustomers = await this.prisma.customer.findMany({
        where: {
          OR: [
            { engineerId: userId },      // 정 담당자
            { engineerSubId: userId },   // 부 담당자
            { salesId: userId },         // 영업 담당자
          ],
        },
        select: { id: true },
      });

      const customerIds = assignedCustomers.map((c) => c.id);

      // 담당 고객사가 없으면 빈 배열 반환
      if (customerIds.length === 0) {
        return [];
      }

      // 담당 고객사만 필터링
      whereCondition.customerId = { in: customerIds };
    }

    // 진행 중인 지원 로그를 고객사별로 그룹화하여 카운트
    const pendingLogs = await this.prisma.supportLog.groupBy({
      by: ['customerId'],
      where: whereCondition,
      _count: {
        id: true,
      },
      _max: {
        supportDate: true,
      },
    });

    // 고객사 정보와 함께 반환
    const notifications = await Promise.all(
      pendingLogs.map(async (log) => {
        const customer = await this.prisma.customer.findUnique({
          where: { id: log.customerId },
          select: {
            id: true,
            name: true,
          },
        });

        return {
          customerId: log.customerId,
          customerName: customer?.name || '알 수 없음',
          count: log._count.id,
          latestSupportDate: log._max.supportDate,
        };
      }),
    );

    // 최신 지원 날짜 기준으로 내림차순 정렬 (최신 이슈가 상단에 표시)
    notifications.sort((a, b) => {
      const dateA = a.latestSupportDate ? new Date(a.latestSupportDate).getTime() : 0;
      const dateB = b.latestSupportDate ? new Date(b.latestSupportDate).getTime() : 0;
      return dateB - dateA;
    });

    return notifications;
  }

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
