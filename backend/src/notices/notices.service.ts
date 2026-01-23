import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Injectable()
export class NoticesService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async findAll() {
    return this.prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
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
    const notice = await this.prisma.notice.findUnique({
      where: { id },
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

    if (!notice) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }

    return notice;
  }

  async create(
    createDto: CreateNoticeDto,
    userId: number,
    ipAddress: string,
  ) {
    const notice = await this.prisma.notice.create({
      data: {
        title: createDto.title,
        content: createDto.content,
        createdBy: userId,
      },
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

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '공지사항 작성',
      description: `"${notice.title}" 공지사항 작성`,
      afterValue: JSON.stringify({ id: notice.id, title: notice.title }),
      ipAddress,
    });

    return notice;
  }

  async update(
    id: number,
    updateDto: UpdateNoticeDto,
    userId: number,
    ipAddress: string,
  ) {
    // 기존 공지사항 조회
    const existingNotice = await this.findOne(id);

    const updatedNotice = await this.prisma.notice.update({
      where: { id },
      data: updateDto,
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

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '공지사항 수정',
      description: `"${updatedNotice.title}" 공지사항 수정`,
      beforeValue: JSON.stringify({
        title: existingNotice.title,
        content: existingNotice.content,
      }),
      afterValue: JSON.stringify({
        title: updatedNotice.title,
        content: updatedNotice.content,
      }),
      ipAddress,
    });

    return updatedNotice;
  }

  async remove(id: number, userId: number, ipAddress: string) {
    const notice = await this.findOne(id);

    await this.prisma.notice.delete({
      where: { id },
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '경고',
      action: '공지사항 삭제',
      description: `"${notice.title}" 공지사항 삭제`,
      beforeValue: JSON.stringify({ id: notice.id, title: notice.title }),
      ipAddress,
    });

    return { message: '공지사항이 삭제되었습니다.' };
  }

  /**
   * 사용자가 읽지 않은 공지사항 조회
   * - 슈퍼 관리자는 제외
   * - "다시 보지 않기"를 선택한 공지사항은 제외
   * - 아직 보지 않은 공지사항만 반환
   */
  async getUnreadNotices(userId: number, userRole: string) {
    // 슈퍼 관리자는 공지사항 팝업을 보지 않음
    if (userRole.toLowerCase() === 'super_admin') {
      return [];
    }

    // 사용자가 이미 본 공지사항 ID 목록 조회
    const viewedNotices = await this.prisma.userNoticeView.findMany({
      where: { userId },
      select: { noticeId: true },
    });

    const viewedNoticeIds = viewedNotices.map((v) => v.noticeId);

    // 아직 보지 않은 공지사항 조회
    const unreadNotices = await this.prisma.notice.findMany({
      where: {
        id: {
          notIn: viewedNoticeIds.length > 0 ? viewedNoticeIds : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
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

    return unreadNotices;
  }

  /**
   * 공지사항을 읽음으로 표시
   * @param userId 사용자 ID
   * @param noticeId 공지사항 ID
   * @param dontShowAgain "다시 보지 않기" 체크 여부
   */
  async markAsRead(
    userId: number,
    noticeId: number,
    dontShowAgain: boolean,
  ) {
    // 공지사항 존재 여부 확인
    await this.findOne(noticeId);

    // UserNoticeView 레코드 생성 또는 업데이트
    await this.prisma.userNoticeView.upsert({
      where: {
        userId_noticeId: {
          userId,
          noticeId,
        },
      },
      create: {
        userId,
        noticeId,
        dontShowAgain,
      },
      update: {
        dontShowAgain,
        viewedAt: new Date(),
      },
    });

    return { message: '공지사항을 읽음으로 표시했습니다.' };
  }
}
