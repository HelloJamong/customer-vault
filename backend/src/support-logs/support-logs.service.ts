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

    // 기본 조건 (권한에 따른 고객사 필터링)
    let customerIds: number[] | undefined;

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

      customerIds = assignedCustomers.map((c) => c.id);

      // 담당 고객사가 없으면 빈 배열 반환
      if (customerIds.length === 0) {
        return [];
      }
    }

    // 3가지 상태별로 조회: 진행 중, 진행 불가, 보류
    const statuses = ['진행 중', '진행 불가', '보류'];

    // 각 상태별로 그룹화 결과를 담을 Map (customerId -> 상태별 카운트)
    const customerDataMap = new Map<number, {
      inProgressCount: number;
      impossibleCount: number;
      onHoldCount: number;
      latestInProgressDate: Date | null;
    }>();

    // 각 상태별로 데이터 조회
    for (const status of statuses) {
      const whereCondition: any = {
        actionStatus: status,
      };

      if (customerIds) {
        whereCondition.customerId = { in: customerIds };
      }

      const logs = await this.prisma.supportLog.groupBy({
        by: ['customerId'],
        where: whereCondition,
        _count: {
          id: true,
        },
        _max: {
          supportDate: true,
        },
      });

      // Map에 데이터 누적
      logs.forEach((log) => {
        if (!customerDataMap.has(log.customerId)) {
          customerDataMap.set(log.customerId, {
            inProgressCount: 0,
            impossibleCount: 0,
            onHoldCount: 0,
            latestInProgressDate: null,
          });
        }

        const data = customerDataMap.get(log.customerId)!;

        if (status === '진행 중') {
          data.inProgressCount = log._count.id;
          data.latestInProgressDate = log._max.supportDate;
        } else if (status === '진행 불가') {
          data.impossibleCount = log._count.id;
        } else if (status === '보류') {
          data.onHoldCount = log._count.id;
        }
      });
    }

    // 고객사 정보와 함께 반환
    const notifications = await Promise.all(
      Array.from(customerDataMap.entries()).map(async ([customerId, data]) => {
        const customer = await this.prisma.customer.findUnique({
          where: { id: customerId },
          select: {
            id: true,
            name: true,
          },
        });

        return {
          customerId,
          customerName: customer?.name || '알 수 없음',
          inProgressCount: data.inProgressCount,
          impossibleCount: data.impossibleCount,
          onHoldCount: data.onHoldCount,
          latestInProgressDate: data.latestInProgressDate,
        };
      }),
    );

    // '진행 중' 항목의 최신 지원 날짜 기준으로 내림차순 정렬 (최신 이슈가 상단에 표시)
    notifications.sort((a, b) => {
      const dateA = a.latestInProgressDate ? new Date(a.latestInProgressDate).getTime() : 0;
      const dateB = b.latestInProgressDate ? new Date(b.latestInProgressDate).getTime() : 0;
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
